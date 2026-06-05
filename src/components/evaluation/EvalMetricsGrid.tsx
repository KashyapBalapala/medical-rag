"use client";

import { formatMs } from "@/lib/chat-utils";
import { cn } from "@/lib/design-system";

type EvalMetricsGridProps = {
  retrievalMs: number | null;
  generationMs: number | null;
  totalMs: number | null;
  topScore: number | null;
  avgScore: number | null;
  loading?: boolean;
};

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: "violet" | "cyan" | "emerald" | "amber";
}) {
  const accents = {
    violet: "border-violet-500/30 bg-violet-500/10 text-violet-200",
    cyan: "border-cyan-500/30 bg-cyan-500/10 text-cyan-200",
    emerald: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    amber: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  };

  return (
    <div
      className={cn(
        "rounded-xl border p-4",
        accents[accent],
      )}
    >
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">
        {label}
      </p>
      <p className="mt-1 font-mono text-2xl font-bold tabular-nums text-white">
        {value}
      </p>
    </div>
  );
}

export default function EvalMetricsGrid({
  retrievalMs,
  generationMs,
  totalMs,
  topScore,
  avgScore,
  loading = false,
}: EvalMetricsGridProps) {
  const dash = loading ? "…" : "—";

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <MetricCard
        label="Retrieval latency"
        value={retrievalMs != null ? formatMs(retrievalMs) : dash}
        accent="violet"
      />
      <MetricCard
        label="Generation latency"
        value={generationMs != null ? formatMs(generationMs) : dash}
        accent="cyan"
      />
      <MetricCard
        label="Total latency"
        value={totalMs != null ? formatMs(totalMs) : dash}
        accent="emerald"
      />
      <MetricCard
        label="Top similarity"
        value={topScore != null ? `${topScore}%` : dash}
        accent="amber"
      />
      <MetricCard
        label="Avg similarity"
        value={avgScore != null ? `${avgScore}%` : dash}
        accent="violet"
      />
    </div>
  );
}
