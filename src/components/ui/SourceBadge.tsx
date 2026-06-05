"use client";

import { cn } from "@/lib/design-system";

type SourceBadgeProps = {
  label: string;
  onClick?: () => void;
  className?: string;
};

export default function SourceBadge({
  label,
  onClick,
  className,
}: SourceBadgeProps) {
  const sharedClass = cn(
    "inline-flex max-w-full items-center rounded-full border border-slate-200 bg-white px-2.5 py-1",
    "text-[11px] font-medium text-slate-700 shadow-sm transition",
    onClick &&
      "cursor-pointer hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-500",
    className,
  );

  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={sharedClass}>
        <span className="mr-1.5 shrink-0 text-slate-400" aria-hidden>
          📄
        </span>
        <span className="truncate">{label}</span>
      </button>
    );
  }

  return (
    <span className={sharedClass}>
      <span className="mr-1.5 shrink-0 text-slate-400" aria-hidden>
        📄
      </span>
      <span className="truncate">{label}</span>
    </span>
  );
}
