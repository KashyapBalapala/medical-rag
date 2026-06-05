"use client";

import { motion, useReducedMotion } from "framer-motion";
import MarkdownContent from "@/components/chat/MarkdownContent";
import SourceCard from "@/components/SourceCard";
import ConfidenceIndicator from "@/components/ConfidenceIndicator";
import RagDebugPanel from "@/components/chat/RagDebugPanel";
import AnswerExplainability from "@/components/chat/AnswerExplainability";
import CitationPills from "@/components/chat/CitationPills";
import ErrorAnswerCard from "@/components/chat/ErrorAnswerCard";
import UngroundedBanner from "@/components/chat/UngroundedBanner";
import ComparisonCard from "@/components/chat/ComparisonCard";
import GroupedSourcesPanel from "@/components/chat/GroupedSourcesPanel";
import ResearchAnswerContent from "@/components/chat/ResearchAnswerContent";
import { formatMs, formatTimestamp } from "@/lib/chat-utils";
import type { ChatMessage, CitationSource } from "@/types/chat";
import type { SourceOpenPayload } from "@/types/evidence";
import { cn, ds } from "@/lib/design-system";

type AnswerCardProps = {
  message: ChatMessage;
  debugMode: boolean;
  onOpenSource: (payload: SourceOpenPayload) => void;
  onRetry?: (question: string) => void;
};

function MetricPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-1.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="text-xs font-semibold tabular-nums text-slate-800">{value}</p>
    </div>
  );
}

export default function AnswerCard({
  message,
  debugMode,
  onOpenSource,
  onRetry,
}: AnswerCardProps) {
  const reducedMotion = useReducedMotion();
  const sources = message.sources ?? [];
  const question = message.question ?? message.debug?.question;
  const confidence = message.confidence ?? 0;
  const timings = message.timings;
  const ungrounded = sources.length === 0;
  const researchMode = message.researchMode === true;
  const comparisonMode =
    message.comparisonMode === true &&
    (message.comparisonTopics?.length ?? 0) >= 2;
  const timestamp = message.createdAt
    ? formatTimestamp(message.createdAt)
    : "—";

  function handleOpenSource(source: CitationSource) {
    onOpenSource({
      source,
      sources,
      query: question,
      retrievedAt: message.createdAt,
    });
  }

  if (message.error) {
    return (
      <ErrorAnswerCard
        content={message.content}
        onRetry={
          message.retryQuestion && onRetry
            ? () => onRetry(message.retryQuestion!)
            : undefined
        }
      />
    );
  }

  return (
    <motion.article
      initial={reducedMotion ? false : { opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.25 }}
      className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm ring-1 ring-slate-100"
    >
      <div
        className={cn(
          "border-b border-slate-100 px-4 py-3 sm:px-5",
          comparisonMode
            ? "bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/60"
            : researchMode
              ? "bg-gradient-to-r from-indigo-50/90 via-white to-violet-50/60"
              : "bg-gradient-to-r from-white via-slate-50/80 to-blue-50/30",
        )}
      >
        <div className="flex items-center gap-2.5">
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-xl text-xs font-bold text-white shadow-sm",
              comparisonMode || researchMode
                ? "bg-gradient-to-br from-indigo-600 to-violet-600"
                : "bg-gradient-to-br from-blue-600 to-cyan-600",
            )}
            aria-hidden
          >
            {comparisonMode ? "C" : researchMode ? "R" : "AI"}
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">
              {comparisonMode
                ? "Condition Comparison"
                : researchMode
                  ? "Multi-Document Research"
                  : "Research Assistant"}
            </p>
            <p className="text-xs text-slate-500">
              {ungrounded
                ? "Ungrounded response"
                : comparisonMode
                  ? "Compared across multiple documents"
                  : researchMode
                    ? "Synthesized across documents"
                    : "Evidence-backed answer"}
            </p>
          </div>
          <div className="ml-auto flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            {comparisonMode && (
              <span className="rounded-full bg-violet-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-violet-700">
                Comparison
              </span>
            )}
            {researchMode && !comparisonMode && (
              <span className="rounded-full bg-indigo-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
                Research
              </span>
            )}
            {(message.memory?.used ?? message.debug?.memory?.used) && (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
                Memory ·{" "}
                {message.memory?.messagesIncluded ??
                  message.debug?.memory?.messagesIncluded ??
                  0}
              </span>
            )}
          </div>
        </div>

        <ConfidenceIndicator
          className="mt-3"
          percent={confidence}
          sources={sources}
        />

        {timings && (
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <MetricPill label="Generated" value={timestamp} />
            <MetricPill
              label="Retrieval"
              value={`${formatMs(timings.retrievalMs)}${timings.estimated ? "*" : ""}`}
            />
            <MetricPill
              label="Generation"
              value={`${formatMs(timings.generationMs)}${timings.estimated ? "*" : ""}`}
            />
            <MetricPill label="Total" value={formatMs(timings.totalMs)} />
          </div>
        )}
      </div>

      <div className="px-4 py-4 sm:px-5 sm:py-5">
        {ungrounded && <UngroundedBanner className="mb-4" />}

        {comparisonMode ? (
          <ComparisonCard
            content={message.content}
            topics={message.comparisonTopics ?? []}
            topicSources={message.topicSources}
            sources={sources}
            onOpenSource={handleOpenSource}
          />
        ) : researchMode ? (
          <ResearchAnswerContent content={message.content} />
        ) : (
          <MarkdownContent content={message.content} />
        )}

        {sources.length > 0 && !comparisonMode && (
          <CitationPills sources={sources} onSelect={handleOpenSource} />
        )}

        {sources.length > 0 && researchMode && !comparisonMode && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <GroupedSourcesPanel
              sources={sources}
              onSelect={handleOpenSource}
            />
          </div>
        )}

        {sources.length > 0 && !researchMode && !comparisonMode && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className={ds.typography.label}>Sources</p>
              <p className="text-[11px] text-slate-400">
                {sources.length} citation{sources.length === 1 ? "" : "s"}
              </p>
            </div>
            <ul className="mt-3 space-y-2">
              {sources.map((source, index) => (
                <li key={`${source.file}-${source.chunkIndex}-${index}`}>
                  <SourceCard
                    source={source}
                    index={index}
                    onClick={handleOpenSource}
                  />
                </li>
              ))}
            </ul>
          </div>
        )}

        <AnswerExplainability
          question={question ?? ""}
          sources={sources}
          onSelectSource={handleOpenSource}
        />

        {debugMode && message.debug && (
          <RagDebugPanel debug={message.debug} />
        )}

        {timings?.estimated && !debugMode && (
          <p className="mt-3 text-[10px] text-slate-400">
            * Timing breakdown estimated unless RAG Debug Mode is enabled.
          </p>
        )}
      </div>
    </motion.article>
  );
}
