import fs from "node:fs/promises";
import path from "node:path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { embedDocuments } from "./embeddings";
import { getCollection } from "./chroma";
import { extractPdfText } from "./pdf-extract";
import { buildChunkId } from "./chunk-id";
import { indexChunks, saveIndex, toBm25Record } from "./search/bm25";

const DOCS_DIR = path.join(process.cwd(), "docs");
const CHUNK_SIZE = 1000;
const CHUNK_OVERLAP = 200;
const EMBED_BATCH_SIZE = 16;
const UPSERT_BATCH_SIZE = 100;

export type ChunkMetadata = {
  filename: string;
  chunkIndex: number;
};

export type DocumentChunk = {
  id: string;
  text: string;
  metadata: ChunkMetadata;
};

export type FileIngestionResult = {
  filename: string;
  chunkCount: number;
};

export type IngestionStats = {
  pdfCount: number;
  chunkCount: number;
  filenames: string[];
  fileResults: FileIngestionResult[];
};

export type IngestDocumentsOptions = {
  verbose?: boolean;
};

const splitter = new RecursiveCharacterTextSplitter({
  chunkSize: CHUNK_SIZE,
  chunkOverlap: CHUNK_OVERLAP,
});

function log(verbose: boolean, step: string, detail?: string): void {
  if (!verbose) return;
  const suffix = detail ? ` — ${detail}` : "";
  console.log(`[ingest] ${step}${suffix}`);
}

async function ensureDocsDirectory(): Promise<void> {
  try {
    const stat = await fs.stat(DOCS_DIR);
    if (!stat.isDirectory()) {
      throw new Error(`Expected a directory at ${DOCS_DIR}`);
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(`Docs directory not found: ${DOCS_DIR}`);
    }
    throw error;
  }
}

async function listPdfFiles(): Promise<string[]> {
  const entries = await fs.readdir(DOCS_DIR);
  const pdfs = entries
    .filter((name) => name.toLowerCase().endsWith(".pdf"))
    .sort();

  if (pdfs.length === 0) {
    throw new Error(`No PDF files found in ${DOCS_DIR}`);
  }

  // Skip symlink duplicates (e.g. diabetes.pdf → same file as 1.-diabetes-24-04-19 (1).pdf)
  const seenRealPaths = new Set<string>();
  const unique: string[] = [];

  for (const filename of pdfs) {
    const realPath = await fs.realpath(path.join(DOCS_DIR, filename));
    if (seenRealPaths.has(realPath)) continue;
    seenRealPaths.add(realPath);
    unique.push(filename);
  }

  return unique;
}

async function chunkPdfFromPath(
  filePath: string,
  filename: string,
  verbose: boolean,
): Promise<DocumentChunk[]> {
  log(verbose, "Reading PDF", filename);
  const text = await extractPdfText(filePath, filename);
  log(verbose, "Extracted text", `${filename} (${text.length} characters)`);

  log(verbose, "Splitting text", filename);
  const chunks = await splitter.splitText(text);
  log(verbose, "Created chunks", `${filename}: ${chunks.length} chunks`);

  return chunks.map((text, chunkIndex) => ({
    id: buildChunkId(filename, chunkIndex),
    text,
    metadata: { filename, chunkIndex },
  }));
}

async function chunkPdf(
  filename: string,
  verbose: boolean,
): Promise<DocumentChunk[]> {
  const filePath = path.join(DOCS_DIR, filename);
  return chunkPdfFromPath(filePath, filename, verbose);
}

async function embedChunksInBatches(
  chunks: DocumentChunk[],
  verbose: boolean,
): Promise<number[][]> {
  const embeddings: number[][] = [];
  const totalBatches = Math.ceil(chunks.length / EMBED_BATCH_SIZE);

  for (let i = 0; i < chunks.length; i += EMBED_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBED_BATCH_SIZE);
    const batchNumber = Math.floor(i / EMBED_BATCH_SIZE) + 1;

    log(
      verbose,
      "Generating embeddings",
      `batch ${batchNumber}/${totalBatches} (${batch.length} chunks)`,
    );

    const batchEmbeddings = await embedDocuments(batch.map((chunk) => chunk.text));
    embeddings.push(...batchEmbeddings);
  }

  return embeddings;
}

async function upsertChunks(
  chunks: DocumentChunk[],
  embeddings: number[][],
  verbose: boolean,
): Promise<void> {
  const collection = await getCollection();
  const totalBatches = Math.ceil(chunks.length / UPSERT_BATCH_SIZE);

  for (let i = 0; i < chunks.length; i += UPSERT_BATCH_SIZE) {
    const batch = chunks.slice(i, i + UPSERT_BATCH_SIZE);
    const batchEmbeddings = embeddings.slice(i, i + UPSERT_BATCH_SIZE);
    const batchNumber = Math.floor(i / UPSERT_BATCH_SIZE) + 1;

    log(
      verbose,
      "Storing vectors in ChromaDB",
      `batch ${batchNumber}/${totalBatches} (${batch.length} records)`,
    );

    await collection.upsert({
      ids: batch.map((chunk) => chunk.id),
      documents: batch.map((chunk) => chunk.text),
      metadatas: batch.map((chunk) => chunk.metadata),
      embeddings: batchEmbeddings,
    });

    indexChunks(batch.map((chunk) => toBm25Record(chunk)));
  }

  await saveIndex();
  log(verbose, "BM25 index updated");
}

export async function ingestDocuments(
  options: IngestDocumentsOptions = {},
): Promise<IngestionStats> {
  const verbose = options.verbose ?? false;

  log(verbose, "Starting medical document ingestion");

  await ensureDocsDirectory();
  log(verbose, "Verified docs directory", DOCS_DIR);

  const pdfFiles = await listPdfFiles();
  log(verbose, "Found PDF files", pdfFiles.join(", "));

  const fileResults: FileIngestionResult[] = [];
  const allChunks: DocumentChunk[] = [];

  for (const filename of pdfFiles) {
    try {
      const chunks = await chunkPdf(filename, verbose);
      fileResults.push({ filename, chunkCount: chunks.length });
      allChunks.push(...chunks);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new Error(`Ingestion failed for ${filename}: ${message}`);
    }
  }

  if (allChunks.length === 0) {
    throw new Error("No chunks were produced from the PDF documents");
  }

  log(verbose, "Prepared chunks for embedding", `${allChunks.length} total chunks`);

  let embeddings: number[][];
  try {
    embeddings = await embedChunksInBatches(allChunks, verbose);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Embedding generation failed: ${message}`);
  }

  log(verbose, "Embeddings complete", `${embeddings.length} vectors`);

  try {
    await upsertChunks(allChunks, embeddings, verbose);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`ChromaDB upsert failed: ${message}`);
  }

  log(
    verbose,
    "Ingestion complete",
    `${pdfFiles.length} PDFs, ${allChunks.length} chunks stored`,
  );

  return {
    pdfCount: pdfFiles.length,
    chunkCount: allChunks.length,
    filenames: pdfFiles,
    fileResults,
  };
}

export async function ingestSinglePdf(
  filePath: string,
  metadataFilename: string,
  options: IngestDocumentsOptions = {},
): Promise<FileIngestionResult> {
  const verbose = options.verbose ?? false;

  log(verbose, "Ingesting single PDF", metadataFilename);

  let chunks: DocumentChunk[];
  try {
    chunks = await chunkPdfFromPath(filePath, metadataFilename, verbose);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Ingestion failed for ${metadataFilename}: ${message}`);
  }

  if (chunks.length === 0) {
    throw new Error(`No chunks were produced from ${metadataFilename}`);
  }

  let embeddings: number[][];
  try {
    embeddings = await embedChunksInBatches(chunks, verbose);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Embedding generation failed: ${message}`);
  }

  try {
    await upsertChunks(chunks, embeddings, verbose);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`ChromaDB upsert failed: ${message}`);
  }

  log(verbose, "Single PDF ingestion complete", `${chunks.length} chunks stored`);

  return {
    filename: metadataFilename,
    chunkCount: chunks.length,
  };
}
