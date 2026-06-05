"use client";

import MarkdownContent from "@/components/chat/MarkdownContent";
import { cn } from "@/lib/design-system";

type ResearchAnswerContentProps = {
  content: string;
  className?: string;
};

export default function ResearchAnswerContent({
  content,
  className,
}: ResearchAnswerContentProps) {
  return (
    <MarkdownContent
      content={content}
      className={cn(
        "research-answer",
        "prose-h2:mt-6 prose-h2:mb-3 prose-h2:border-b prose-h2:border-indigo-100 prose-h2:pb-2 prose-h2:text-base prose-h2:font-bold prose-h2:text-indigo-950",
        "prose-h3:mt-4 prose-h3:mb-2 prose-h3:text-sm prose-h3:font-semibold prose-h3:text-slate-800",
        "prose-table:my-4 prose-table:w-full prose-table:border-collapse prose-table:text-xs",
        "prose-th:border prose-th:border-slate-200 prose-th:bg-indigo-50/80 prose-th:px-3 prose-th:py-2 prose-th:text-left prose-th:font-semibold prose-th:text-slate-800",
        "prose-td:border prose-td:border-slate-200 prose-td:px-3 prose-td:py-2 prose-td:text-slate-700",
        className,
      )}
    />
  );
}
