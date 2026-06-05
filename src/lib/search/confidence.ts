import { RETRIEVAL_CONFIG } from "./retrieval.config";
import type { FusedHit } from "./types";

export type RetrievalQualityAssessment = {
  retrievalConfidence: number;
  lowRetrievalConfidence: boolean;
  reasons: string[];
};

export function assessRetrievalQuality(
  finalHits: FusedHit[],
  uniqueDocuments: number,
): RetrievalQualityAssessment {
  const { quality } = RETRIEVAL_CONFIG;
  const reasons: string[] = [];

  const topScore =
    finalHits.length > 0
      ? Math.max(...finalHits.map((hit) => hit.finalScore))
      : 0;

  const topN = finalHits
    .slice(0, quality.confidenceTopN)
    .map((hit) => hit.finalScore);
  const retrievalConfidence =
    topN.length > 0
      ? Number(
          (topN.reduce((sum, score) => sum + score, 0) / topN.length).toFixed(
            4,
          ),
        )
      : 0;

  if (topScore < quality.lowConfidenceScoreThreshold) {
    reasons.push(
      `Top score ${topScore.toFixed(3)} < ${quality.lowConfidenceScoreThreshold}`,
    );
  }

  if (uniqueDocuments < quality.minDocumentCoverageCount) {
    reasons.push(
      `Document coverage ${uniqueDocuments} < ${quality.minDocumentCoverageCount}`,
    );
  }

  if (finalHits.length < quality.minFinalChunks) {
    reasons.push(
      `Final chunks ${finalHits.length} < ${quality.minFinalChunks}`,
    );
  }

  return {
    retrievalConfidence,
    lowRetrievalConfidence: reasons.length > 0,
    reasons,
  };
}

export function buildPerformanceWarnings(metrics: {
  planningMs: number;
  bm25Ms: number;
  vectorMs: number;
  fusionMs: number;
  rerankMs: number;
  totalRetrievalMs: number;
}): string[] {
  const targets = RETRIEVAL_CONFIG.performanceTargetsMs;
  const warnings: string[] = [];

  if (metrics.planningMs > targets.queryPlanning) {
    warnings.push(`planning ${metrics.planningMs}ms > ${targets.queryPlanning}ms`);
  }
  if (metrics.bm25Ms > targets.bm25) {
    warnings.push(`bm25 ${metrics.bm25Ms}ms > ${targets.bm25}ms`);
  }
  if (metrics.vectorMs > targets.vectorSearch) {
    warnings.push(`vector ${metrics.vectorMs}ms > ${targets.vectorSearch}ms`);
  }
  if (metrics.fusionMs > targets.fusion) {
    warnings.push(`fusion ${metrics.fusionMs}ms > ${targets.fusion}ms`);
  }
  if (metrics.rerankMs > targets.reranking) {
    warnings.push(`rerank ${metrics.rerankMs}ms > ${targets.reranking}ms`);
  }
  if (metrics.totalRetrievalMs > targets.totalRetrieval) {
    warnings.push(
      `total ${metrics.totalRetrievalMs}ms > ${targets.totalRetrieval}ms`,
    );
  }

  return warnings;
}
