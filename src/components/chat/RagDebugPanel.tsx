"use client";

import { useState, type ReactNode } from "react";
import { displayFilename, formatMs, normalizeDebugInfo } from "@/lib/chat-utils";
import type { RagDebugInfo } from "@/types/chat";
import { cn } from "@/lib/design-system";

type RagDebugPanelProps = {
  debug: Partial<RagDebugInfo>;
};

function Section({
  title,
  children,
  className,
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-lg border border-violet-200/80 bg-white/70", className)}>
      <h4 className="border-b border-violet-100 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
        {title}
      </h4>
      <div className="px-3 py-3">{children}</div>
    </section>
  );
}

function PromptBlock({ prompt }: { prompt: string }) {
  const lines = prompt.split("\n");

  return (
    <pre className="max-h-64 overflow-auto rounded-md bg-slate-900 p-3 font-mono text-[11px] leading-relaxed text-slate-300">
      {lines.map((line, index) => {
        const isContextHeader = line.startsWith("Context:");
        const isQuestionHeader =
          line.startsWith("Question:") ||
          line.startsWith("Current Question:");
        const isHistoryHeader =
          line.startsWith("Conversation History:") ||
          line.startsWith("User:") ||
          line.startsWith("Assistant:");
        const isAnswerHeader = line === "Answer:";
        const isContextMeta = /^\[Context \d+/.test(line);
        const isInstruction =
          line.startsWith("You are") ||
          line.startsWith("Answer using") ||
          line.startsWith("Provide a") ||
          line.startsWith("If the context");

        let className = "text-slate-300";
        if (isContextHeader || isQuestionHeader || isAnswerHeader) {
          className = "font-semibold text-amber-300";
        } else if (isHistoryHeader) {
          className = "text-emerald-300";
        } else if (isContextMeta) {
          className = "text-sky-300";
        } else if (isInstruction) {
          className = "text-emerald-300";
        }

        return (
          <span key={`${index}-${line.slice(0, 12)}`} className={className}>
            {line}
            {"\n"}
          </span>
        );
      })}
    </pre>
  );
}

export default function RagDebugPanel({ debug: rawDebug }: RagDebugPanelProps) {
  const [expanded, setExpanded] = useState(false);
  const debug = normalizeDebugInfo(rawDebug);

  return (
    <div className="mt-5 border-t border-dashed border-violet-200 pt-4">
      <button
        type="button"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-violet-200 bg-violet-50/80 px-4 py-3 text-left transition hover:bg-violet-50"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-600 text-[10px] font-bold uppercase tracking-wide text-white">
            dbg
          </span>
          <div>
            <p className="text-sm font-semibold text-violet-900">RAG Debug Mode</p>
            <p className="text-xs text-violet-600/80">
              Pipeline internals · developer view
            </p>
          </div>
        </div>
        <span
          className={cn(
            "text-violet-400 transition-transform",
            expanded && "rotate-180",
          )}
          aria-hidden
        >
          ▾
        </span>
      </button>

      {expanded && (
        <div className="mt-3 space-y-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-3">
          <Section title="1 · User Question">
            <p className="rounded-md bg-violet-100/60 px-3 py-2 text-sm font-medium text-violet-950">
              {debug.question}
            </p>
          </Section>

          <Section title="2 · Retrieved Chunks">
            {debug.chunks.length === 0 ? (
              <p className="text-sm text-violet-700/70">No chunks retrieved.</p>
            ) : (
              <ul className="space-y-2">
                {debug.chunks.map((chunk, index) => (
                  <li
                    key={`${chunk.file}-${chunk.chunkIndex}-${index}`}
                    className="rounded-md border border-violet-100 bg-white px-3 py-2.5"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
                      <span className="font-semibold text-violet-900">
                        {displayFilename(chunk.file)}
                      </span>
                      <span className="text-violet-600">
                        Chunk {chunk.chunkIndex}
                      </span>
                      <span className="rounded-full bg-violet-100 px-2 py-0.5 font-mono font-semibold text-violet-800">
                        {Math.round(chunk.score * 100)}% score
                      </span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-violet-900/80">
                      {chunk.content}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section title="3 · Prompt Sent To LLM">
            <PromptBlock prompt={debug.prompt} />
          </Section>

          <Section title="4 · Timing Metrics">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
              <div className="rounded-md bg-violet-100/50 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                  Retrieval
                </p>
                <p className="font-mono text-sm font-semibold text-violet-900">
                  {formatMs(debug.timings.retrievalMs)}
                  {debug.timings.estimated && (
                    <span className="ml-1 text-[10px] font-normal text-violet-500">
                      est.
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-md bg-violet-100/50 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                  Generation
                </p>
                <p className="font-mono text-sm font-semibold text-violet-900">
                  {formatMs(debug.timings.generationMs)}
                  {debug.timings.estimated && (
                    <span className="ml-1 text-[10px] font-normal text-violet-500">
                      est.
                    </span>
                  )}
                </p>
              </div>
              <div className="rounded-md bg-violet-100/50 px-3 py-2">
                <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                  Total
                </p>
                <p className="font-mono text-sm font-semibold text-violet-900">
                  {formatMs(debug.timings.totalMs)}
                </p>
              </div>
            </div>
          </Section>

          <Section title="5 · Conversation Memory">
            <dl className="grid gap-2 text-sm">
              <div className="flex items-center justify-between rounded-md bg-violet-100/40 px-3 py-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-violet-500">
                  Memory used
                </dt>
                <dd className="font-semibold text-violet-900">
                  {debug.memory?.used ? "Yes" : "No"}
                </dd>
              </div>
              <div className="flex items-center justify-between rounded-md bg-violet-100/40 px-3 py-2">
                <dt className="text-xs font-medium uppercase tracking-wide text-violet-500">
                  Messages included
                </dt>
                <dd className="font-mono font-semibold text-violet-900">
                  {debug.memory?.messagesIncluded ?? 0}
                </dd>
              </div>
            </dl>
          </Section>

          {debug.hybridRetrieval && (
            <Section title="6 · Hybrid Retrieval">
              <dl className="mb-3 grid gap-2 text-sm sm:grid-cols-2">
                <div className="rounded-md bg-violet-100/40 px-3 py-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    Classification
                  </dt>
                  <dd className="font-semibold text-violet-900">
                    {debug.hybridRetrieval.queryPlan.classification}
                  </dd>
                </div>
                <div className="rounded-md bg-violet-100/40 px-3 py-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    Confidence
                  </dt>
                  <dd className="font-mono font-semibold text-violet-900">
                    {debug.hybridRetrieval.retrievalMetrics.retrievalConfidence}
                    {debug.hybridRetrieval.retrievalMetrics
                      .lowRetrievalConfidence && (
                      <span className="ml-1 text-amber-700">
                        LOW_RETRIEVAL_CONFIDENCE
                      </span>
                    )}
                  </dd>
                </div>
                <div className="rounded-md bg-violet-100/40 px-3 py-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    Document coverage
                  </dt>
                  <dd className="font-mono font-semibold text-violet-900">
                    {debug.hybridRetrieval.retrievalMetrics.documentCoverage}
                  </dd>
                </div>
                <div className="rounded-md bg-violet-100/40 px-3 py-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    Topic coverage
                  </dt>
                  <dd className="font-mono font-semibold text-violet-900">
                    {debug.hybridRetrieval.retrievalMetrics.topicCoverage}
                  </dd>
                </div>
                <div className="rounded-md bg-violet-100/40 px-3 py-2">
                  <dt className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    BM25 index
                  </dt>
                  <dd className="font-semibold text-violet-900">
                    {debug.hybridRetrieval.retrievalMetrics.bm25IndexLoaded
                      ? "Loaded"
                      : "Missing"}
                  </dd>
                </div>
              </dl>

              <div className="mb-3 rounded-md bg-violet-100/30 px-3 py-2 text-xs text-violet-800">
                <p className="font-semibold">Planned queries</p>
                <ul className="mt-1 list-disc pl-4">
                  {debug.hybridRetrieval.retrievalPlan.queries.map((item) => (
                    <li key={`${item.label}-${item.query}`}>
                      <span className="font-medium">{item.label}:</span>{" "}
                      {item.query}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mb-3 grid gap-2 sm:grid-cols-3">
                <div className="rounded-md bg-violet-100/50 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    BM25 candidates
                  </p>
                  <p className="font-mono text-sm font-semibold text-violet-900">
                    {debug.hybridRetrieval.stageCounts.bm25ResultsCount}
                  </p>
                </div>
                <div className="rounded-md bg-violet-100/50 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    Vector candidates
                  </p>
                  <p className="font-mono text-sm font-semibold text-violet-900">
                    {debug.hybridRetrieval.stageCounts.vectorResultsCount}
                  </p>
                </div>
                <div className="rounded-md bg-violet-100/50 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    Fused / final
                  </p>
                  <p className="font-mono text-sm font-semibold text-violet-900">
                    {debug.hybridRetrieval.stageCounts.fusedResultsCount} →{" "}
                    {debug.hybridRetrieval.stageCounts.finalContextChunks}
                  </p>
                </div>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <div className="rounded-md bg-violet-100/50 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    BM25 latency
                  </p>
                  <p className="font-mono text-sm font-semibold text-violet-900">
                    {formatMs(debug.hybridRetrieval.retrievalMetrics.bm25Ms)}
                  </p>
                </div>
                <div className="rounded-md bg-violet-100/50 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    Vector latency
                  </p>
                  <p className="font-mono text-sm font-semibold text-violet-900">
                    {formatMs(debug.hybridRetrieval.retrievalMetrics.vectorMs)}
                  </p>
                </div>
                <div className="rounded-md bg-violet-100/50 px-3 py-2">
                  <p className="text-[10px] font-medium uppercase tracking-wide text-violet-500">
                    Fusion + rerank
                  </p>
                  <p className="font-mono text-sm font-semibold text-violet-900">
                    {formatMs(
                      debug.hybridRetrieval.retrievalMetrics.fusionMs +
                        debug.hybridRetrieval.retrievalMetrics.diversityMs +
                        debug.hybridRetrieval.retrievalMetrics.rerankMs +
                        debug.hybridRetrieval.retrievalMetrics.mergeMs,
                    )}
                  </p>
                </div>
              </div>

              <ul className="mt-3 space-y-2">
                {debug.hybridRetrieval.perQuery.map((entry) => (
                  <li
                    key={`${entry.label}-${entry.query}`}
                    className="rounded-md border border-violet-100 bg-white px-3 py-2 text-xs text-violet-900"
                  >
                    <p className="font-semibold">{entry.label}</p>
                    <p className="text-violet-700">{entry.query}</p>
                    <p className="mt-1 text-violet-600">
                      BM25 {entry.bm25Results.length} · Vector{" "}
                      {entry.vectorResults.length} · Fused{" "}
                      {entry.fusedResults.length}
                    </p>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section title={debug.hybridRetrieval ? "7 · Model Information" : "6 · Model Information"}>
            <dl className="grid gap-2 text-sm sm:grid-cols-1">
              <div className="flex flex-col gap-0.5 rounded-md bg-violet-100/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <dt className="text-xs font-medium uppercase tracking-wide text-violet-500">
                  Embedding model
                </dt>
                <dd className="font-mono text-xs font-semibold text-violet-900">
                  {debug.models.embeddingModel}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 rounded-md bg-violet-100/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <dt className="text-xs font-medium uppercase tracking-wide text-violet-500">
                  Vector database
                </dt>
                <dd className="font-mono text-xs font-semibold text-violet-900">
                  {debug.models.vectorDatabase}
                </dd>
              </div>
              <div className="flex flex-col gap-0.5 rounded-md bg-violet-100/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                <dt className="text-xs font-medium uppercase tracking-wide text-violet-500">
                  LLM model
                </dt>
                <dd className="font-mono text-xs font-semibold text-violet-900">
                  {debug.models.llmModel}
                </dd>
              </div>
            </dl>
          </Section>
        </div>
      )}
    </div>
  );
}
