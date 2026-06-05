"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button, EvidenceSkeleton } from "@/components/ui";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import { usePdfChunk } from "@/hooks/usePdfChunk";
import {
  confidenceStyles,
  displayFilename,
  getConfidenceLevel,
} from "@/lib/chat-utils";
import {
  formatRetrievalTimestamp,
  formatSourceType,
  getSourceType,
} from "@/lib/evidence-utils";
import { highlightQueryTerms } from "@/lib/highlight-text";
import type { EvidenceDrawerProps } from "@/types/evidence";
import { cn } from "@/lib/design-system";

const COLLAPSED_CHAR_LIMIT = 720;

function MetaRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="shrink-0 text-xs font-medium text-slate-500">{label}</dt>
      <dd className="text-right text-xs font-semibold text-slate-800">{value}</dd>
    </div>
  );
}

export default function EvidenceDrawer({
  state,
  onClose,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
  onViewPdf,
}: EvidenceDrawerProps) {
  const open = state !== null;
  const source = open ? state.sources[state.activeIndex] : null;
  const drawerRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const { data: chunkData, loading, error } = usePdfChunk(
    source?.file ?? null,
    source?.chunkIndex ?? null,
    open && source !== null,
  );

  useFocusTrap(drawerRef, open && source !== null);

  useEffect(() => {
    setExpanded(false);
    setCopied(false);
  }, [source?.file, source?.chunkIndex]);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && canGoPrev) onPrev();
      if (event.key === "ArrowRight" && canGoNext) onNext();
    }

    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, onNext, onPrev, canGoNext, canGoPrev]);

  if (!open || !source || !state) return null;

  const fullContent = chunkData?.content ?? source.excerpt;
  const isTruncatable = fullContent.length > COLLAPSED_CHAR_LIMIT;
  const displayContent =
    expanded || !isTruncatable
      ? fullContent
      : `${fullContent.slice(0, COLLAPSED_CHAR_LIMIT).trimEnd()}…`;

  const level = getConfidenceLevel(source.score);
  const styles = confidenceStyles[level];
  const percent = Math.round(source.score * 100);
  const rank = state.activeIndex + 1;
  const total = state.sources.length;
  const sourceType = getSourceType(source.file);

  async function handleCopy() {
    await navigator.clipboard.writeText(fullContent);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close evidence drawer"
            className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          <motion.aside
            ref={drawerRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="evidence-drawer-title"
            aria-describedby="evidence-drawer-content"
            className={cn(
              "fixed inset-y-0 right-0 z-50 flex w-full flex-col",
              "border-l border-slate-200/90 bg-white shadow-2xl",
              "sm:w-[500px] sm:max-w-[500px]",
            )}
            initial={reducedMotion ? false : { x: "100%" }}
            animate={{ x: 0 }}
            exit={reducedMotion ? undefined : { x: "100%" }}
            transition={
              reducedMotion
                ? { duration: 0 }
                : { type: "spring", damping: 28, stiffness: 320 }
            }
          >
            <header className="shrink-0 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-blue-50/40 px-4 py-4 sm:px-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-blue-600">
                    Source Evidence
                  </p>
                  <h2
                    id="evidence-drawer-title"
                    className="mt-1 truncate text-base font-bold text-slate-900"
                  >
                    {displayFilename(source.file)}
                  </h2>
                  <p className="mt-1 text-xs text-slate-500">
                    Retrieval rank {rank} of {total}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close drawer"
                  className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                    aria-hidden
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onPrev}
                  disabled={!canGoPrev}
                  aria-label="Previous source"
                >
                  ← Prev
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={onNext}
                  disabled={!canGoNext}
                  aria-label="Next source"
                >
                  Next →
                </Button>
                {onViewPdf && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => onViewPdf(source)}
                    className="ml-auto"
                  >
                    View PDF
                  </Button>
                )}
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-4 py-5 sm:px-5">
              <section className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Document Information
                </h3>
                <dl className="mt-2 divide-y divide-slate-200/80">
                  <MetaRow label="Filename" value={displayFilename(source.file)} />
                  <MetaRow label="Chunk index" value={source.chunkIndex} />
                  <MetaRow
                    label="Relevance score"
                    value={
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1 ring-inset",
                          styles.badge,
                          styles.ring,
                        )}
                      >
                        {percent}%
                      </span>
                    }
                  />
                  <MetaRow label="Retrieval rank" value={`#${rank}`} />
                </dl>
              </section>

              <section className="mt-4">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Retrieved Evidence
                  </h3>
                  {loading && (
                    <span className="text-[11px] text-slate-400">Loading…</span>
                  )}
                </div>

                {error && (
                  <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                    {error}
                  </p>
                )}

                <div
                  id="evidence-drawer-content"
                  aria-busy={loading}
                  className={cn(
                    "mt-3 rounded-xl border border-slate-200 bg-white p-4",
                    expanded ? "max-h-none" : "max-h-[min(50vh,420px)] overflow-y-auto",
                  )}
                >
                  {loading && !chunkData ? (
                    <EvidenceSkeleton lines={10} />
                  ) : (
                    <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-relaxed text-slate-700">
                      {highlightQueryTerms(displayContent, state.query)}
                    </pre>
                  )}
                </div>

                {isTruncatable && (
                  <button
                    type="button"
                    onClick={() => setExpanded((value) => !value)}
                    className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-800 focus:outline-none focus:underline"
                  >
                    {expanded ? "Show less" : "Expand full content"}
                  </button>
                )}
              </section>

              <section className="mt-4 rounded-xl border border-slate-200/90 bg-white p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Metadata
                </h3>
                <dl className="mt-2 divide-y divide-slate-200/80">
                  <MetaRow
                    label="Similarity score"
                    value={`${source.score.toFixed(4)} (${percent}%)`}
                  />
                  <MetaRow
                    label="Retrieval timestamp"
                    value={formatRetrievalTimestamp(state.retrievedAt)}
                  />
                  <MetaRow
                    label="Source type"
                    value={formatSourceType(sourceType)}
                  />
                  {chunkData?.pageNumber != null && (
                    <MetaRow
                      label="Estimated page"
                      value={
                        chunkData.pageNumberEstimated
                          ? `~${chunkData.pageNumber}`
                          : String(chunkData.pageNumber)
                      }
                    />
                  )}
                </dl>
              </section>
            </div>

            <footer className="shrink-0 border-t border-slate-200 bg-slate-50/80 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-5">
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => void handleCopy()}>
                  {copied ? "Copied!" : "Copy evidence"}
                </Button>
                {isTruncatable && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setExpanded((value) => !value)}
                  >
                    {expanded ? "Collapse" : "Expand full content"}
                  </Button>
                )}
              </div>
            </footer>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
