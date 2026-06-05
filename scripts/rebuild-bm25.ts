import { rebuildIndexFromChroma } from "../src/lib/search/bm25";

async function main(): Promise<void> {
  console.log("Rebuilding BM25 index from ChromaDB...");
  const count = await rebuildIndexFromChroma();
  console.log(`BM25 index rebuilt with ${count} chunk(s).`);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
