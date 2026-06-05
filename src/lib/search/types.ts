import type { SearchResult } from "@/lib/retrieve";
import type { QueryClassification } from "./retrieval.config";

export type RetrievalIntent = QueryClassification;

export type PlannedQuery = {
  query: string;
  label: string;
};

export type RetrievalPlan = {
  classification: QueryClassification;
  intent: QueryClassification;
  topics: string[];
  aspects: string[];
  queries: PlannedQuery[];
};

export type RetrievalSource = "bm25" | "vector";

export type RankedHit = {
  source: RetrievalSource;
  score: number;
  rank: number;
  chunk: SearchResult;
  queryLabel: string;
};

export type FusedHit = {
  chunk: SearchResult;
  queryLabel: string;
  rrfScore: number;
  bm25Score: number;
  vectorScore: number;
  bm25Rank: number | null;
  vectorRank: number | null;
  diversityBonus: number;
  finalScore: number;
};

export type RankedHitSummary = {
  id: string;
  file: string;
  chunkIndex: number;
  score: number;
  rank: number;
  source?: RetrievalSource;
  queryLabel?: string;
  rrfScore?: number;
  finalScore?: number;
};

export type PerQueryRetrievalDebug = {
  query: string;
  label: string;
  bm25Results: RankedHitSummary[];
  vectorResults: RankedHitSummary[];
  fusedResults: RankedHitSummary[];
};

export type RetrievalStageCounts = {
  bm25ResultsCount: number;
  vectorResultsCount: number;
  fusedResultsCount: number;
  diversityResultsCount: number;
  finalContextChunks: number;
  uniqueDocuments: number;
};

export type RetrievalMetrics = {
  planningMs: number;
  bm25Ms: number;
  vectorMs: number;
  fusionMs: number;
  diversityMs: number;
  rerankMs: number;
  mergeMs: number;
  totalRetrievalMs: number;
  documentCoverage: number;
  documentCoverageRatio: number;
  topicCoverage: number;
  topicCoverageRatio: number;
  retrievalConfidence: number;
  bm25IndexLoaded: boolean;
  hybridEnabled: boolean;
  lowRetrievalConfidence: boolean;
  performanceWarnings: string[];
};

export type HybridRetrievalDebug = {
  queryPlan: RetrievalPlan;
  retrievalPlan: RetrievalPlan;
  stageCounts: RetrievalStageCounts;
  perQuery: PerQueryRetrievalDebug[];
  retrievalMetrics: RetrievalMetrics;
};

export type HybridRetrieveResult = {
  chunks: SearchResult[];
  chunksByLabel: Map<string, SearchResult[]>;
  diagnostics: HybridRetrievalDebug;
  lowRetrievalConfidence: boolean;
};

export type BM25ChunkRecord = {
  id: string;
  content: string;
  filename: string;
  chunkIndex: number;
};
