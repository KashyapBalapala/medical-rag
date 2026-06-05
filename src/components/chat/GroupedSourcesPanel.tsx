"use client";

import SourceCard from "@/components/SourceCard";
import { groupSourcesByDocument } from "@/lib/research-mode";
import type { CitationSource } from "@/types/chat";
import { cn } from "@/lib/design-system";

type GroupedSourcesPanelProps = {
  sources: CitationSource[];
  onSelect: (source: CitationSource) => void;
  className?: string;
};

export default function GroupedSourcesPanel({
  sources,
  onSelect,
  className,
}: GroupedSourcesPanelProps) {
  const groups = groupSourcesByDocument(sources);

  if (groups.length === 0) return null;

  let citationIndex = 0;

  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Sources by document
        </p>
        <p className="text-[11px] text-slate-400">
          {groups.length} document{groups.length === 1 ? "" : "s"} ·{" "}
          {sources.length} citation{sources.length === 1 ? "" : "s"}
        </p>
      </div>

      {groups.map((group) => (
        <section
          key={group.file}
          className="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/50"
        >
          <header className="flex items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-4 py-2.5">
            <h4 className="truncate text-sm font-semibold text-slate-900">
              {group.displayName}
            </h4>
            <span className="shrink-0 rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-semibold text-indigo-700">
              {Math.round(group.avgScore * 100)}% avg match
            </span>
          </header>
          <ul className="space-y-2 p-3">
            {group.sources.map((source) => {
              const index = citationIndex++;
              return (
                <li key={`${source.file}-${source.chunkIndex}-${index}`}>
                  <SourceCard
                    source={source}
                    index={index}
                    onClick={onSelect}
                  />
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
