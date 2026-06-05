"use client";

import { cn, ds } from "@/lib/design-system";

const SUGGESTIONS = [
  "What are symptoms of diabetes?",
  "How is diabetes diagnosed?",
  "What complications can diabetes cause?",
  "What is hypertension?",
] as const;

const RESEARCH_SUGGESTIONS = [
  "Compare diabetes and hypertension.",
  "Compare symptoms and diagnosis of diabetes vs hypertension.",
  "What are the differences between diabetes and hypertension?",
  "Contrast treatment approaches for diabetes and hypertension.",
] as const;

type QuerySuggestionsProps = {
  onSelect: (question: string) => void;
  disabled?: boolean;
  researchMode?: boolean;
};

export default function QuerySuggestions({
  onSelect,
  disabled,
  researchMode = false,
}: QuerySuggestionsProps) {
  const items = researchMode ? RESEARCH_SUGGESTIONS : SUGGESTIONS;
  const label = researchMode ? "Multi-document research" : "Suggested questions";
  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-1 shadow-sm">
      <p className={cn("px-3 pt-3", ds.typography.label)}>{label}</p>
      <ul className="mt-1 divide-y divide-slate-100">
        {items.map((question) => (
          <li key={question}>
            <button
              type="button"
              disabled={disabled}
              onClick={() => onSelect(question)}
              className={cn(
                "w-full px-3 py-3 text-left text-sm text-slate-700 transition",
                "hover:bg-blue-50/70 hover:text-blue-800",
                "focus-visible:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500/30",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
            >
              {question}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
