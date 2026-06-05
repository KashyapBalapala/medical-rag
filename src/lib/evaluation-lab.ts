import { computeAnswerConfidence } from "@/lib/chat-utils";
import type { CitationSource, RagDebugInfo } from "@/types/chat";
import type {
  EvaluationRecord,
  EvaluationRunResult,
  RankedChunk,
} from "@/types/evaluation";

const STORAGE_KEY = "medical-rag-evaluation-history";
const MAX_HISTORY = 50;

export function computeChunkScores(chunks: RagDebugInfo["chunks"]) {
  if (chunks.length === 0) {
    return { topScore: 0, avgScore: 0 };
  }

  const scores = chunks.map((chunk) => chunk.score);
  const topScore = Math.max(...scores);
  const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;

  return {
    topScore: Math.round(topScore * 100),
    avgScore: Math.round(avgScore * 100),
  };
}

export function rankChunks(chunks: RagDebugInfo["chunks"], limit = 5): RankedChunk[] {
  return [...chunks]
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((chunk, index) => ({
      rank: index + 1,
      file: chunk.file,
      chunkIndex: chunk.chunkIndex,
      score: chunk.score,
      content: chunk.content,
    }));
}

export function buildEvaluationResult(
  question: string,
  answer: string,
  debug: RagDebugInfo,
  sources: CitationSource[],
): EvaluationRunResult {
  const { topScore, avgScore } = computeChunkScores(debug.chunks);
  const confidence = computeAnswerConfidence(sources);
  const success = !answer.toLowerCase().includes("could not find") && sources.length > 0;

  return {
    question,
    answer,
    debug,
    confidence,
    topScore,
    avgScore,
    success,
  };
}

export function toEvaluationRecord(
  result: EvaluationRunResult,
  sources: CitationSource[],
): EvaluationRecord {
  return {
    id: crypto.randomUUID(),
    question: result.question,
    answer: result.answer,
    topScore: result.topScore,
    avgScore: result.avgScore,
    confidence: result.confidence,
    retrievalMs: result.debug.timings.retrievalMs,
    generationMs: result.debug.timings.generationMs,
    totalMs: result.debug.timings.totalMs,
    success: result.success,
    chunkCount: result.debug.chunks.length,
    topChunks: rankChunks(result.debug.chunks, 5),
    sources,
    createdAt: new Date().toISOString(),
  };
}

export function loadEvaluationHistory(): EvaluationRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as EvaluationRecord[];
  } catch {
    return [];
  }
}

export function saveEvaluationHistory(records: EvaluationRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(records.slice(0, MAX_HISTORY)),
  );
}

export function appendEvaluationRecord(record: EvaluationRecord): EvaluationRecord[] {
  const next = [record, ...loadEvaluationHistory()].slice(0, MAX_HISTORY);
  saveEvaluationHistory(next);
  return next;
}

export function clearEvaluationHistory(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
