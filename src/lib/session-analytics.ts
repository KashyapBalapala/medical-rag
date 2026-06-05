import type { ChatMessage } from "@/types/chat";

export type SessionAnalytics = {
  queriesProcessed: number;
  avgRetrievalMs: number | null;
  avgGenerationMs: number | null;
  avgResponseMs: number | null;
  avgSimilarityScore: number | null;
  similarityScores: number[];
  responseTimesMs: number[];
  retrievalTimesMs: number[];
  generationTimesMs: number[];
  hasEstimatedTimings: boolean;
  ungroundedAnswers: number;
  avgDocumentCoverage: number | null;
  avgTopicCoverage: number | null;
};

function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

export function computeSessionAnalytics(
  messages: ChatMessage[],
): SessionAnalytics {
  const userMessages = messages.filter((message) => message.role === "user");
  const assistantMessages = messages.filter(
    (message) =>
      message.role === "assistant" && !message.error && message.timings,
  );

  const retrievalTimesMs = assistantMessages.map(
    (message) => message.timings!.retrievalMs,
  );
  const generationTimesMs = assistantMessages.map(
    (message) => message.timings!.generationMs,
  );
  const responseTimesMs = assistantMessages.map(
    (message) => message.timings!.totalMs,
  );

  const similarityScores = messages
    .filter(
      (message) =>
        message.role === "assistant" &&
        !message.error &&
        message.confidence !== undefined,
    )
    .map((message) => message.confidence!);

  const hasEstimatedTimings = assistantMessages.some(
    (message) => message.timings?.estimated,
  );

  const ungroundedAnswers = messages.filter(
    (message) =>
      message.role === "assistant" &&
      !message.error &&
      (!message.sources || message.sources.length === 0),
  ).length;

  const documentCoverageValues = messages
    .filter((message) => message.role === "assistant" && message.debug?.hybridRetrieval)
    .map(
      (message) =>
        message.debug!.hybridRetrieval!.retrievalMetrics.documentCoverage,
    );
  const topicCoverageValues = messages
    .filter((message) => message.role === "assistant" && message.debug?.hybridRetrieval)
    .map(
      (message) => message.debug!.hybridRetrieval!.retrievalMetrics.topicCoverage,
    );

  return {
    queriesProcessed: userMessages.length,
    avgRetrievalMs: average(retrievalTimesMs),
    avgGenerationMs: average(generationTimesMs),
    avgResponseMs: average(responseTimesMs),
    avgSimilarityScore: average(similarityScores),
    similarityScores,
    responseTimesMs,
    retrievalTimesMs,
    generationTimesMs,
    hasEstimatedTimings,
    ungroundedAnswers,
    avgDocumentCoverage: average(documentCoverageValues),
    avgTopicCoverage: average(topicCoverageValues),
  };
}

export function bucketValues(
  values: number[],
  buckets: Array<{ label: string; min: number; max: number }>,
): Array<{ label: string; count: number; percent: number }> {
  if (values.length === 0) {
    return buckets.map((bucket) => ({ label: bucket.label, count: 0, percent: 0 }));
  }

  return buckets.map((bucket) => {
    const count = values.filter(
      (value) => value >= bucket.min && value < bucket.max,
    ).length;
    return {
      label: bucket.label,
      count,
      percent: Math.round((count / values.length) * 100),
    };
  });
}
