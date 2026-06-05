"use client";

import { useMemo } from "react";
import MarkdownContent from "@/components/chat/MarkdownContent";
import SourceCard from "@/components/SourceCard";
import { SourceBadge } from "@/components/ui";
import { parseComparisonMarkdown } from "@/lib/comparison-parser";
import type { CitationSource } from "@/types/chat";
import type { TopicSourceGroup } from "@/types/comparison";
import { cn } from "@/lib/design-system";

type ComparisonCardProps = {
  content: string;
  topics: string[];
  topicSources?: TopicSourceGroup[];
  sources: CitationSource[];
  onOpenSource: (source: CitationSource) => void;
  className?: string;
};

const TOPIC_COLORS = [
  {
    border: "border-blue-200",
    header: "from-blue-50 to-cyan-50/80",
    badge: "bg-blue-100 text-blue-800",
    accent: "text-blue-900",
  },
  {
    border: "border-violet-200",
    header: "from-violet-50 to-fuchsia-50/80",
    badge: "bg-violet-100 text-violet-800",
    accent: "text-violet-900",
  },
] as const;

export default function ComparisonCard({
  content,
  topics,
  topicSources = [],
  sources,
  onOpenSource,
  className,
}: ComparisonCardProps) {
  const parsed = useMemo(
    () => parseComparisonMarkdown(content, topics),
    [content, topics],
  );

  return (
    <div className={cn("space-y-6", className)}>
      <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 px-4 py-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
          Multi-Document Comparison
        </p>
        <p className="mt-1 text-sm text-slate-600">
          Side-by-side synthesis from {topics.length} medical topics across your
          document library.
        </p>
      </div>

      <div
        className={cn(
          "grid gap-4",
          parsed.topics.length > 1 ? "md:grid-cols-2" : "grid-cols-1",
        )}
        role="list"
        aria-label="Compared medical topics"
      >
        {parsed.topics.map((topicData, index) => {
          const palette = TOPIC_COLORS[index % TOPIC_COLORS.length];
          const topicGroup = topicSources.find(
            (group) => group.topic === topicData.topic,
          );

          return (
            <article
              key={topicData.topic}
              role="listitem"
              aria-labelledby={`comparison-topic-${topicData.topic}`}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl border bg-white shadow-sm",
                palette.border,
              )}
            >
              <header
                className={cn(
                  "border-b px-4 py-3 sm:px-5",
                  palette.border,
                  `bg-gradient-to-r ${palette.header}`,
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <h3
                    id={`comparison-topic-${topicData.topic}`}
                    className={cn(
                      "text-base font-bold tracking-tight",
                      palette.accent,
                    )}
                  >
                    {topicData.displayName}
                  </h3>
                  {topicGroup && topicGroup.sources.length > 0 && (
                    <span
                      className={cn(
                        "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide",
                        palette.badge,
                      )}
                    >
                      {topicGroup.sources.length} source
                      {topicGroup.sources.length === 1 ? "" : "s"}
                    </span>
                  )}
                </div>
              </header>

              <div className="flex-1 space-y-4 px-4 py-4 sm:px-5">
                {topicData.sections.length === 0 ? (
                  <p className="text-sm text-slate-500">
                    No structured sections were returned for this topic.
                  </p>
                ) : (
                  topicData.sections.map((section) => (
                    <section key={`${topicData.topic}-${section.title}`}>
                      <h4 className="mb-2 text-sm font-semibold text-slate-800">
                        {section.title}
                      </h4>
                      <MarkdownContent
                        content={section.content}
                        className="prose-sm prose-p:my-1 prose-ul:my-1 prose-li:my-0"
                      />
                    </section>
                  ))
                )}
              </div>

              {topicGroup && topicGroup.files.length > 0 && (
                <footer className="border-t border-slate-100 bg-slate-50/60 px-4 py-3 sm:px-5">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    Sources for {topicData.displayName}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {topicGroup.files.map((file) => (
                      <SourceBadge key={file} label={file} />
                    ))}
                  </div>
                </footer>
              )}
            </article>
          );
        })}
      </div>

      {parsed.keyDifferences && (
        <section className="overflow-hidden rounded-2xl border border-amber-200/80 bg-white shadow-sm">
          <header className="border-b border-amber-100 bg-gradient-to-r from-amber-50 to-orange-50/60 px-4 py-3 sm:px-5">
            <h3 className="text-base font-bold text-amber-950">
              Key Differences
            </h3>
          </header>
          <div className="overflow-x-auto px-4 py-4 sm:px-5">
            <MarkdownContent
              content={parsed.keyDifferences}
              className="research-answer prose-table:my-0 prose-th:bg-amber-50/80 prose-th:text-amber-950"
            />
          </div>
        </section>
      )}

      {topicSources.length > 0 && (
        <section className="space-y-4 border-t border-slate-100 pt-5">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Citations by topic
            </p>
            <p className="text-[11px] text-slate-400">
              {sources.length} total citation{sources.length === 1 ? "" : "s"}
            </p>
          </div>

          {topicSources.map((group) => (
            <div
              key={group.topic}
              className="overflow-hidden rounded-xl border border-slate-200/90 bg-slate-50/40"
            >
              <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 bg-white px-4 py-2.5">
                <h4 className="text-sm font-semibold text-slate-900">
                  Sources for {group.displayName}
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {group.files.map((file) => {
                    const match = group.sources.find(
                      (item) =>
                        item.file.endsWith(file) || item.file.includes(file),
                    );
                    return (
                      <SourceBadge
                        key={file}
                        label={file}
                        onClick={
                          match ? () => onOpenSource(match) : undefined
                        }
                      />
                    );
                  })}
                </div>
              </header>
              <ul className="space-y-2 p-3">
                {group.sources.map((source, index) => (
                  <li key={`${group.topic}-${source.file}-${source.chunkIndex}`}>
                    <SourceCard
                      source={source}
                      index={index}
                      onClick={onOpenSource}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>
      )}
    </div>
  );
}
