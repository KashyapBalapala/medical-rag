"use client";

import { displayFilename } from "@/lib/chat-utils";
import type { CitationSource } from "@/types/chat";
import { cn } from "@/lib/design-system";

type CitationPillsProps = {
  sources: CitationSource[];
  onSelect: (source: CitationSource) => void;
  className?: string;
};

export default function CitationPills({
  sources,
  onSelect,
  className,
}: CitationPillsProps) {
  if (sources.length === 0) return null;

  return (
    <div className={cn("mt-4", className)}>
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
        Evidence references
      </p>
      <ul className="mt-2 flex flex-wrap gap-2">
        {sources.map((source, index) => (
          <li key={`${source.file}-${source.chunkIndex}-${index}`}>
            <button
              type="button"
              onClick={() => onSelect(source)}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50/80 px-2.5 py-1",
                "text-left text-xs text-slate-700 transition",
                "hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800",
                "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500",
              )}
              aria-label={`Inspect evidence ${index + 1}: ${displayFilename(source.file)}, ${Math.round(source.score * 100)} percent match`}
            >
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold text-white">
                {index + 1}
              </span>
              <span className="truncate">{displayFilename(source.file)}</span>
              <span className="shrink-0 tabular-nums text-slate-400">
                {Math.round(source.score * 100)}%
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
