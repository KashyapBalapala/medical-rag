"use client";

import { useMemo, useState, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  buildExplainabilityData,
  type ExplainabilityData,
} from "@/lib/explainability";
import { displayFilename, truncatePreview } from "@/lib/chat-utils";
import type { CitationSource } from "@/types/chat";
import { cn } from "@/lib/design-system";

type AnswerExplainabilityProps = {
  question: string;
  sources: CitationSource[];
  onSelectSource?: (source: CitationSource) => void;
};

type AccordionSectionProps = {
  title: string;
  sectionKey: string;
  openSection: string | null;
  onToggle: (key: string) => void;
  children: ReactNode;
  index: number;
};

const PIPELINE_STEPS = [
  { key: "question", label: "Question" },
  { key: "retrieval", label: "Retrieval" },
  { key: "evidence", label: "Evidence" },
  { key: "llm", label: "LLM" },
  { key: "answer", label: "Answer" },
] as const;

function PipelineVisualization() {
  return (
    <ol className="flex flex-col items-center py-2" aria-label="RAG pipeline steps">
      {PIPELINE_STEPS.map((step, index) => (
        <li key={step.key} className="flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.08 }}
            className="flex min-w-[140px] items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 shadow-sm"
          >
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white"
              aria-hidden
            >
              {index + 1}
            </span>
            <span className="text-sm font-semibold text-blue-900">
              {step.label}
            </span>
          </motion.div>
          {index < PIPELINE_STEPS.length - 1 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: index * 0.08 + 0.04 }}
              className="flex flex-col items-center py-1 text-blue-400"
              aria-hidden
            >
              <span className="h-4 w-px bg-blue-300" />
              <span className="text-xs">↓</span>
            </motion.div>
          )}
        </li>
      ))}
    </ol>
  );
}

function AccordionSection({
  title,
  sectionKey,
  openSection,
  onToggle,
  children,
  index,
}: AccordionSectionProps) {
  const isOpen = openSection === sectionKey;

  return (
    <div className="overflow-hidden rounded-lg border border-slate-200/90 bg-white">
      <button
        type="button"
        onClick={() => onToggle(sectionKey)}
        aria-expanded={isOpen}
        className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-slate-50"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-700">
            {index + 1}
          </span>
          <span className="text-sm font-semibold text-slate-800">{title}</span>
        </div>
        <motion.span
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-slate-400"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="border-t border-slate-100 px-4 py-3">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function RetrievedSourcesSection({
  sources,
  data,
}: {
  sources: CitationSource[];
  data: ExplainabilityData;
}) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-slate-500">No sources were retrieved.</p>
    );
  }

  return (
    <ul className="space-y-2">
      {data.chunks.map((chunk, index) => (
        <li
          key={`${chunk.file}-${chunk.chunkIndex}-${index}`}
          className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-sm"
        >
          <div className="min-w-0">
            <p className="truncate font-medium text-slate-900">{chunk.file}</p>
            <p className="text-xs text-slate-500">Chunk {chunk.chunkIndex}</p>
          </div>
          <span className="shrink-0 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
            {Math.round(chunk.score * 100)}% match
          </span>
        </li>
      ))}
    </ul>
  );
}

function EvidenceUsedSection({
  sources,
  onSelectSource,
}: {
  sources: CitationSource[];
  onSelectSource?: (source: CitationSource) => void;
}) {
  if (sources.length === 0) {
    return (
      <p className="text-sm text-slate-500">No evidence chunks available.</p>
    );
  }

  return (
    <ul className="space-y-3">
      {sources.map((source, index) => (
        <li key={`${source.file}-${source.chunkIndex}-${index}`}>
          <button
            type="button"
            onClick={() => onSelectSource?.(source)}
            className={cn(
              "w-full rounded-lg border border-slate-200 bg-slate-50/80 p-3 text-left transition",
              onSelectSource && "hover:border-blue-200 hover:bg-blue-50/50",
            )}
          >
            <p className="text-xs font-medium text-slate-500">
              {displayFilename(source.file)} · Chunk {source.chunkIndex}
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-700">
              &ldquo;{truncatePreview(source.excerpt, 200)}&rdquo;
            </p>
          </button>
        </li>
      ))}
    </ul>
  );
}

export default function AnswerExplainability({
  question,
  sources,
  onSelectSource,
}: AnswerExplainabilityProps) {
  const [expanded, setExpanded] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>("sources");

  const data = useMemo(
    () => buildExplainabilityData(question, sources),
    [question, sources],
  );

  function toggleSection(key: string) {
    setOpenSection((current) => (current === key ? null : key));
  }

  return (
    <div className="mt-5 border-t border-slate-100 pt-4">
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        className="flex w-full items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-left transition hover:bg-blue-50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white">
          <svg
            className="h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </span>
        <span className="flex-1 text-sm font-semibold text-slate-900">
          Why was this answer generated?
        </span>
        <motion.span
          animate={{ rotate: expanded ? 180 : 0 }}
          className="text-slate-400"
        >
          ▾
        </motion.span>
      </button>

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/50 p-3">
              <AccordionSection
                title="Retrieved Sources"
                sectionKey="sources"
                openSection={openSection}
                onToggle={toggleSection}
                index={0}
              >
                <RetrievedSourcesSection sources={sources} data={data} />
              </AccordionSection>

              <AccordionSection
                title="Evidence Used"
                sectionKey="evidence"
                openSection={openSection}
                onToggle={toggleSection}
                index={1}
              >
                <EvidenceUsedSection
                  sources={sources}
                  onSelectSource={onSelectSource}
                />
              </AccordionSection>

              <AccordionSection
                title="Retrieval Reasoning"
                sectionKey="reasoning"
                openSection={openSection}
                onToggle={toggleSection}
                index={2}
              >
                <p className="text-sm leading-relaxed text-slate-700">
                  {data.reasoning}
                </p>
                <p className="mt-2 text-xs text-slate-500">{data.summary}</p>
              </AccordionSection>

              <AccordionSection
                title="RAG Pipeline"
                sectionKey="pipeline"
                openSection={openSection}
                onToggle={toggleSection}
                index={3}
              >
                <PipelineVisualization />
                <p className="mt-2 text-center text-xs text-slate-500">
                  Your question is embedded, matched against ChromaDB, passed
                  to the LLM as context, and synthesized into the final answer.
                </p>
              </AccordionSection>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
