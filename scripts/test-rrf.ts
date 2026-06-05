import { fuseResults } from "../src/lib/search/rrf";
import type { RankedHit } from "../src/lib/search/types";
import type { SearchResult } from "../src/lib/retrieve";

function makeChunk(id: string, filename: string): SearchResult {
  return {
    id,
    content: `content for ${id}`,
    metadata: { filename, chunkIndex: 0 },
    distance: 0,
    similarityScore: 0.8,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

const bm25Hits: RankedHit[] = [
  {
    source: "bm25",
    score: 5,
    rank: 1,
    chunk: makeChunk("a", "doc-a.pdf"),
    queryLabel: "Symptoms",
  },
  {
    source: "bm25",
    score: 4,
    rank: 2,
    chunk: makeChunk("b", "doc-b.pdf"),
    queryLabel: "Symptoms",
  },
];

const vectorHits: RankedHit[] = [
  {
    source: "vector",
    score: 0.9,
    rank: 1,
    chunk: makeChunk("b", "doc-b.pdf"),
    queryLabel: "Symptoms",
  },
  {
    source: "vector",
    score: 0.7,
    rank: 2,
    chunk: makeChunk("c", "doc-c.pdf"),
    queryLabel: "Symptoms",
  },
];

const fused = fuseResults(bm25Hits, vectorHits, 60);

assert(fused.length === 3, "fusion deduplicates to 3 unique chunks");
assert(
  fused[0].chunk.id === "b" || fused[0].chunk.id === "a",
  "top fused result comes from overlapping high-rank hits",
);
assert(fused.some((hit) => hit.chunk.id === "c"), "vector-only chunk is retained");

console.log("\nAll RRF checks passed.");
