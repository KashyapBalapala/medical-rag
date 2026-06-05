"use client";

import { motion, useReducedMotion } from "framer-motion";
import { MAX_MEMORY_EXCHANGES } from "@/lib/memory-service";
import { cn } from "@/lib/design-system";

type MemoryIndicatorProps = {
  active: boolean;
  exchangeCount?: number;
  messagesIncluded?: number;
  className?: string;
};

export default function MemoryIndicator({
  active,
  exchangeCount = 0,
  messagesIncluded,
  className,
}: MemoryIndicatorProps) {
  const reducedMotion = useReducedMotion();

  if (!active) return null;

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-emerald-200/90 bg-emerald-50/90 px-3 py-1.5",
        "text-xs font-medium text-emerald-800 shadow-sm",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      <span
        className="relative flex h-2 w-2 shrink-0"
        aria-hidden
      >
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
      </span>
      <span>Conversation Context Active</span>
      <span className="hidden text-emerald-600/80 sm:inline">
        · {exchangeCount}/{MAX_MEMORY_EXCHANGES} exchanges
        {messagesIncluded != null ? ` · ${messagesIncluded} msgs` : ""}
      </span>
    </motion.div>
  );
}
