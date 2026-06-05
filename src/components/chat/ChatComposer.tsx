"use client";

import MemoryIndicator from "@/components/chat/MemoryIndicator";
import { Button, InputHint, Textarea } from "@/components/ui";
import { MAX_MEMORY_EXCHANGES } from "@/lib/memory-service";
import { cn } from "@/lib/design-system";

type ChatComposerProps = {
  input: string;
  loading: boolean;
  hasMessages: boolean;
  researchMode?: boolean;
  memoryActive?: boolean;
  exchangeCount?: number;
  messagesIncluded?: number;
  onInputChange: (value: string) => void;
  onSubmit: () => void;
  onKeyDown: (event: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

export default function ChatComposer({
  input,
  loading,
  hasMessages,
  researchMode = false,
  memoryActive = false,
  exchangeCount = 0,
  messagesIncluded = 0,
  onInputChange,
  onSubmit,
  onKeyDown,
}: ChatComposerProps) {
  return (
    <div className="border-t border-slate-200/80 bg-white/95 px-4 py-4 backdrop-blur-sm sm:px-6">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
        className="mx-auto flex max-w-3xl flex-col gap-3"
      >
        {hasMessages && (
          <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center sm:justify-between">
            <MemoryIndicator
              active={memoryActive}
              exchangeCount={exchangeCount}
              messagesIncluded={messagesIncluded}
            />
            <p className="text-center text-xs text-slate-400 sm:text-right">
              {researchMode
                ? "Research mode · multi-document synthesis"
                : `Memory · last ${MAX_MEMORY_EXCHANGES} exchanges inform follow-ups`}
            </p>
          </div>
        )}
        <div className="relative flex flex-col gap-3 sm:flex-row sm:items-end">
          <label htmlFor="chat-input" className="sr-only">
            Research question
          </label>
          <Textarea
            id="chat-input"
            value={input}
            onChange={(event) => onInputChange(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder={
              hasMessages
                ? researchMode
                  ? "Compare or synthesize across documents…"
                  : "Ask a follow-up question..."
                : researchMode
                  ? "Compare conditions across your medical library…"
                  : "Ask a medical research question..."
            }
            rows={2}
            disabled={loading}
            className={cn(
              "w-full rounded-2xl border-slate-200 bg-slate-50/80 pr-4 shadow-sm",
              "focus:border-blue-400 focus:bg-white focus:ring-blue-500/15",
            )}
          />
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            size="lg"
            className="shrink-0 rounded-xl sm:min-w-[7rem] sm:py-2.5"
          >
            {loading ? "Researching…" : researchMode ? "Synthesize" : "Send"}
          </Button>
        </div>
      </form>
      <InputHint className="mx-auto mt-2 max-w-3xl text-center sm:text-left">
        Enter to send · Shift+Enter for new line · Sources open the evidence drawer
      </InputHint>
    </div>
  );
}
