import { searchDocuments, type SearchResult } from "../src/lib/retrieve";

// const QUESTION = "What are symptoms of diabetes?";
const QUESTION = "What is the treatment for diabetes?";

function formatContent(content: string): string {
  const withoutPageMarkers = content.replace(/--\s*\d+\s+of\s+\d+\s*--/gi, "\n");

  const bulletLines = withoutPageMarkers
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[•\-–]/.test(line))
    .map((line) => line.replace(/^[•–]\s*/, "- "));

  if (bulletLines.length > 0) {
    return bulletLines.slice(0, 8).join("\n");
  }

  const sentences = withoutPageMarkers
    .replace(/\s+/g, " ")
    .trim()
    .split(/(?<=[.!?])\s+/)
    .filter((sentence) => sentence.length > 15);

  return sentences.slice(0, 4).join("\n\n");
}

function printResult(index: number, result: SearchResult): void {
  console.log(`Result ${index}`);
  console.log(`Score: ${result.similarityScore.toFixed(2)}`);
  console.log();
  console.log(formatContent(result.content));
  console.log();
  console.log("------------------");
  console.log();
}

async function main(): Promise<void> {
  console.log(`Question: ${QUESTION}\n`);

  const results = await searchDocuments(QUESTION);

  if (results.length === 0) {
    console.log("No results found. Run ingestion first: npm run ingest");
    return;
  }

  results.forEach((result, index) => {
    printResult(index + 1, result);
  });
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
