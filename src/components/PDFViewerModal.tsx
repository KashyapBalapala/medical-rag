"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Document, Page } from "react-pdf";
import { Button } from "@/components/ui";
import { usePdfChunk } from "@/hooks/usePdfChunk";
import { useFocusTrap } from "@/hooks/useFocusTrap";
import {
  confidenceStyles,
  displayFilename,
  getConfidenceLevel,
} from "@/lib/chat-utils";
import { extractQueryTerms, highlightQueryTerms } from "@/lib/highlight-text";
import { buildPdfApiUrl } from "@/lib/pdf-url";
import "@/lib/react-pdf-setup";
import type { PdfViewerModalProps } from "@/types/evidence";
import { cn } from "@/lib/design-system";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin text-blue-600", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function LoadingPanel({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <Spinner className="h-8 w-8" />
      <p className="text-sm text-slate-600">{label}</p>
    </div>
  );
}

export default function PDFViewerModal({
  state,
  onClose,
  onNext,
  onPrev,
  canGoNext,
  canGoPrev,
}: PdfViewerModalProps) {
  const open = state !== null;
  const source = open ? state.sources[state.activeIndex] : null;
  const query = state?.query;

  const { data: chunkData, loading: chunkLoading, error: chunkError } =
    usePdfChunk(
      source?.file ?? null,
      source?.chunkIndex ?? null,
      open && source !== null,
    );

  const [numPages, setNumPages] = useState(0);
  const [pageNumber, setPageNumber] = useState(1);
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const [pageWidth, setPageWidth] = useState(680);
  const [copied, setCopied] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);

  useFocusTrap(dialogRef, open && source !== null);

  const pdfUrl = useMemo(
    () => (source ? buildPdfApiUrl(source.file) : null),
    [source],
  );

  useEffect(() => {
    function updateWidth() {
      setPageWidth(Math.min(window.innerWidth - 48, 680));
    }

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft" && canGoPrev) onPrev();
      if (event.key === "ArrowRight" && canGoNext) onNext();
      if (event.key === "PageUp") {
        event.preventDefault();
        setPageNumber((page) => Math.max(1, page - 1));
      }
      if (event.key === "PageDown") {
        event.preventDefault();
        setPageNumber((page) => Math.min(numPages || page, page + 1));
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, onNext, onPrev, canGoNext, canGoPrev, numPages]);

  useEffect(() => {
    setPdfLoading(true);
    setPdfError(null);
    setNumPages(0);
    setPageNumber(1);
  }, [source?.file, source?.chunkIndex]);

  useEffect(() => {
    if (chunkData?.pageNumber) {
      setPageNumber(chunkData.pageNumber);
    }
  }, [chunkData?.pageNumber, source?.file, source?.chunkIndex]);

  async function handleCopyEvidence() {
    await navigator.clipboard.writeText(chunkText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  if (!open || !source) return null;

  const level = getConfidenceLevel(source.score);
  const styles = confidenceStyles[level];
  const percent = Math.round(source.score * 100);
  const queryTerms = query ? extractQueryTerms(query) : [];
  const chunkText = chunkData?.content ?? source.excerpt;
  const activeIndex = state.activeIndex;
  const totalSources = state.sources.length;

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.button
            type="button"
            aria-label="Close PDF viewer"
            className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="pdf-viewer-title"
            aria-describedby="pdf-viewer-chunk"
            className="fixed inset-0 z-50 flex flex-col overflow-hidden bg-white sm:inset-2 sm:rounded-2xl sm:border sm:border-slate-200 sm:shadow-2xl md:inset-6 lg:inset-10"
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
          >
            <header className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  PDF Citation · Source {activeIndex + 1} of {totalSources}
                </p>
                <h2
                  id="pdf-viewer-title"
                  className="mt-0.5 truncate text-base font-semibold text-slate-900 sm:text-lg"
                >
                  {displayFilename(source.file)}
                </h2>
                <div className="mt-2 flex flex-wrap gap-2">
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
                      styles.badge,
                      styles.ring,
                    )}
                  >
                    {percent}% similarity
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    Chunk {source.chunkIndex}
                  </span>
                  {chunkLoading ? (
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                      Locating page…
                    </span>
                  ) : chunkData?.pageNumber ? (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-900">
                      Page {chunkData.pageNumber}
                      {chunkData.pageNumberEstimated ? " (estimated)" : ""}
                    </span>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close"
              >
                ✕
              </button>
            </header>

            <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
              <section className="flex min-h-[280px] flex-1 flex-col overflow-hidden bg-slate-100 lg:min-h-0">
                <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
                  <p className="text-xs font-medium text-slate-500">
                    Original document
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pageNumber <= 1 || pdfLoading}
                      onClick={() => setPageNumber((page) => Math.max(1, page - 1))}
                    >
                      Page −
                    </Button>
                    <span className="text-xs font-medium tabular-nums text-slate-600">
                      {pdfLoading ? "…" : `${pageNumber} / ${numPages || "?"}`}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={pdfLoading || pageNumber >= numPages}
                      onClick={() =>
                        setPageNumber((page) => Math.min(numPages, page + 1))
                      }
                    >
                      Page +
                    </Button>
                  </div>
                </div>

                <div className="flex-1 overflow-auto p-4">
                  {pdfError ? (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                      {pdfError}
                    </div>
                  ) : pdfUrl ? (
                    <div className="mx-auto flex max-w-3xl justify-center">
                      <Document
                        file={pdfUrl}
                        loading={<LoadingPanel label="Loading PDF…" />}
                        onLoadSuccess={({ numPages: total }) => {
                          setNumPages(total);
                          setPdfLoading(false);
                        }}
                        onLoadError={(error) => {
                          setPdfError(error.message || "Failed to load PDF");
                          setPdfLoading(false);
                        }}
                        className="rounded-lg shadow-md"
                      >
                        <Page
                          pageNumber={pageNumber}
                          loading={<LoadingPanel label="Rendering page…" />}
                          renderTextLayer
                          renderAnnotationLayer
                          className="overflow-hidden rounded-lg bg-white"
                          width={pageWidth}
                        />
                      </Document>
                    </div>
                  ) : null}
                </div>
              </section>

              <aside
                id="pdf-viewer-chunk"
                className="flex w-full flex-col border-t border-slate-200 bg-white lg:w-[min(100%,24rem)] lg:border-t-0 lg:border-l"
              >
                <div className="flex items-start justify-between gap-2 border-b border-slate-100 px-4 py-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Retrieved chunk
                    </p>
                    <p className="mt-1 text-sm text-slate-600">
                      Highlighted evidence for this citation
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => void handleCopyEvidence()}
                  >
                    {copied ? "Copied" : "Copy"}
                  </Button>
                </div>

                <div className="flex-1 overflow-y-auto px-4 py-4">
                  {chunkLoading ? (
                    <LoadingPanel label="Loading chunk evidence…" />
                  ) : chunkError ? (
                    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                      {chunkError}
                      <p className="mt-3 whitespace-pre-wrap rounded-lg bg-white/80 p-3 text-slate-700">
                        {source.excerpt}
                      </p>
                    </div>
                  ) : (
                    <>
                      {queryTerms.length > 0 && (
                        <div className="mb-4 flex flex-wrap gap-1.5">
                          {queryTerms.map((term) => (
                            <span
                              key={term}
                              className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-medium text-blue-800"
                            >
                              {term}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="rounded-xl border-2 border-amber-300 bg-amber-50/80 p-4 shadow-inner">
                        <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-800">
                          {highlightQueryTerms(chunkText, query)}
                        </p>
                      </div>

                      {chunkData?.pageNumber && (
                        <p className="mt-3 text-xs text-slate-500">
                          Evidence located on page {chunkData.pageNumber}
                          {chunkData.pageNumberEstimated
                            ? " (best match estimate)"
                            : ""}
                          . Use page controls to inspect surrounding context.
                        </p>
                      )}
                    </>
                  )}
                </div>
              </aside>
            </div>

            <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-slate-50 px-4 py-3 sm:px-5">
              <p className="text-xs text-slate-500">
                ← → sources · PgUp/PgDn pages · Esc close
              </p>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onPrev}
                  disabled={!canGoPrev}
                >
                  ← Previous Source
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={onNext}
                  disabled={!canGoNext}
                >
                  Next Source →
                </Button>
                <Button type="button" onClick={onClose}>
                  Close
                </Button>
              </div>
            </footer>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
