"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { cn } from "@/lib/design-system";

type MarkdownContentProps = {
  content: string;
  className?: string;
  components?: Components;
};

const defaultMarkdownComponents: Components = {
  a: ({ href, children, ...props }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="font-medium text-blue-600 underline decoration-blue-300/60 underline-offset-2 hover:text-blue-800"
      {...props}
    >
      {children}
    </a>
  ),
};

export default function MarkdownContent({
  content,
  className,
  components,
}: MarkdownContentProps) {
  return (
    <div
      className={cn(
        "prose prose-slate prose-sm max-w-none",
        "prose-headings:font-semibold prose-headings:text-slate-900",
        "prose-p:leading-relaxed prose-p:text-slate-700",
        "prose-strong:text-slate-900",
        "prose-ul:my-2 prose-ol:my-2",
        "prose-li:text-slate-700 prose-li:marker:text-slate-400",
        "prose-blockquote:border-blue-200 prose-blockquote:text-slate-600",
        "prose-code:rounded prose-code:bg-slate-100 prose-code:px-1 prose-code:py-0.5 prose-code:text-slate-800",
        className,
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{ ...defaultMarkdownComponents, ...components }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
