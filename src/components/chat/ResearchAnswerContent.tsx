"use client";

import type { Components } from "react-markdown";
import MarkdownContent from "@/components/chat/MarkdownContent";
import { normalizeResearchAnswerMarkdown } from "@/lib/research-answer-formatter";
import { cn } from "@/lib/design-system";

type ResearchAnswerContentProps = {
  content: string;
  className?: string;
};

const researchMarkdownComponents: Components = {
  h1: ({ children }) => (
    <h1 className="mt-0 mb-5 border-b-2 border-indigo-200 pb-3 text-2xl font-bold tracking-tight text-indigo-950 sm:text-[1.65rem]">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mb-3 mt-8 border-b border-indigo-100 pb-2 text-lg font-bold text-indigo-900">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mb-2 mt-5 text-base font-semibold text-slate-800">
      {children}
    </h3>
  ),
  p: ({ children }) => (
    <p className="my-2 text-sm leading-relaxed text-slate-700">{children}</p>
  ),
  ul: ({ children }) => (
    <ul className="my-3 list-disc space-y-2.5 pl-5 marker:text-indigo-400">
      {children}
    </ul>
  ),
  ol: ({ children }) => (
    <ol className="my-3 list-decimal space-y-2.5 pl-5 marker:font-semibold marker:text-indigo-500">
      {children}
    </ol>
  ),
  li: ({ children }) => (
    <li className="text-sm leading-relaxed text-slate-700">{children}</li>
  ),
  strong: ({ children }) => (
    <strong className="font-semibold text-slate-900">{children}</strong>
  ),
};

export default function ResearchAnswerContent({
  content,
  className,
}: ResearchAnswerContentProps) {
  const normalizedContent = normalizeResearchAnswerMarkdown(content);

  return (
    <MarkdownContent
      content={normalizedContent}
      components={researchMarkdownComponents}
      className={cn(
        "research-answer max-w-none [&_h1:first-child]:mt-0",
        "prose-headings:font-[inherit] prose-headings:text-[inherit]",
        "prose-p:my-0 prose-ul:my-0 prose-ol:my-0 prose-li:my-0",
        "prose-table:my-4 prose-table:w-full prose-table:border-collapse prose-table:text-xs",
        "prose-th:border prose-th:border-slate-200 prose-th:bg-indigo-50/80 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-slate-800",
        "prose-td:border prose-td:border-slate-200 prose-td:px-3 prose-td:py-2 prose-td:text-slate-700",
        className,
      )}
    />
  );
}
