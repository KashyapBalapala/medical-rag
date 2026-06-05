import type { ConversationTurn } from "@/types/chat";
import {
  expandFollowUpForRetrieval,
  extractTopicFromQuestion,
  isFollowUpQuestion,
  MAX_CONTEXT_TURNS,
  trimTurnContent,
} from "@/lib/memory-service";

export type { ConversationTurn };

/** @deprecated Use MAX_CONTEXT_TURNS from memory-service */
export const MAX_CONTEXT_MESSAGES = MAX_CONTEXT_TURNS;

export {
  toConversationHistory,
  trimConversationHistory,
  formatConversationHistory,
  buildConversationContextBlock,
  buildPromptHistorySection,
  isMemoryActive as hasConversationContext,
} from "@/lib/memory-service";

function resolveRetrievalTopic(
  question: string,
  history: ConversationTurn[],
): string | null {
  const fromQuestion = extractTopicFromQuestion(question);
  if (fromQuestion) return fromQuestion;

  if (history.length === 0) return null;

  const lastUser = [...history].reverse().find((turn) => turn.role === "user");
  if (!lastUser) return null;

  return extractTopicFromQuestion(lastUser.content);
}

/**
 * Expands follow-up questions for retrieval by prepending recent turn content.
 * Helps match "What are its symptoms?" against diabetes-related chunks.
 */
export function buildRetrievalQuery(
  question: string,
  history: ConversationTurn[],
): string {
  let retrievalBoost = "";
  const explicitTopic = extractTopicFromQuestion(question);

  if (/\b(symptoms?|signs?)\b/i.test(question)) {
    const topic = resolveRetrievalTopic(question, history);
    if (topic) {
      retrievalBoost += `${topic} symptoms signs `;
    }
  }

  if (/\b(diagnos|diagnosis|diagnosed)\b/i.test(question)) {
    const topic = resolveRetrievalTopic(question, history);
    if (topic) {
      retrievalBoost += `${topic} diagnosis fasting glucose OGTT `;
    }
  }

  if (/\b(causes?|risk factors?|etiology)\b/i.test(question)) {
    const topic = resolveRetrievalTopic(question, history);
    if (topic) {
      retrievalBoost += `${topic} causes risk factors etiology `;
    }
  }

  const baseQuery = `${retrievalBoost}${question}`.trim().replace(/\s+/g, " ");

  // Skip unrelated history when the question already names its topic (e.g. after
  // discussing hypertension, "What are the causes of diabetes?" should not embed
  // hypertension turns into the embedding query).
  if ((explicitTopic && !isFollowUpQuestion(question)) || history.length === 0) {
    return baseQuery.slice(0, 2000);
  }

  const expandedQuestion = expandFollowUpForRetrieval(question, history);
  const recent = history.slice(-4);
  const contextText = recent
    .map((turn) => trimTurnContent(turn.content, 300))
    .join(" ");

  const combined = `${retrievalBoost}${contextText} ${expandedQuestion}`
    .trim()
    .replace(/\s+/g, " ");

  return combined.slice(0, 2000);
}
