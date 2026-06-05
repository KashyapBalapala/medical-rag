import fs from "node:fs/promises";
import path from "node:path";
import {
  COLLECTION_NAME,
  ensureChromaConnection,
  getChromaClient,
} from "../src/lib/chroma";
import { ingestDocuments } from "../src/lib/ingest";
import { clearBm25Index } from "../src/lib/search/bm25";
import { UPLOADS_DIR } from "../src/lib/upload";

async function clearUploads(): Promise<number> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
  const entries = await fs.readdir(UPLOADS_DIR);
  let removed = 0;

  for (const name of entries) {
    if (name === ".gitkeep") continue;
    if (!name.toLowerCase().endsWith(".pdf")) continue;

    await fs.unlink(path.join(UPLOADS_DIR, name));
    console.log(`[reset] removed upload: ${name}`);
    removed += 1;
  }

  return removed;
}

async function clearChromaCollection(): Promise<void> {
  await ensureChromaConnection();
  const chroma = getChromaClient();

  try {
    await chroma.deleteCollection({ name: COLLECTION_NAME });
    console.log(`[reset] deleted Chroma collection: ${COLLECTION_NAME}`);
  } catch {
    console.log(`[reset] collection "${COLLECTION_NAME}" was already empty or missing`);
  }
}

async function main(): Promise<void> {
  console.log("=== Medical RAG reset ===\n");

  const removedUploads = await clearUploads();
  console.log(`[reset] removed ${removedUploads} uploaded PDF(s)\n`);

  await clearChromaCollection();
  await clearBm25Index();
  console.log("[reset] cleared BM25 index\n");

  console.log("=== Re-ingesting library PDFs from docs/ ===\n");
  const stats = await ingestDocuments({ verbose: true });

  console.log(`\nFound ${stats.pdfCount} PDF(s)`);
  for (const { filename, chunkCount } of stats.fileResults) {
    console.log(`  ${filename}: ${chunkCount} chunks`);
  }
  console.log(`\nStored ${stats.chunkCount} vectors in ChromaDB`);
  console.log("Done");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
