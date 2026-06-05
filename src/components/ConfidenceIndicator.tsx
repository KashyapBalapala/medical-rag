"use client";

import { useState } from "react";
import {
  buildConfidenceTooltip,
  confidenceStyles,
  getConfidenceLevel,
} from "@/lib/chat-utils";
import type { CitationSource } from "@/types/chat";
import { cn } from "@/lib/design-system";

const SEGMENTS = 10;

type ConfidenceIndicatorProps = {
  percent: number;
  sources?: CitationSource[];
  className?: string;
};

function SegmentedBar({
  percent,
  filledClassName,
  emptyClassName,
}: {
  percent: number;
  filledClassName: string;
  emptyClassName: string;
}) {
  const filledCount = Math.round(Math.min(100, Math.max(0, percent)) / 10);

  return (
    <span
      className="font-mono text-sm leading-none tracking-tight"
      aria-hidden="true"
    >
      {Array.from({ length: SEGMENTS }, (_, index) => (
        <span
          key={index}
          className={index < filledCount ? filledClassName : emptyClassName}
        >
          {index < filledCount ? "█" : "░"}
        </span>
      ))}
    </span>
  );
}

export default function ConfidenceIndicator({
  percent,
  sources = [],
  className,
}: ConfidenceIndicatorProps) {
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const ungrounded = sources.length === 0;
  const normalizedPercent = ungrounded ? 0 : Math.min(100, Math.max(0, percent));
  const score = normalizedPercent / 100;
  const level = ungrounded ? "Low" : getConfidenceLevel(score);
  const styles = confidenceStyles[level];
  const tooltip = buildConfidenceTooltip(sources, normalizedPercent);
  const tooltipId = "confidence-tooltip";

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200/80 bg-white/80 p-3",
        ungrounded && "border-amber-200/80 bg-amber-50/40",
        className,
      )}
      role="meter"
      aria-valuenow={normalizedPercent}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-describedby={tooltipOpen ? tooltipId : undefined}
      aria-label={
        ungrounded
          ? "No retrieval evidence — confidence not available"
          : `Answer confidence ${normalizedPercent}%, ${styles.label}`
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Confidence
          </p>
          <div className="relative">
            <button
              type="button"
              aria-expanded={tooltipOpen}
              aria-describedby={tooltipId}
              onClick={() => setTooltipOpen((open) => !open)}
              className="flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-slate-400 ring-1 ring-slate-200 transition hover:bg-slate-50 hover:text-slate-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500"
              aria-label="How confidence is calculated"
            >
              i
            </button>
            {tooltipOpen && (
              <div
                id={tooltipId}
                role="tooltip"
                className="absolute bottom-full left-1/2 z-20 mb-2 w-64 -translate-x-1/2 rounded-lg border border-slate-200 bg-slate-900 px-3 py-2 text-[11px] leading-relaxed text-slate-100 shadow-lg"
              >
                {tooltip}
              </div>
            )}
          </div>
        </div>

        <span
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
            styles.badge,
            styles.ring,
          )}
        >
          <span className={cn("h-1.5 w-1.5 rounded-full", styles.dot)} />
          {ungrounded ? "No evidence" : styles.label}
        </span>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <SegmentedBar
          percent={normalizedPercent}
          filledClassName={styles.bar}
          emptyClassName={styles.barMuted}
        />
        <span className={cn("text-sm font-bold tabular-nums", styles.bar)}>
          {ungrounded ? "—" : `${normalizedPercent}%`}
        </span>
      </div>
    </div>
  );
}
