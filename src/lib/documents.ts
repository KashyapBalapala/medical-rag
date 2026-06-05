import fs from "node:fs/promises";
import path from "node:path";
import { getCollection } from "./chroma";
import { UPLOADS_DIR } from "./upload";

const DOCS_DIR = path.join(process.cwd(), "docs");

export type DocumentSource = "library" | "upload";

export type LibraryDocument = {
  filename: string;
  path: string;
  source: DocumentSource;
  chunkCount: number;
  size?: number;
};

export type DocumentLibraryStats = {
  documents: LibraryDocument[];
  documentCount: number;
  totalChunks: number;
};

function displayFilename(metadataPath: string): string {
  return path.basename(metadataPath);
}

async function listRootPdfs(): Promise<Array<{ path: string; size: number }>> {
  try {
    const entries = await fs.readdir(DOCS_DIR);
    const pdfs: Array<{ path: string; size: number }> = [];

    for (const name of entries) {
      if (!name.toLowerCase().endsWith(".pdf")) continue;

      const stat = await fs.stat(path.join(DOCS_DIR, name));
      if (!stat.isFile()) continue;

      pdfs.push({ path: name, size: stat.size });
    }

    return pdfs.sort((a, b) => a.path.localeCompare(b.path));
  } catch {
    return [];
  }
}

async function listUploadPdfs(): Promise<Array<{ path: string; size: number }>> {
  try {
    await fs.mkdir(UPLOADS_DIR, { recursive: true });
    const entries = await fs.readdir(UPLOADS_DIR);
    const pdfs: Array<{ path: string; size: number }> = [];

    for (const name of entries) {
      if (!name.toLowerCase().endsWith(".pdf")) continue;

      const stat = await fs.stat(path.join(UPLOADS_DIR, name));
      if (!stat.isFile()) continue;

      pdfs.push({ path: `uploads/${name}`, size: stat.size });
    }

    return pdfs.sort((a, b) => a.path.localeCompare(b.path));
  } catch {
    return [];
  }
}

async function getChunkCountsByPath(): Promise<Map<string, number>> {
  const collection = await getCollection();
  const total = await collection.count();

  if (total === 0) {
    return new Map();
  }

  const result = await collection.get({ include: ["metadatas"] });
  const counts = new Map<string, number>();

  for (const meta of result.metadatas ?? []) {
    if (!meta || typeof meta !== "object") continue;

    const filename =
      typeof (meta as Record<string, unknown>).filename === "string"
        ? ((meta as Record<string, unknown>).filename as string)
        : "unknown";

    counts.set(filename, (counts.get(filename) ?? 0) + 1);
  }

  return counts;
}

export async function getDocumentLibrary(): Promise<DocumentLibraryStats> {
  const [rootPdfs, uploadPdfs, chunkCounts] = await Promise.all([
    listRootPdfs(),
    listUploadPdfs(),
    getChunkCountsByPath(),
  ]);

  const documents: LibraryDocument[] = [
    ...rootPdfs.map(({ path: docPath, size }) => ({
      filename: displayFilename(docPath),
      path: docPath,
      source: "library" as const,
      chunkCount: chunkCounts.get(docPath) ?? 0,
      size,
    })),
    ...uploadPdfs.map(({ path: docPath, size }) => ({
      filename: displayFilename(docPath),
      path: docPath,
      source: "upload" as const,
      chunkCount: chunkCounts.get(docPath) ?? 0,
      size,
    })),
  ];

  const totalChunks = [...chunkCounts.values()].reduce(
    (sum, count) => sum + count,
    0,
  );

  return {
    documents,
    documentCount: documents.length,
    totalChunks,
  };
}
