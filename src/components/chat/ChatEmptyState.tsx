"use client";

import QuerySuggestions from "@/components/QuerySuggestions";
import { cn, ds } from "@/lib/design-system";

type ChatEmptyStateProps = {
  disabled?: boolean;
  researchMode?: boolean;
  onSelect: (question: string) => void;
};

export default function ChatEmptyState({
  disabled,
  researchMode = false,
  onSelect,
}: ChatEmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center px-2 py-8 text-center sm:py-12">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-cyan-500 text-2xl font-bold text-white shadow-lg shadow-blue-600/25">
        +
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
        Medical Research Assistant
      </h2>
      <p className={cn("mt-2 max-w-md", ds.typography.body, "text-slate-500")}>
        {researchMode
          ? "Synthesize evidence across multiple documents — structured sections, comparison tables, and sources grouped by file."
          : "Ask questions grounded in your indexed medical PDFs. Every answer includes citations, confidence scores, and source evidence you can inspect."}
      </p>

      <div className="mt-8 w-full">
        <QuerySuggestions
          disabled={disabled}
          researchMode={researchMode}
          onSelect={onSelect}
        />
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Answers are generated from uploaded documents only — not general medical advice.
      </p>
    </div>
  );
}
