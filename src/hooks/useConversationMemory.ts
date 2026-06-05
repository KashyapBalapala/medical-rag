"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  buildHistoryForRequest,
  clearStoredMessages,
  countExchanges,
  isMemoryActive,
  loadStoredMessages,
  MAX_MEMORY_EXCHANGES,
  saveStoredMessages,
  trimStoredMessages,
} from "@/lib/memory-service";
import type { ChatMessage, ConversationTurn } from "@/types/chat";

export function useConversationMemory() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setMessages(loadStoredMessages());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const timer = window.setTimeout(() => saveStoredMessages(messages), 250);
    return () => window.clearTimeout(timer);
  }, [messages, hydrated]);

  const historyForRequest = useMemo(
    (): ConversationTurn[] => buildHistoryForRequest(messages),
    [messages],
  );

  const memoryActive = useMemo(
    () => isMemoryActive(historyForRequest),
    [historyForRequest],
  );

  const exchangeCount = useMemo(() => countExchanges(messages), [messages]);

  const appendMessage = useCallback((message: ChatMessage) => {
    setMessages((prev) => trimStoredMessages([...prev, message]));
  }, []);

  const appendMessages = useCallback((nextMessages: ChatMessage[]) => {
    setMessages((prev) => trimStoredMessages([...prev, ...nextMessages]));
  }, []);

  const replaceMessages = useCallback((nextMessages: ChatMessage[]) => {
    setMessages(trimStoredMessages(nextMessages));
  }, []);

  const clearMemory = useCallback(() => {
    setMessages([]);
    clearStoredMessages();
  }, []);

  return {
    messages,
    hydrated,
    historyForRequest,
    memoryActive,
    exchangeCount,
    maxExchanges: MAX_MEMORY_EXCHANGES,
    appendMessage,
    appendMessages,
    replaceMessages,
    clearMemory,
    setMessages,
  };
}
