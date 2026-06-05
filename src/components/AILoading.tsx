"use client";

import { useEffect, useState } from "react";
import Card from "@/components/ui/Card";
import { cn, ds } from "@/lib/design-system";

const LOADING_MESSAGES = [
  "Searching medical documents...",
  "Retrieving relevant context...",
  "Generating answer...",
  "Preparing citations...",
] as const;

const ROTATE_INTERVAL_MS = 3000;
const FADE_DURATION_MS = 300;

function Spinner({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export default function AILoading() {
  const [messageIndex, setMessageIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    let fadeTimeout: ReturnType<typeof setTimeout>;

    const interval = setInterval(() => {
      setVisible(false);

      fadeTimeout = setTimeout(() => {
        setMessageIndex((current) => (current + 1) % LOADING_MESSAGES.length);
        setVisible(true);
      }, FADE_DURATION_MS);
    }, ROTATE_INTERVAL_MS);

    return () => {
      clearInterval(interval);
      clearTimeout(fadeTimeout);
    };
  }, []);

  return (
    <div className="flex justify-start" aria-live="polite" aria-busy="true">
      <Card padding="sm" className="flex items-center gap-3 rounded-2xl rounded-bl-md">
        <Spinner className={cn("h-5 w-5 shrink-0 animate-spin", ds.colors.primary.text)} />
        <p
          className={cn(
            "text-sm text-slate-600 transition-all duration-300 ease-in-out",
            visible ? "translate-y-0 opacity-100" : "translate-y-1 opacity-0",
          )}
        >
          {LOADING_MESSAGES[messageIndex]}
        </p>
      </Card>
    </div>
  );
}
