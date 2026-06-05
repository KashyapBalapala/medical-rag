import type {
  ChatMessage,
  ConversationTurn,
  MemoryDebugInfo,
} from "@/types/chat";
import { normalizeDebugInfo } from "@/lib/chat-utils";

/** localStorage key for persisted conversation memory */
export const MEMORY_STORAGE_KEY = "medical-rag-conversation";

/** Maximum user ↔ assistant exchange pairs retained */
export const MAX_MEMORY_EXCHANGES = 10;

/** Maximum individual turns sent to the RAG pipeline (2 per exchange) */
export const MAX_CONTEXT_TURNS = MAX_MEMORY_EXCHANGES * 2;

/** Truncate long turns to keep prompts bounded */
export const MAX_TURN_CONTENT_CHARS = 600;

export function trimTurnContent(
  content: string,
  max = MAX_TURN_CONTENT_CHARS,
): string {
  const trimmed = content.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max).trimEnd()}…`;
}

export function toConversationHistory(
  messages: ChatMessage[],
): ConversationTurn[] {
  return messages
    .filter((message) => !message.error)
    .map((message) => ({
      role: message.role,
      content: trimTurnContent(message.content),
    }));
}

export function trimConversationHistory(
  history: ConversationTurn[],
  max = MAX_CONTEXT_TURNS,
): ConversationTurn[] {
  return history.slice(-max);
}

export function buildHistoryForRequest(
  messages: ChatMessage[],
): ConversationTurn[] {
  return trimConversationHistory(toConversationHistory(messages));
}

export function formatConversationHistory(history: ConversationTurn[]): string {
  if (history.length === 0) return "";

  return history
    .map((turn) =>
      turn.role === "user"
        ? `User: ${turn.content}`
        : `Assistant: ${turn.content}`,
    )
    .join("\n\n");
}

/**
 * Context block injected before retrieval and into LLM prompts.
 *
 * Conversation History:
 * User: ...
 * Assistant: ...
 *
 * Current Question:
 * ...
 */
export function buildConversationContextBlock(
  history: ConversationTurn[],
  currentQuestion: string,
): string {
  const historyBlock = formatConversationHistory(history);

  if (!historyBlock) {
    return `Current Question:\n${currentQuestion}`;
  }

  return [
    "Conversation History:",
    historyBlock,
    "",
    "Current Question:",
    currentQuestion,
  ].join("\n");
}

const FOLLOW_UP_RE =
  /\b(its?|their|they|this|that|these|those|the same|mentioned above)\b/i;

export function isFollowUpQuestion(question: string): boolean {
  return FOLLOW_UP_RE.test(question);
}

/** Pull a medical topic from questions like "What is diabetes?" */
export function extractTopicFromQuestion(question: string): string | null {
  const normalized = question.trim().replace(/[?.!]+$/, "");
  const patterns = [
    /^(?:what are )?the (?:causes?|symptoms?|signs?|risk factors?) of\s+(.+)$/i,
    /^(?:causes?|symptoms?|signs?|risk factors?) of\s+(.+)$/i,
    /^(?:what (?:is|are)|tell me about|explain|describe)\s+(.+)$/i,
    /^(?:symptoms|signs) of\s+(.+)$/i,
    /^how (?:is|are)\s+(.+?)\s+diagnos/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    const topic = match?.[1]?.trim();
    if (!topic || isPronounTopic(topic)) continue;
    return topic;
  }

  return null;
}

function isPronounTopic(topic: string): boolean {
  return /^(its?|their|they|this|that|these|those)\b/i.test(topic.trim());
}

/** Prepends the last user topic when a follow-up uses pronouns (e.g. "its symptoms"). */
export function expandFollowUpForRetrieval(
  question: string,
  history: ConversationTurn[],
): string {
  if (!isFollowUpQuestion(question) || history.length === 0) {
    return question;
  }

  const lastUser = [...history].reverse().find((turn) => turn.role === "user");
  if (!lastUser) return question;

  return `${lastUser.content} ${question}`;
}

export function buildPromptHistorySection(
  history: ConversationTurn[],
  currentQuestion: string,
): string {
  if (history.length === 0) {
    return `Current Question:\n${currentQuestion}\n\n`;
  }

  return `${buildConversationContextBlock(history, currentQuestion)}

(Internal: use Conversation History only to resolve pronouns in Current Question. Do not mention history in your reply.)

`;
}

/** Active when at least one prior assistant turn can inform follow-ups */
export function isMemoryActive(history: ConversationTurn[]): boolean {
  return history.some((turn) => turn.role === "assistant");
}

export function buildMemoryDebugInfo(
  history: ConversationTurn[],
): MemoryDebugInfo {
  const used = isMemoryActive(history);
  return {
    used,
    messagesIncluded: used ? history.length : 0,
  };
}

export function countExchanges(messages: ChatMessage[]): number {
  const valid = messages.filter((message) => !message.error);
  const pairs = Math.floor(valid.length / 2);
  return Math.min(pairs, MAX_MEMORY_EXCHANGES);
}

export function trimStoredMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.slice(-MAX_CONTEXT_TURNS);
}

export function loadStoredMessages(): ChatMessage[] {
  if (typeof window === "undefined") return [];

  try {
    const raw = localStorage.getItem(MEMORY_STORAGE_KEY);
    if (!raw) return [];

    const parsed = JSON.parse(raw) as ChatMessage[];
    return trimStoredMessages(
      parsed.map((message) =>
        message.role === "assistant" && message.debug
          ? { ...message, debug: normalizeDebugInfo(message.debug) }
          : message,
      ),
    );
  } catch {
    return [];
  }
}

export function saveStoredMessages(messages: ChatMessage[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    MEMORY_STORAGE_KEY,
    JSON.stringify(trimStoredMessages(messages)),
  );
}

export function clearStoredMessages(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(MEMORY_STORAGE_KEY);
}
