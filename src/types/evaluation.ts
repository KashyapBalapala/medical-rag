import type { CitationSource, RagDebugInfo } from "@/types/chat";

export type EvaluationRecord = {
  id: string;
  question: string;
  answer: string;
  topScore: number;
  avgScore: number;
  confidence: number;
  retrievalMs: number;
  generationMs: number;
  totalMs: number;
  success: boolean;
  chunkCount: number;
  topChunks: RankedChunk[];
  sources: CitationSource[];
  createdAt: string;
};

export type EvaluationRunResult = {
  question: string;
  answer: string;
  debug: RagDebugInfo;
  confidence: number;
  topScore: number;
  avgScore: number;
  success: boolean;
};

export type RankedChunk = {
  rank: number;
  file: string;
  chunkIndex: number;
  score: number;
  content: string;
};
