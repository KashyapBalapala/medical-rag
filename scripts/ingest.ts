import { ingestDocuments } from "../src/lib/ingest";

async function main(): Promise<void> {
  const stats = await ingestDocuments({ verbose: false });

  console.log(`Found ${stats.pdfCount} PDFs\n`);

  for (const { filename, chunkCount } of stats.fileResults) {
    console.log(`Processing ${filename}`);
    console.log(`Created ${chunkCount} chunks\n`);
  }

  console.log("Generating embeddings...\n");
  console.log(`Stored ${stats.chunkCount} vectors in ChromaDB\n`);
  console.log("Done");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
