import { generateRetrievalPlan } from "../src/lib/research/planner";
import { hybridRetrieve } from "../src/lib/search/hybrid";
import { initializeBM25 } from "../src/lib/search/bm25";
import { RETRIEVAL_CONFIG } from "../src/lib/search/retrieval.config";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✗ ${message}`);
    process.exit(1);
  }
  console.log(`✓ ${message}`);
}

const questions = [
  "What are symptoms of diabetes?",
  "How is diabetes diagnosed?",
  "Explain diabetes.",
  "Compare diabetes and hypertension",
];

async function main(): Promise<void> {
  await initializeBM25();

  for (const question of questions) {
    const plan = generateRetrievalPlan(question, [], {
      researchMode: question.toLowerCase().includes("explain") ||
        question.toLowerCase().includes("compare"),
      comparisonMode: question.toLowerCase().includes("compare"),
      comparisonTopics: question.toLowerCase().includes("compare")
        ? ["diabetes", "hypertension"]
        : [],
    });

    const result = await hybridRetrieve(plan, { log: false });
    const metrics = result.diagnostics.retrievalMetrics;
    const counts = result.diagnostics.stageCounts;

    assert(plan.queries.length > 0, `${question} produced a retrieval plan`);
    assert(
      counts.bm25ResultsCount > 0,
      `${question} returned BM25 hits (${counts.bm25ResultsCount})`,
    );
    assert(
      counts.vectorResultsCount > 0,
      `${question} returned vector hits (${counts.vectorResultsCount})`,
    );
    assert(
      counts.fusedResultsCount <= RETRIEVAL_CONFIG.fusion.candidateTopK,
      `${question} fused to <= ${RETRIEVAL_CONFIG.fusion.candidateTopK} candidates`,
    );
    assert(
      result.chunks.length <= RETRIEVAL_CONFIG.rerank.outputTopK,
      `${question} final chunks <= ${RETRIEVAL_CONFIG.rerank.outputTopK}`,
    );
    assert(
      counts.uniqueDocuments >= 1,
      `${question} covered ${counts.uniqueDocuments} document(s)`,
    );

    const docCounts = new Map<string, number>();
    for (const chunk of result.chunks) {
      const file = chunk.metadata.filename;
      docCounts.set(file, (docCounts.get(file) ?? 0) + 1);
    }
    assert(
      [...docCounts.values()].every(
        (count) =>
          count <= RETRIEVAL_CONFIG.diversity.maxChunksPerDocument,
      ),
      `${question} respects max ${RETRIEVAL_CONFIG.diversity.maxChunksPerDocument} chunks per document`,
    );

    assert(
      metrics.retrievalConfidence >= 0,
      `${question} retrieval confidence ${metrics.retrievalConfidence}`,
    );
  }

  console.log("\nAll hybrid retrieval integration checks passed.");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
