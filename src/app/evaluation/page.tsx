"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import EvalAnswerPanel from "@/components/evaluation/EvalAnswerPanel";
import EvalChunkTable from "@/components/evaluation/EvalChunkTable";
import EvalHistoryPanel from "@/components/evaluation/EvalHistoryPanel";
import EvalMetricsGrid from "@/components/evaluation/EvalMetricsGrid";
import EvalPipelineViz from "@/components/evaluation/EvalPipelineViz";
import { Button } from "@/components/ui";
import { normalizeDebugInfo } from "@/lib/chat-utils";
import {
  appendEvaluationRecord,
  buildEvaluationResult,
  clearEvaluationHistory,
  loadEvaluationHistory,
  rankChunks,
  toEvaluationRecord,
} from "@/lib/evaluation-lab";
import type { CitationSource, RagDebugInfo } from "@/types/chat";
import type { EvaluationRecord, RankedChunk } from "@/types/evaluation";

type ActiveRun = {
  question: string;
  answer: string;
  debug: RagDebugInfo;
  sources: CitationSource[];
  topScore: number;
  avgScore: number;
  confidence: number;
  success: boolean;
  topChunks: RankedChunk[];
};

export default function EvaluationPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pipelineActive, setPipelineActive] = useState(false);
  const [activeRun, setActiveRun] = useState<ActiveRun | null>(null);
  const [history, setHistory] = useState<EvaluationRecord[]>([]);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  useEffect(() => {
    setHistory(loadEvaluationHistory());
  }, []);

  const runTest = useCallback(async () => {
    const trimmed = question.trim();
    if (!trimmed || loading) return;

    setLoading(true);
    setError(null);
    setPipelineActive(false);
    setSelectedHistoryId(null);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: trimmed, debug: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error ?? "Request failed");
      }

      if (!data.debug) {
        throw new Error("Debug payload missing — ensure debug mode is enabled");
      }

      const debug = normalizeDebugInfo(data.debug as RagDebugInfo);
      const sources = (data.sources ?? []) as CitationSource[];
      const result = buildEvaluationResult(trimmed, data.answer, debug, sources);
      const topChunks = rankChunks(debug.chunks, 5);

      setActiveRun({
        question: trimmed,
        answer: data.answer,
        debug,
        sources,
        topScore: result.topScore,
        avgScore: result.avgScore,
        confidence: result.confidence,
        success: result.success,
        topChunks,
      });

      setPipelineActive(true);

      const record = toEvaluationRecord(result, sources);
      setHistory(appendEvaluationRecord(record));
      setSelectedHistoryId(record.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Evaluation failed");
      setActiveRun(null);
    } finally {
      setLoading(false);
    }
  }, [question, loading]);

  function handleHistorySelect(record: EvaluationRecord) {
    setSelectedHistoryId(record.id);
    setQuestion(record.question);
    setPipelineActive(true);
    setActiveRun({
      question: record.question,
      answer: record.answer,
      debug: {
        question: record.question,
        prompt: "",
        chunks: record.topChunks.map((chunk) => ({
          file: chunk.file,
          chunkIndex: chunk.chunkIndex,
          score: chunk.score,
          content: chunk.content,
        })),
        timings: {
          retrievalMs: record.retrievalMs,
          generationMs: record.generationMs,
          totalMs: record.totalMs,
          estimated: false,
        },
      },
      sources: record.sources,
      topScore: record.topScore,
      avgScore: record.avgScore,
      confidence: record.confidence,
      success: record.success,
      topChunks: record.topChunks,
    });
  }

  function handleClearHistory() {
    clearEvaluationHistory();
    setHistory([]);
    setSelectedHistoryId(null);
  }

  const display = activeRun;

  return (
    <div className="min-h-full bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-violet-400">
              Observability
            </p>
            <h1 className="text-xl font-bold tracking-tight text-white">
              RAG Evaluation Lab
            </h1>
            <p className="mt-0.5 text-sm text-slate-400">
              Inspect retrieval, latency, and generation quality
            </p>
          </div>
          <Link href="/">
            <Button
              variant="secondary"
              size="sm"
              className="border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700"
            >
              ← Back to chat
            </Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <motion.section
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl border border-slate-700/80 bg-slate-900/50 p-4 sm:p-5"
        >
          <label htmlFor="eval-question" className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Question testing
          </label>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <input
              id="eval-question"
              type="text"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") void runTest();
              }}
              placeholder="Enter a question to evaluate the RAG pipeline…"
              className="flex-1 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 focus:border-violet-500 focus:outline-none focus:ring-1 focus:ring-violet-500"
              disabled={loading}
            />
            <Button
              type="button"
              onClick={() => void runTest()}
              disabled={loading || !question.trim()}
              className="shrink-0 bg-violet-600 hover:bg-violet-500 disabled:opacity-50"
            >
              {loading ? "Running…" : "Run evaluation"}
            </Button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-red-400" role="alert">
              {error}
            </p>
          )}
        </motion.section>

        <section className="mt-6">
          <EvalMetricsGrid
            retrievalMs={display?.debug.timings.retrievalMs ?? null}
            generationMs={display?.debug.timings.generationMs ?? null}
            totalMs={display?.debug.timings.totalMs ?? null}
            topScore={display?.topScore ?? null}
            avgScore={display?.avgScore ?? null}
            loading={loading}
          />
          {display && (
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-500">
              <span>
                Confidence:{" "}
                <strong className="text-slate-300">{display.confidence}%</strong>
              </span>
              <span>
                Status:{" "}
                <strong
                  className={
                    display.success ? "text-emerald-400" : "text-amber-400"
                  }
                >
                  {display.success ? "Success" : "Low evidence"}
                </strong>
              </span>
              <span>
                Chunks retrieved:{" "}
                <strong className="text-slate-300">
                  {display.debug.chunks.length}
                </strong>
              </span>
            </div>
          )}
        </section>

        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px] xl:grid-cols-[1fr_320px]">
          <div className="space-y-6">
            <EvalChunkTable
              chunks={display?.topChunks ?? []}
              loading={loading}
            />
            <EvalAnswerPanel
              answer={display?.answer ?? null}
              sources={display?.sources ?? []}
              loading={loading}
              prompt={display?.debug.prompt ?? null}
            />
          </div>

          <div className="space-y-6">
            <EvalPipelineViz active={pipelineActive} />
            {display?.debug.models && (
              <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-4 text-xs">
                <h3 className="font-semibold uppercase tracking-wider text-slate-400">
                  Models
                </h3>
                <dl className="mt-3 space-y-2 font-mono text-slate-300">
                  <div>
                    <dt className="text-slate-500">Embedding</dt>
                    <dd>{display.debug.models.embeddingModel}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Vector DB</dt>
                    <dd>{display.debug.models.vectorDatabase}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">LLM</dt>
                    <dd>{display.debug.models.llmModel}</dd>
                  </div>
                </dl>
              </div>
            )}
            <div className="min-h-[320px] lg:min-h-[480px]">
              <EvalHistoryPanel
                records={history}
                onSelect={handleHistorySelect}
                onClear={handleClearHistory}
                selectedId={selectedHistoryId}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
