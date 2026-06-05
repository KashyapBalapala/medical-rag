"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/design-system";

const PIPELINE_STEPS = [
  { key: "question", label: "Question" },
  { key: "embedding", label: "Embedding" },
  { key: "search", label: "Vector Search" },
  { key: "chunks", label: "Retrieved Chunks" },
  { key: "prompt", label: "Prompt Construction" },
  { key: "llm", label: "LLM" },
  { key: "answer", label: "Answer" },
] as const;

type EvalPipelineVizProps = {
  active: boolean;
  className?: string;
};

export default function EvalPipelineViz({ active, className }: EvalPipelineVizProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-slate-700/80 bg-slate-900/60 p-4",
        className,
      )}
    >
      <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        RAG Pipeline
      </h3>
      <ol
        className="mt-4 flex flex-col items-stretch gap-0"
        aria-label="RAG evaluation pipeline"
      >
        {PIPELINE_STEPS.map((step, index) => (
          <li key={step.key} className="flex flex-col items-center">
            <motion.div
              initial={{ opacity: 0.4, scale: 0.96 }}
              animate={
                active
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0.5, scale: 0.98 }
              }
              transition={{ delay: active ? index * 0.08 : 0, duration: 0.25 }}
              className={cn(
                "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5",
                active
                  ? "border-violet-500/40 bg-violet-500/10"
                  : "border-slate-700 bg-slate-800/50",
              )}
            >
              <span
                className={cn(
                  "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold",
                  active
                    ? "bg-violet-600 text-white"
                    : "bg-slate-700 text-slate-400",
                )}
              >
                {index + 1}
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  active ? "text-violet-100" : "text-slate-400",
                )}
              >
                {step.label}
              </span>
            </motion.div>
            {index < PIPELINE_STEPS.length - 1 && (
              <span
                className="my-0.5 text-xs text-slate-600"
                aria-hidden
              >
                ↓
              </span>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
