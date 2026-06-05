/**
 * Central retrieval tuning for Hybrid Retrieval V2.
 * All stages read from this module — do not duplicate thresholds elsewhere.
 */

export type QueryClassification =
  | "direct_qa"
  | "research"
  | "comparison"
  | "exploratory"
  | "follow_up";

export type RerankWeights = {
  rrf: number;
  vector: number;
  bm25: number;
  diversity: number;
};

export type RetrievalPerformanceTargetsMs = {
  queryPlanning: number;
  bm25: number;
  vectorSearch: number;
  fusion: number;
  reranking: number;
  totalRetrieval: number;
};

function envInt(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function envFloat(key: string, fallback: number): number {
  const raw = process.env[key];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/** ~4 characters per token for English medical prose. */
export const CHARS_PER_TOKEN = 4;

export const RETRIEVAL_CONFIG = {
  featureFlag: {
    hybridEnabled: process.env.ENABLE_HYBRID_RETRIEVAL === "true",
  },

  /** Phase 1 — query planning */
  planning: {
    directQa: { minQueries: 1, maxQueries: 2 },
    research: { minQueries: 5, maxQueries: 8 },
    comparison: { minQueries: 8, maxQueries: 12 },
    exploratory: { minQueries: 5, maxQueries: 8 },
    followUp: { minQueries: 1, maxQueries: 2 },
    targetLatencyMs: envInt("RETRIEVAL_PLANNING_TARGET_MS", 100),
  },

  /** Phase 2 — dual retrieval per planned query */
  retrieval: {
    bm25TopK: envInt("HYBRID_BM25_TOP_K", 15),
    vectorTopK: envInt("HYBRID_VECTOR_TOP_K", 15),
    bm25TargetLatencyMs: envInt("RETRIEVAL_BM25_TARGET_MS", 100),
    vectorTargetLatencyMs: envInt("RETRIEVAL_VECTOR_TARGET_MS", 500),
  },

  /** Phase 3 — reciprocal rank fusion */
  fusion: {
    rrfK: envInt("HYBRID_RRF_K", 60),
    candidateTopK: envInt("HYBRID_FUSION_TOP_K", 40),
    targetLatencyMs: envInt("RETRIEVAL_FUSION_TARGET_MS", 50),
  },

  /** Phase 4 — diversity selection */
  diversity: {
    maxChunksPerDocument: envInt("HYBRID_MAX_PER_DOCUMENT", 3),
    preferredChunksPerDocument: envInt("HYBRID_PREFERRED_PER_DOCUMENT", 2),
    sectionChunkGap: envInt("HYBRID_SECTION_CHUNK_GAP", 2),
    outputTopK: envInt("HYBRID_DIVERSITY_TOP_K", 20),
    minSourceDocuments: envInt("HYBRID_MIN_SOURCE_DOCUMENTS", 4),
    preferredSourceDocuments: envInt("HYBRID_PREFERRED_SOURCE_DOCUMENTS", 5),
  },

  /** Phase 5 — reranking */
  rerank: {
    weights: {
      rrf: envFloat("HYBRID_RERANK_RRF_WEIGHT", 0.45),
      vector: envFloat("HYBRID_RERANK_VECTOR_WEIGHT", 0.25),
      bm25: envFloat("HYBRID_RERANK_BM25_WEIGHT", 0.15),
      diversity: envFloat("HYBRID_RERANK_DIVERSITY_WEIGHT", 0.15),
    } satisfies RerankWeights,
    newDocumentBonus: envFloat("HYBRID_DIVERSITY_NEW_DOC_BONUS", 0.15),
    newSectionBonus: envFloat("HYBRID_DIVERSITY_NEW_SECTION_BONUS", 0.05),
    outputTopK: envInt("HYBRID_FINAL_TOP_K", 12),
    targetLatencyMs: envInt("RETRIEVAL_RERANK_TARGET_MS", 50),
  },

  /** Phase 6 — context construction */
  context: {
    minChunkTokens: envInt("HYBRID_CHUNK_MIN_TOKENS", 250),
    maxChunkTokens: envInt("HYBRID_CHUNK_MAX_TOKENS", 400),
    targetTokens: envInt("HYBRID_CONTEXT_TARGET_TOKENS", 4000),
    maxTokens: envInt("HYBRID_CONTEXT_MAX_TOKENS", 6000),
    get targetChars() {
      return this.targetTokens * CHARS_PER_TOKEN;
    },
    get maxChars() {
      return this.maxTokens * CHARS_PER_TOKEN;
    },
    get minChunkChars() {
      return this.minChunkTokens * CHARS_PER_TOKEN;
    },
    get maxChunkChars() {
      return this.maxChunkTokens * CHARS_PER_TOKEN;
    },
  },

  /** Phase 7–9 — coverage, confidence, failure detection */
  quality: {
    confidenceTopN: 5,
    lowConfidenceScoreThreshold: envFloat(
      "HYBRID_LOW_CONFIDENCE_THRESHOLD",
      0.55,
    ),
    minDocumentCoverageCount: envInt("HYBRID_MIN_DOCUMENT_COVERAGE", 2),
    minFinalChunks: envInt("HYBRID_MIN_FINAL_CHUNKS", 4),
  },

  performanceTargetsMs: {
    queryPlanning: envInt("RETRIEVAL_PLANNING_TARGET_MS", 100),
    bm25: envInt("RETRIEVAL_BM25_TARGET_MS", 100),
    vectorSearch: envInt("RETRIEVAL_VECTOR_TARGET_MS", 500),
    fusion: envInt("RETRIEVAL_FUSION_TARGET_MS", 50),
    reranking: envInt("RETRIEVAL_RERANK_TARGET_MS", 50),
    totalRetrieval: envInt("RETRIEVAL_TOTAL_TARGET_MS", 1500),
  } satisfies RetrievalPerformanceTargetsMs,

  /** Per-classification output limits (avoid oversized prompts on simple QA) */
  classificationLimits: {
    direct_qa: {
      finalTopK: envInt("HYBRID_DIRECT_QA_TOP_K", 4),
      diversityTopK: envInt("HYBRID_DIRECT_QA_DIVERSITY_K", 8),
      contextTargetTokens: envInt("HYBRID_DIRECT_QA_CONTEXT_TOKENS", 1500),
      contextMaxTokens: envInt("HYBRID_DIRECT_QA_CONTEXT_MAX_TOKENS", 2500),
      maxChunkTokens: envInt("HYBRID_DIRECT_QA_CHUNK_TOKENS", 250),
      numPredict: envInt("HYBRID_DIRECT_QA_NUM_PREDICT", 350),
    },
    follow_up: {
      finalTopK: envInt("HYBRID_FOLLOW_UP_TOP_K", 4),
      diversityTopK: envInt("HYBRID_FOLLOW_UP_DIVERSITY_K", 8),
      contextTargetTokens: envInt("HYBRID_FOLLOW_UP_CONTEXT_TOKENS", 1500),
      contextMaxTokens: envInt("HYBRID_FOLLOW_UP_CONTEXT_MAX_TOKENS", 2500),
      maxChunkTokens: envInt("HYBRID_FOLLOW_UP_CHUNK_TOKENS", 250),
      numPredict: envInt("HYBRID_FOLLOW_UP_NUM_PREDICT", 350),
    },
    research: {
      finalTopK: envInt("HYBRID_FINAL_TOP_K", 12),
      diversityTopK: envInt("HYBRID_DIVERSITY_TOP_K", 20),
      contextTargetTokens: envInt("HYBRID_CONTEXT_TARGET_TOKENS", 4000),
      contextMaxTokens: envInt("HYBRID_CONTEXT_MAX_TOKENS", 6000),
      maxChunkTokens: envInt("HYBRID_CHUNK_MAX_TOKENS", 400),
      numPredict: envInt("HYBRID_RESEARCH_NUM_PREDICT", 1000),
    },
    comparison: {
      finalTopK: envInt("HYBRID_FINAL_TOP_K", 12),
      diversityTopK: envInt("HYBRID_DIVERSITY_TOP_K", 20),
      contextTargetTokens: envInt("HYBRID_COMPARISON_CONTEXT_TOKENS", 5000),
      contextMaxTokens: envInt("HYBRID_CONTEXT_MAX_TOKENS", 6000),
      maxChunkTokens: envInt("HYBRID_CHUNK_MAX_TOKENS", 400),
      numPredict: envInt("HYBRID_COMPARISON_NUM_PREDICT", 1400),
    },
    exploratory: {
      finalTopK: envInt("HYBRID_FINAL_TOP_K", 12),
      diversityTopK: envInt("HYBRID_DIVERSITY_TOP_K", 20),
      contextTargetTokens: envInt("HYBRID_CONTEXT_TARGET_TOKENS", 4000),
      contextMaxTokens: envInt("HYBRID_CONTEXT_MAX_TOKENS", 6000),
      maxChunkTokens: envInt("HYBRID_CHUNK_MAX_TOKENS", 400),
      numPredict: envInt("HYBRID_RESEARCH_NUM_PREDICT", 1000),
    },
  },

  /** Ollama generation when hybrid retrieval is active (CPU prefill can exceed 5 min) */
  ollama: {
    timeoutMs: envInt("HYBRID_OLLAMA_TIMEOUT_MS", 600000),
  },
} as const;

export type ClassificationLimits =
  (typeof RETRIEVAL_CONFIG.classificationLimits)[QueryClassification];

export function getClassificationLimits(
  classification: QueryClassification,
): ClassificationLimits {
  return RETRIEVAL_CONFIG.classificationLimits[classification];
}

export function isHybridRetrievalEnabled(): boolean {
  return RETRIEVAL_CONFIG.featureFlag.hybridEnabled;
}

export function getRerankWeights(): RerankWeights {
  const raw = process.env.HYBRID_RERANK_WEIGHTS;
  if (!raw) return RETRIEVAL_CONFIG.rerank.weights;

  try {
    const parsed = JSON.parse(raw) as Partial<RerankWeights>;
    const defaults = RETRIEVAL_CONFIG.rerank.weights;
    return {
      rrf: parsed.rrf ?? defaults.rrf,
      vector: parsed.vector ?? defaults.vector,
      bm25: parsed.bm25 ?? defaults.bm25,
      diversity: parsed.diversity ?? defaults.diversity,
    };
  } catch {
    return RETRIEVAL_CONFIG.rerank.weights;
  }
}
