"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui";
import { cn, ds } from "@/lib/design-system";

type ErrorAnswerCardProps = {
  content: string;
  onRetry?: () => void;
  className?: string;
};

export default function ErrorAnswerCard({
  content,
  onRetry,
  className,
}: ErrorAnswerCardProps) {
  const reducedMotion = useReducedMotion();

  return (
    <motion.div
      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "w-full max-w-3xl rounded-2xl border border-red-200 bg-red-50/90 p-4 shadow-sm",
        className,
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-red-100 text-red-700"
          aria-hidden
        >
          !
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-red-800">
            Unable to generate answer
          </p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-red-700">
            {content}
          </p>
          {onRetry && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRetry}
              className="mt-3 border border-red-200 bg-white text-red-700 hover:bg-red-100"
            >
              Try again
            </Button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
