"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import { formatMs } from "@/lib/chat-utils";
import type { SessionAnalytics } from "@/lib/session-analytics";
import { bucketValues } from "@/lib/session-analytics";
import type { SystemStats } from "@/lib/stats";
import { cn, ds } from "@/lib/design-system";

export type { SystemStats };

type RagAnalyticsDashboardProps = {
  stats: SystemStats | null;
  session: SessionAnalytics;
  loading?: boolean;
  error?: string | null;
  onRefresh?: () => void;
};

function MetricCard({
  label,
  value,
  hint,
  accent = "blue",
}: {
  label: string;
  value: string | number;
  hint?: string;
  accent?: "blue" | "cyan" | "emerald" | "violet" | "amber";
}) {
  const accentStyles = {
    blue: "from-blue-500/10 to-blue-600/5 ring-blue-500/10",
    cyan: "from-cyan-500/10 to-cyan-600/5 ring-cyan-500/10",
    emerald: "from-emerald-500/10 to-emerald-600/5 ring-emerald-500/10",
    violet: "from-violet-500/10 to-violet-600/5 ring-violet-500/10",
    amber: "from-amber-500/10 to-amber-600/5 ring-amber-500/10",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-gradient-to-br p-4 shadow-sm ring-1 ring-inset",
        accentStyles[accent],
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <p className="mt-1 truncate text-xl font-bold tabular-nums text-slate-900 sm:text-2xl">
        {value}
      </p>
      {hint && <p className="mt-1 text-[11px] text-slate-500">{hint}</p>}
    </div>
  );
}

function BarChart({
  title,
  subtitle,
  items,
  valueSuffix = "",
}: {
  title: string;
  subtitle?: string;
  items: Array<{ label: string; value: number; display?: string }>;
  valueSuffix?: string;
}) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>}
      </div>
      <div className="space-y-3">
        {items.map((item) => (
          <div key={item.label}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium text-slate-600">{item.label}</span>
              <span className="tabular-nums text-slate-500">
                {item.display ?? `${item.value}${valueSuffix}`}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
                style={{ width: `${Math.max(4, (item.value / max) * 100)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StackedLatencyChart({
  retrievalMs,
  generationMs,
}: {
  retrievalMs: number | null;
  generationMs: number | null;
}) {
  const retrieval = retrievalMs ?? 0;
  const generation = generationMs ?? 0;
  const total = Math.max(retrieval + generation, 1);
  const retrievalPercent = Math.round((retrieval / total) * 100);
  const generationPercent = 100 - retrievalPercent;

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">
        Average latency breakdown
      </h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Share of end-to-end response time
      </p>

      <div className="mt-4 flex h-4 overflow-hidden rounded-full">
        <div
          className="bg-blue-500 transition-all duration-500"
          style={{ width: `${retrievalPercent}%` }}
          title={`Retrieval ${retrievalPercent}%`}
        />
        <div
          className="bg-cyan-500 transition-all duration-500"
          style={{ width: `${generationPercent}%` }}
          title={`Generation ${generationPercent}%`}
        />
      </div>

      <div className="mt-3 flex flex-wrap gap-4 text-xs">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-blue-500" />
          <span className="text-slate-600">
            Retrieval{" "}
            <span className="font-semibold text-slate-900">
              {retrievalMs != null ? formatMs(retrievalMs) : "—"}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-cyan-500" />
          <span className="text-slate-600">
            Generation{" "}
            <span className="font-semibold text-slate-900">
              {generationMs != null ? formatMs(generationMs) : "—"}
            </span>
          </span>
        </div>
      </div>
    </div>
  );
}

function SparklineChart({
  title,
  values,
  suffix = "",
}: {
  title: string;
  values: number[];
  suffix?: string;
}) {
  const width = 280;
  const height = 72;
  const max = Math.max(...values, 1);
  const points =
    values.length === 0
      ? ""
      : values
          .map((value, index) => {
            const x = (index / Math.max(values.length - 1, 1)) * width;
            const y = height - (value / max) * (height - 8) - 4;
            return `${x},${y}`;
          })
          .join(" ");

  return (
    <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-slate-900">{title}</h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Last {values.length || 0} answers in this session
      </p>

      {values.length === 0 ? (
        <p className="mt-6 text-sm text-slate-400">No data yet</p>
      ) : (
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="mt-3 h-20 w-full text-blue-600"
          preserveAspectRatio="none"
          aria-hidden
        >
          <defs>
            <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon
            fill="url(#sparkFill)"
            points={`0,${height} ${points} ${width},${height}`}
          />
          <polyline
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
            points={points}
          />
        </svg>
      )}

      {values.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          Latest:{" "}
          <span className="font-semibold text-slate-800">
            {values[values.length - 1]}
            {suffix}
          </span>
        </p>
      )}
    </div>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden="true"
    >
      <path d="M4 4v5h5M20 20v-5h-5" />
      <path d="M20.49 9A9 9 0 0 0 5.64 5.64L4 4M3.51 15a9 9 0 0 0 14.85 4.36L20 20" />
    </svg>
  );
}

export default function RagAnalyticsDashboard({
  stats,
  session,
  loading = false,
  error = null,
  onRefresh,
}: RagAnalyticsDashboardProps) {
  const [open, setOpen] = useState(false);

  const similarityBuckets = bucketValues(session.similarityScores, [
    { label: "Low (<70%)", min: 0, max: 70 },
    { label: "Medium (70–84%)", min: 70, max: 85 },
    { label: "High (≥85%)", min: 85, max: 101 },
  ]);

  const responseChartItems = session.responseTimesMs.map((ms, index) => ({
    label: `Q${index + 1}`,
    value: ms,
    display: formatMs(ms),
  }));

  return (
    <section className={cn(ds.layout.section, "pb-2 pt-3")}>
      <div className={cn(ds.layout.container)}>
        <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-blue-50/40 px-4 py-3 sm:px-5">
            <button
              type="button"
              onClick={() => setOpen((value) => !value)}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
              aria-expanded={open}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 text-xs font-bold text-white shadow-sm">
                RAG
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  RAG Analytics Dashboard
                </p>
                <p className="truncate text-xs text-slate-500">
                  {stats
                    ? `${stats.documentCount} documents · ${stats.totalChunks} chunks · ${session.queriesProcessed} queries this session`
                    : "Pipeline metrics & session performance"}
                </p>
              </div>
              <span
                className={cn(
                  "ml-auto shrink-0 text-slate-400 transition-transform duration-200",
                  open && "rotate-180",
                )}
                aria-hidden
              >
                ▾
              </span>
            </button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRefresh}
              disabled={loading}
              className="shrink-0 gap-1.5"
            >
              <RefreshIcon
                className={cn("h-4 w-4", loading && "animate-spin")}
              />
              Refresh
            </Button>
          </div>

          <div
            className={cn(
              "grid transition-[grid-template-rows] duration-300 ease-in-out",
              open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
            )}
          >
            <div className="overflow-hidden">
              <div className="space-y-5 px-4 py-5 sm:px-5">
                {error && (
                  <div
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
                  >
                    {error}
                  </div>
                )}

                {loading && !stats ? (
                  <p className="text-sm text-slate-500">Loading analytics…</p>
                ) : (
                  <>
                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Index & models
                      </p>
                      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
                        <MetricCard
                          label="Documents Indexed"
                          value={stats?.documentCount ?? "—"}
                          accent="blue"
                        />
                        <MetricCard
                          label="Total Chunks"
                          value={stats?.totalChunks ?? "—"}
                          accent="cyan"
                        />
                        <MetricCard
                          label="Embedding Model"
                          value={stats?.embeddingModel ?? "—"}
                          hint="Query & document vectors"
                          accent="violet"
                        />
                        <MetricCard
                          label="LLM Model"
                          value={stats?.llm ?? "—"}
                          hint="Answer generation"
                          accent="emerald"
                        />
                        <MetricCard
                          label="Vector Store"
                          value={stats?.vectorStore ?? "—"}
                          hint={stats?.chromaEndpoint}
                          accent="amber"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Session performance
                      </p>
                      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                        <MetricCard
                          label="Avg Retrieval Time"
                          value={
                            session.avgRetrievalMs != null
                              ? formatMs(session.avgRetrievalMs)
                              : "—"
                          }
                          hint={
                            session.hasEstimatedTimings ? "Estimated" : "Measured"
                          }
                          accent="blue"
                        />
                        <MetricCard
                          label="Avg Generation Time"
                          value={
                            session.avgGenerationMs != null
                              ? formatMs(session.avgGenerationMs)
                              : "—"
                          }
                          hint={
                            session.hasEstimatedTimings ? "Estimated" : "Measured"
                          }
                          accent="cyan"
                        />
                        <MetricCard
                          label="Avg Response Time"
                          value={
                            session.avgResponseMs != null
                              ? formatMs(session.avgResponseMs)
                              : "—"
                          }
                          accent="violet"
                        />
                        <MetricCard
                          label="Queries Processed"
                          value={session.queriesProcessed}
                          hint="This browser session"
                          accent="emerald"
                        />
                        <MetricCard
                          label="Ungrounded Answers"
                          value={session.ungroundedAnswers}
                          hint="No retrieved citations"
                          accent="amber"
                        />
                        <MetricCard
                          label="Avg Similarity Score"
                          value={
                            session.avgSimilarityScore != null
                              ? `${session.avgSimilarityScore}%`
                              : "—"
                          }
                          hint="Mean retrieval relevance"
                          accent="amber"
                        />
                      </div>
                    </div>

                    <div>
                      <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Charts
                      </p>
                      <div className="grid gap-4 lg:grid-cols-2">
                        <StackedLatencyChart
                          retrievalMs={session.avgRetrievalMs}
                          generationMs={session.avgGenerationMs}
                        />
                        <BarChart
                          title="Confidence distribution"
                          subtitle="Answer similarity buckets"
                          items={similarityBuckets.map((bucket) => ({
                            label: bucket.label,
                            value: bucket.count,
                            display: `${bucket.count} (${bucket.percent}%)`,
                          }))}
                        />
                        <BarChart
                          title="Response time per query"
                          subtitle="End-to-end latency by question order"
                          items={responseChartItems}
                        />
                        <SparklineChart
                          title="Similarity trend"
                          values={session.similarityScores}
                          suffix="%"
                        />
                      </div>
                    </div>

                    {session.hasEstimatedTimings && session.queriesProcessed > 0 && (
                      <p className="text-[11px] text-slate-400">
                        * Timing averages are estimated from total response latency
                        unless RAG Debug Mode returned server-side breakdowns.
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
