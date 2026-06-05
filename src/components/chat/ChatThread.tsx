"use client";

import { useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import AILoading from "@/components/AILoading";
import AnswerCard from "@/components/chat/AnswerCard";
import UserBubble from "@/components/chat/UserBubble";
import { cn } from "@/lib/design-system";
import type { ChatMessage } from "@/types/chat";
import type { SourceOpenPayload } from "@/types/evidence";

type ChatThreadProps = {
  messages: ChatMessage[];
  loading: boolean;
  debugMode: boolean;
  onOpenSource: (payload: SourceOpenPayload) => void;
  onRetry?: (question: string) => void;
};

export default function ChatThread({
  messages,
  loading,
  debugMode,
  onOpenSource,
  onRetry,
}: ChatThreadProps) {
  const chatEndRef = useRef<HTMLDivElement>(null);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });
  }, [messages, loading, reducedMotion]);

  return (
    <div className="relative flex min-h-full flex-col">
      <div
        className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-1 py-2"
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-label="Conversation"
      >
        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex w-full",
              message.role === "user" ? "justify-end" : "justify-start",
            )}
          >
            {message.role === "user" ? (
              <UserBubble
                content={message.content}
                createdAt={message.createdAt}
              />
            ) : (
              <AnswerCard
                message={message}
                debugMode={debugMode}
                onOpenSource={onOpenSource}
                onRetry={onRetry}
              />
            )}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <AILoading />
          </div>
        )}

        <div ref={chatEndRef} className="h-px shrink-0" aria-hidden />
      </div>
    </div>
  );
}
