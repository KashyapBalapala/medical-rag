"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { displayFilename } from "@/lib/chat-utils";
import type { CitationSource } from "@/types/chat";
import { cn } from "@/lib/design-system";

type EvalAnswerPanelProps = {
  answer: string | null;
  sources: CitationSource[];
  loading?: boolean;
  prompt?: string | null;
};

export default function EvalAnswerPanel({
  answer,
  sources,
  loading,
  prompt,
}: EvalAnswerPanelProps) {
  const [promptOpen, setPromptOpen] = useState(false);

  return (
    <div className="space-y-4">
      {sources.length > 0 && (
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Source documents
          </h3>
          <ul className="mt-3 space-y-2">
            {sources.map((source, index) => (
              <li
                key={`${source.file}-${source.chunkIndex}`}
                className="flex items-start gap-3 rounded-lg border border-slate-700/60 bg-slate-800/40 px-3 py-2"
              >
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-violet-600/30 text-[10px] font-bold text-violet-300">
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-200">
                    {displayFilename(source.file)}
                  </p>
                  <p className="mt-0.5 font-mono text-[10px] text-slate-500">
                    chunk {source.chunkIndex} · {Math.round(source.score * 100)}% match
                  </p>
                  {source.excerpt && (
                    <p className="mt-1 line-clamp-2 text-xs text-slate-400">
                      {source.excerpt}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="rounded-xl border border-slate-700/80 bg-slate-900/60 p-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Final answer
        </h3>
        {loading ? (
          <p className="mt-3 text-sm text-slate-500">Generating answer…</p>
        ) : answer ? (
          <div
            className={cn(
              "prose prose-sm prose-invert mt-3 max-w-none",
              "prose-p:text-slate-300 prose-headings:text-slate-100",
            )}
          >
            <ReactMarkdown>{answer}</ReactMarkdown>
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            Run a test to see the model response
          </p>
        )}
      </div>

      {prompt && (
        <div className="rounded-xl border border-slate-700/80 bg-slate-900/60">
          <button
            type="button"
            onClick={() => setPromptOpen((open) => !open)}
            className="flex w-full items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Prompt construction
            </span>
            <span className="text-xs text-slate-500">{promptOpen ? "Hide" : "Show"}</span>
          </button>
          {promptOpen && (
            <pre className="max-h-64 overflow-auto border-t border-slate-700/80 px-4 py-3 font-mono text-[11px] leading-relaxed text-slate-400 whitespace-pre-wrap">
              {prompt}
            </pre>
          )}
        </div>
      )}
    </div>
  );
}
