import type {
  CitationSource,
  MessageTimings,
  RagDebugInfo,
  RagModelInfo,
  RetrievalExplanation,
} from "@/types/chat";

export type ConfidenceLevel = "High" | "Medium" | "Low";

export function displayFilename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.85) return "High";
  if (score >= 0.7) return "Medium";
  return "Low";
}

export function computeAnswerConfidence(sources: CitationSource[]): number {
  if (sources.length === 0) return 0;
  const avg =
    sources.reduce((sum, source) => sum + source.score, 0) / sources.length;
  return Math.round(avg * 100);
}

export function buildConfidenceTooltip(
  sources: CitationSource[],
  percent: number,
): string {
  if (sources.length === 0) {
    return "Confidence is 0% because no document chunks were retrieved. The answer is not grounded in indexed sources.";
  }

  const scoreList = sources
    .map((source) => `${Math.round(source.score * 100)}%`)
    .join(", ");

  return [
    `Confidence is the average semantic similarity of ${sources.length} retrieved chunk${sources.length === 1 ? "" : "s"}: ${scoreList} → ${percent}%.`,
    "Thresholds: ≥85% High · ≥70% Medium · <70% Low.",
  ].join(" ");
}

export function truncatePreview(text: string, maxLength = 200): string {
  const normalized = text.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}…`;
}

/** Client-side timing estimate when server breakdown is unavailable. */
export function estimateTimings(totalMs: number): MessageTimings {
  const retrievalMs = Math.round(
    Math.min(Math.max(totalMs * 0.1, 400), totalMs * 0.35),
  );
  const generationMs = Math.max(0, totalMs - retrievalMs);

  return {
    totalMs,
    retrievalMs,
    generationMs,
    estimated: true,
  };
}

export function buildDebugPrompt(
  question: string,
  sources: CitationSource[],
): string {
  const context = sources
    .map((source, index) => {
      return [
        `[Context ${index + 1} | ${source.file} | chunk ${source.chunkIndex} | score ${source.score}]`,
        source.excerpt,
      ].join("\n");
    })
    .join("\n\n---\n\n");

  return `You are a medical document assistant.

Answer using only the provided context.

Provide a clear and concise answer.

Context:
${context}

Question:
${question}

Answer:`;
}

export const DEFAULT_RAG_MODELS: RagModelInfo = {
  embeddingModel: "Xenova/all-MiniLM-L6-v2",
  vectorDatabase: "ChromaDB (medical_docs)",
  llmModel: "llama3.2:3b",
};

export function buildDebugInfo(
  question: string,
  sources: CitationSource[],
  timings: MessageTimings,
  models?: RagModelInfo,
  memory?: RagDebugInfo["memory"],
): RagDebugInfo {
  return {
    question,
    prompt: buildDebugPrompt(question, sources),
    chunks: sources.map((source) => ({
      file: displayFilename(source.file),
      chunkIndex: source.chunkIndex,
      score: source.score,
      content: source.excerpt,
    })),
    timings,
    models: models ?? DEFAULT_RAG_MODELS,
    memory: memory ?? { used: false, messagesIncluded: 0 },
  };
}

export type CompleteRagDebugInfo = RagDebugInfo & { models: RagModelInfo };

/** Backfill missing fields on debug payloads from older sessions. */
export function normalizeDebugInfo(
  debug: Partial<RagDebugInfo>,
): CompleteRagDebugInfo {
  return {
    question: debug.question ?? "",
    prompt: debug.prompt ?? "",
    chunks: debug.chunks ?? [],
    timings:
      debug.timings ?? {
        totalMs: 0,
        retrievalMs: 0,
        generationMs: 0,
        estimated: true,
      },
    models: debug.models ?? DEFAULT_RAG_MODELS,
    memory: debug.memory ?? { used: false, messagesIncluded: 0 },
    hybridRetrieval: debug.hybridRetrieval,
  };
}

export function formatMs(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function formatTimestamp(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export const confidenceStyles: Record<
  ConfidenceLevel,
  {
    badge: string;
    dot: string;
    ring: string;
    bar: string;
    barMuted: string;
    label: string;
  }
> = {
  High: {
    badge: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
    ring: "ring-emerald-600/15",
    bar: "text-emerald-600",
    barMuted: "text-emerald-200",
    label: "High Confidence",
  },
  Medium: {
    badge: "bg-blue-50 text-blue-700",
    dot: "bg-blue-500",
    ring: "ring-blue-600/15",
    bar: "text-blue-600",
    barMuted: "text-blue-200",
    label: "Medium Confidence",
  },
  Low: {
    badge: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
    ring: "ring-amber-600/15",
    bar: "text-amber-600",
    barMuted: "text-amber-200",
    label: "Low Confidence",
  },
};

const SECTION_PATTERNS: Array<{ pattern: RegExp; hint: string }> = [
  { pattern: /symptom/i, hint: "symptoms" },
  { pattern: /signs?\s+and\s+symptoms/i, hint: "signs and symptoms" },
  { pattern: /diagnos/i, hint: "diagnosis" },
  { pattern: /complicat/i, hint: "complications" },
  { pattern: /treatment|therapy|management/i, hint: "treatment and management" },
  { pattern: /prevention|prevent/i, hint: "prevention" },
  { pattern: /hypertension|blood pressure/i, hint: "hypertension" },
  { pattern: /diabetes|glucose|insulin|glycemi/i, hint: "diabetes" },
  { pattern: /guideline|recommend/i, hint: "clinical guidelines" },
  { pattern: /definition|what is/i, hint: "definitions and overview" },
  { pattern: /risk factor/i, hint: "risk factors" },
  { pattern: /monitor|screen/i, hint: "monitoring and screening" },
];

function detectSectionHint(excerpt: string): string {
  for (const { pattern, hint } of SECTION_PATTERNS) {
    if (pattern.test(excerpt)) return hint;
  }
  return "relevant medical content";
}

function humanizeDocumentName(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function buildRetrievalExplanation(
  question: string,
  sources: CitationSource[],
): RetrievalExplanation {
  if (sources.length === 0) {
    return {
      summary:
        "No document chunks were retrieved for this question. The answer may indicate that the information was not found in the indexed library.",
      chunks: [],
      documentSummary: "no indexed documents",
      sectionSummary: "no matching sections",
    };
  }

  const chunks = sources.map((source) => ({
    chunkIndex: source.chunkIndex,
    score: source.score,
    file: displayFilename(source.file),
    sectionHint: detectSectionHint(source.excerpt),
  }));

  const uniqueDocs = [...new Set(chunks.map((c) => c.file))];
  const uniqueSections = [...new Set(chunks.map((c) => c.sectionHint))];

  const documentSummary =
    uniqueDocs.length === 1
      ? humanizeDocumentName(uniqueDocs[0]!)
      : `${uniqueDocs.length} uploaded documents`;

  const sectionSummary =
    uniqueSections.length === 1
      ? `the ${uniqueSections[0]} section`
      : `sections covering ${uniqueSections.join(", ")}`;

  const topChunk = chunks[0];
  const summary = `This answer was generated because the retrieval system found ${sources.length} semantically relevant chunk${sources.length === 1 ? "" : "s"} in ${documentSummary}. The highest-scoring match (chunk ${topChunk?.chunkIndex}, ${Math.round((topChunk?.score ?? 0) * 100)}% relevance) appears to contain ${sectionSummary}, which directly supports answering: "${question}".`;

  return {
    summary,
    chunks,
    documentSummary,
    sectionSummary,
  };
}
