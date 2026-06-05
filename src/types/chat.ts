import type { SourceEvidence } from "@/types/evidence";
import type { TopicSourceGroup } from "@/types/comparison";
import type { HybridRetrievalDebug } from "@/lib/search/types";

/** @deprecated Use SourceEvidence — kept for chat message compatibility */
export type CitationSource = SourceEvidence;

export type MessageTimings = {
  totalMs: number;
  retrievalMs: number;
  generationMs: number;
  estimated: boolean;
};

export type RagModelInfo = {
  embeddingModel: string;
  vectorDatabase: string;
  llmModel: string;
};

export type MemoryDebugInfo = {
  used: boolean;
  messagesIncluded: number;
};

export type RagDebugInfo = {
  question: string;
  prompt: string;
  chunks: Array<{
    file: string;
    chunkIndex: number;
    score: number;
    content: string;
  }>;
  timings: MessageTimings;
  models?: RagModelInfo;
  memory?: MemoryDebugInfo;
  hybridRetrieval?: HybridRetrievalDebug;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: CitationSource[];
  error?: boolean;
  createdAt?: string;
  confidence?: number;
  timings?: MessageTimings;
  debug?: RagDebugInfo;
  /** Original user question that produced this answer */
  question?: string;
  /** When set on error messages, enables retry of the failed question */
  retryQuestion?: string;
  /** Multi-document synthesis response with structured sections */
  researchMode?: boolean;
  /** Side-by-side comparison of two medical topics */
  comparisonMode?: boolean;
  /** Parsed topics for comparison answers (e.g. diabetes, hypertension) */
  comparisonTopics?: string[];
  /** Citations grouped per compared topic */
  topicSources?: TopicSourceGroup[];
  /** Whether conversational memory informed this answer */
  memory?: MemoryDebugInfo;
};

export type ConversationTurn = {
  role: "user" | "assistant";
  content: string;
};

export type RetrievalChunkExplanation = {
  chunkIndex: number;
  score: number;
  file: string;
  sectionHint: string;
};

export type RetrievalExplanation = {
  summary: string;
  chunks: RetrievalChunkExplanation[];
  documentSummary: string;
  sectionSummary: string;
};
