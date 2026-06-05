/** @deprecated Import from retrieval.config.ts — kept for backward compatibility. */
export {
  RETRIEVAL_CONFIG,
  isHybridRetrievalEnabled,
  getRerankWeights,
  CHARS_PER_TOKEN,
  type QueryClassification,
  type RerankWeights,
  type RetrievalPerformanceTargetsMs,
} from "./retrieval.config";

import { RETRIEVAL_CONFIG } from "./retrieval.config";

export const BM25_TOP_K = RETRIEVAL_CONFIG.retrieval.bm25TopK;
export const VECTOR_TOP_K = RETRIEVAL_CONFIG.retrieval.vectorTopK;
export const RRF_K = RETRIEVAL_CONFIG.fusion.rrfK;
export const MAX_CHUNKS_PER_DOCUMENT = RETRIEVAL_CONFIG.diversity.maxChunksPerDocument;
export const HYBRID_CONTEXT_BUDGET_CHARS = RETRIEVAL_CONFIG.context.maxChars;
