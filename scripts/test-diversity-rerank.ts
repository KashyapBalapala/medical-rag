import { applyDiversitySelection } from "../src/lib/search/diversity";
import { rerankResults } from "../src/lib/search/rerank";
import { fuseResults } from "../src/lib/search/rrf";
import { RETRIEVAL_CONFIG } from "../src/lib/search/retrieval.config";
import type { RankedHit } from "../src/lib/search/types";
import type { SearchResult } from "../src/lib/retrieve";

function makeChunk(
  id: string,
  filename: string,
  chunkIndex: number,
  score = 0.8,
): SearchResult {
  return {
    id,
    content: `content for ${id}`,
    metadata: { filename, chunkIndex },
    distance: 0,
    similarityScore: score,
  };
}

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

const hits: RankedHit[] = Array.from({ length: 12 }, (_, index) => ({
  source: index % 2 === 0 ? "bm25" : "vector",
  score: 10 - index,
  rank: index + 1,
  chunk: makeChunk(
    `chunk-${index}`,
    index < 6 ? "doc-a.pdf" : "doc-b.pdf",
    index,
  ),
  queryLabel: "Symptoms",
}));

const fused = fuseResults(
  hits.filter((hit) => hit.source === "bm25"),
  hits.filter((hit) => hit.source === "vector"),
);

const diversified = applyDiversitySelection(fused, {
  targetCount: RETRIEVAL_CONFIG.diversity.outputTopK,
});

assert(
  diversified.length <= RETRIEVAL_CONFIG.diversity.outputTopK,
  `diversity keeps <= ${RETRIEVAL_CONFIG.diversity.outputTopK} chunks`,
);

assert(
  diversified.filter((hit) => hit.chunk.metadata.filename === "doc-a.pdf")
    .length <= RETRIEVAL_CONFIG.diversity.maxChunksPerDocument,
  "diversity enforces max chunks per document",
);

const reranked = rerankResults(diversified);
const final = reranked.slice(0, RETRIEVAL_CONFIG.rerank.outputTopK);

assert(final.length <= RETRIEVAL_CONFIG.rerank.outputTopK, "rerank outputs 12 max");
assert(
  final[0].finalScore >= final[final.length - 1].finalScore,
  "reranked results are score-ordered",
);

console.log("\nAll diversity/rerank checks passed.");
