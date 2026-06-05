import type { SearchResult } from "@/lib/retrieve";
import {
  CHARS_PER_TOKEN,
  RETRIEVAL_CONFIG,
  getClassificationLimits,
  type QueryClassification,
} from "@/lib/search/retrieval.config";

type BuildTopicContextOptions = {
  budgetChars?: number;
  minChunkChars?: number;
  maxChunkChars?: number;
  classification?: QueryClassification;
};

const MEDICAL_LINE_RE =
  /(\d+\s*(?:mg|mmol|mmHg|mL|kg|%|g\/dL|mg\/dL|units?|IU)\b|(?:table|figure|dose|dosage|diagnosis|symptom|treatment|HbA1c|OGTT|fasting glucose|blood pressure|contraindication))/i;

const TOPIC_ORDER = [
  "Overview",
  "Symptoms",
  "Diagnosis",
  "Treatment",
  "Complications",
  "Prevention",
  "Comparison",
  "General",
];

function truncateAtSentence(text: string, maxChars: number): string {
  const trimmed = text.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const slice = trimmed.slice(0, maxChars);
  const sentenceEnd = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf(".\n"),
    slice.lastIndexOf("\n"),
  );

  const minChars = RETRIEVAL_CONFIG.context.minChunkChars;
  if (sentenceEnd >= minChars) {
    return `${slice.slice(0, sentenceEnd + 1).trimEnd()}…`;
  }

  return `${slice.trimEnd()}…`;
}

function compressChunkContent(content: string, maxChars: number): string {
  const trimmed = content.trim();
  if (trimmed.length <= maxChars) return trimmed;

  const lines = trimmed.split(/\n+/);
  const preserved: string[] = [];
  let used = 0;

  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) continue;

    const isMedical = MEDICAL_LINE_RE.test(normalized);
    const isList = /^[-*•\d]+[.)]/.test(normalized);
    const lineBudget = Math.min(maxChars - used, maxChars);

    if (lineBudget <= 0) break;

    if (isMedical || isList || preserved.length === 0) {
      const piece =
        normalized.length > lineBudget
          ? truncateAtSentence(normalized, lineBudget)
          : normalized;
      preserved.push(piece);
      used += piece.length + 1;
    }
  }

  if (preserved.length === 0) {
    return truncateAtSentence(trimmed, maxChars);
  }

  const joined = preserved.join("\n");
  return joined.length > maxChars
    ? truncateAtSentence(joined, maxChars)
    : joined;
}

function formatChunkBlock(
  chunk: SearchResult,
  index: number,
  maxContentChars: number,
): string {
  const { filename, chunkIndex } = chunk.metadata;
  const content = compressChunkContent(chunk.content.trim(), maxContentChars);
  return [`[${filename} · excerpt ${index} · chunk ${chunkIndex}]`, content].join(
    "\n",
  );
}

function sortLabels(labels: string[]): string[] {
  return [...labels].sort((a, b) => {
    const indexA = TOPIC_ORDER.findIndex((topic) =>
      a.toLowerCase().includes(topic.toLowerCase()),
    );
    const indexB = TOPIC_ORDER.findIndex((topic) =>
      b.toLowerCase().includes(topic.toLowerCase()),
    );
    const rankA = indexA === -1 ? TOPIC_ORDER.length : indexA;
    const rankB = indexB === -1 ? TOPIC_ORDER.length : indexB;
    return rankA - rankB;
  });
}

export function buildTopicContext(
  chunksByLabel: Map<string, SearchResult[]>,
  options: BuildTopicContextOptions = {},
): string {
  const limits = options.classification
    ? getClassificationLimits(options.classification)
    : null;
  const ctx = RETRIEVAL_CONFIG.context;
  const budget =
    options.budgetChars ??
    (limits
      ? limits.contextTargetTokens * CHARS_PER_TOKEN
      : ctx.targetChars);
  const maxChunkChars =
    options.maxChunkChars ??
    (limits ? limits.maxChunkTokens * CHARS_PER_TOKEN : ctx.maxChunkChars);
  const minChunkChars = options.minChunkChars ?? ctx.minChunkChars;
  const maxContextChars = limits
    ? limits.contextMaxTokens * CHARS_PER_TOKEN
    : ctx.maxChars;

  const entries = [...chunksByLabel.entries()].filter(
    ([, chunks]) => chunks.length > 0,
  );

  if (entries.length === 0) return "";

  const ordered: Array<[string, SearchResult[]]> = sortLabels(
    entries.map(([label]) => label),
  ).map((label) => {
    const match = entries.find(([entryLabel]) => entryLabel === label);
    return match ?? [label, [] as SearchResult[]];
  });

  const totalChunks = ordered.reduce((sum, [, chunks]) => sum + chunks.length, 0);
  const perChunkBudget = Math.max(
    minChunkChars,
    Math.min(maxChunkChars, Math.floor(budget / Math.max(totalChunks, 1))),
  );

  let built = ordered
    .map(([label, chunks]) => {
      const blocks = chunks
        .map((chunk, index) =>
          formatChunkBlock(chunk, index + 1, perChunkBudget),
        )
        .join("\n\n");
      return `=== ${label} ===\n${blocks}`;
    })
    .join("\n\n---\n\n");

  if (built.length > maxContextChars) {
    const ratio = maxContextChars / built.length;
    const reducedBudget = Math.max(
      minChunkChars,
      Math.floor(perChunkBudget * ratio),
    );

    built = ordered
      .map(([label, chunks]) => {
        const blocks = chunks
          .map((chunk, index) =>
            formatChunkBlock(chunk, index + 1, reducedBudget),
          )
          .join("\n\n");
        return `=== ${label} ===\n${blocks}`;
      })
      .join("\n\n---\n\n");
  }

  return built.slice(0, maxContextChars);
}

export function mapChunksByLabelToTopics(
  chunksByLabel: Map<string, SearchResult[]>,
  topics: string[],
): Map<string, SearchResult[]> {
  const byTopic = new Map<string, SearchResult[]>();
  for (const topic of topics) {
    byTopic.set(topic, []);
  }

  for (const [label, chunks] of chunksByLabel.entries()) {
    for (const topic of topics) {
      if (label.toLowerCase().includes(topic.toLowerCase())) {
        const existing = byTopic.get(topic) ?? [];
        existing.push(...chunks);
        byTopic.set(topic, existing);
      }
    }
  }

  return byTopic;
}

export function buildComparisonTopicContext(
  chunksByLabel: Map<string, SearchResult[]>,
  topics: string[],
  options: BuildTopicContextOptions = {},
): string {
  const byTopic = mapChunksByLabelToTopics(chunksByLabel, topics);
  const limits = options.classification
    ? getClassificationLimits(options.classification)
    : null;
  const ctx = RETRIEVAL_CONFIG.context;
  const budget =
    options.budgetChars ??
    (limits
      ? limits.contextTargetTokens * CHARS_PER_TOKEN
      : ctx.targetChars);
  const maxChunkChars =
    options.maxChunkChars ??
    (limits ? limits.maxChunkTokens * CHARS_PER_TOKEN : ctx.maxChunkChars);
  const minChunkChars = options.minChunkChars ?? ctx.minChunkChars;
  const maxContextChars = limits
    ? limits.contextMaxTokens * CHARS_PER_TOKEN
    : ctx.maxChars;
  const perTopicBudget = Math.floor(budget / Math.max(topics.length, 1));
  const perChunkBudget = Math.max(
    minChunkChars,
    Math.min(
      maxChunkChars,
      Math.floor(perTopicBudget / Math.max(3, 1)),
    ),
  );

  const built = [...byTopic.entries()]
    .map(([topic, chunks]) => {
      const blocks = chunks
        .map((chunk, index) =>
          formatChunkBlock(chunk, index + 1, perChunkBudget),
        )
        .join("\n\n");
      return `=== Topic: ${topic} ===\n${blocks || "(no chunks retrieved)"}`;
    })
    .join("\n\n---\n\n");

  return built.slice(0, maxContextChars);
}
