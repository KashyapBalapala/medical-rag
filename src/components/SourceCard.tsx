"use client";

import { motion, useReducedMotion } from "framer-motion";
import {
  confidenceStyles,
  displayFilename,
  getConfidenceLevel,
  truncatePreview,
} from "@/lib/chat-utils";
import type { SourceCardProps } from "@/types/evidence";
import { cn } from "@/lib/design-system";

const PREVIEW_LENGTH = 250;

export default function SourceCard({
  source,
  index = 0,
  onClick,
}: SourceCardProps) {
  const reducedMotion = useReducedMotion();
  const { file, score, chunkIndex, excerpt } = source;
  const citationNumber = index + 1;
  const percent = Math.round(score * 100);
  const level = getConfidenceLevel(score);
  const styles = confidenceStyles[level];
  const label = displayFilename(file);
  const preview = truncatePreview(excerpt, PREVIEW_LENGTH);

  return (
    <motion.button
      type="button"
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: reducedMotion ? 0 : index * 0.06,
        duration: reducedMotion ? 0 : 0.22,
      }}
      whileHover={reducedMotion ? undefined : { y: -2 }}
      whileTap={reducedMotion ? undefined : { scale: 0.99 }}
      onClick={() => onClick(source)}
      aria-label={`Inspect evidence ${citationNumber}: ${label}, ${percent} percent relevance, chunk ${chunkIndex}`}
      className={cn(
        "group w-full rounded-xl border border-slate-200/90 bg-white p-4 text-left shadow-sm",
        "transition-all hover:border-blue-200 hover:shadow-md hover:ring-1 hover:ring-blue-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40",
      )}
    >
      <div className="flex gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-50 text-red-600 transition group-hover:bg-blue-50 group-hover:text-blue-600">
          <span className="text-sm font-bold">{citationNumber}</span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-slate-900">
              {label}
            </p>
            <span
              className={cn(
                "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset",
                styles.badge,
                styles.ring,
              )}
            >
              <span className={cn("h-1 w-1 rounded-full", styles.dot)} />
              {level}
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
            <span className="font-medium text-slate-700">{percent}% relevance</span>
            <span className="text-slate-300">·</span>
            <span>Chunk {chunkIndex}</span>
          </div>
        </div>
      </div>

      {excerpt && (
        <div className="mt-3 border-t border-slate-100 pt-3">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            Evidence preview
          </p>
          <p className="mt-1.5 line-clamp-4 text-xs leading-relaxed text-slate-600">
            &ldquo;{preview}&rdquo;
          </p>
          <p className="mt-2 text-[11px] font-medium text-blue-600 opacity-70 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
            View source evidence →
          </p>
        </div>
      )}
    </motion.button>
  );
}
