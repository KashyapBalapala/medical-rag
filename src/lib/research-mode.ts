import { displayFilename } from "@/lib/chat-utils";
import type { CitationSource } from "@/types/chat";
import type { TopicSourceGroup } from "@/types/comparison";
import type { SearchResult } from "@/lib/retrieve";

const COMPARISON_PATTERNS = [
  /\bcompare\b/i,
  /\bdifference(s)?\s+between\b/i,
  /\bvs\.?\b/i,
  /\bversus\b/i,
];

const RESEARCH_PATTERNS = [
  ...COMPARISON_PATTERNS,
  /\bcontrast\b/i,
  /\bsimilarit(y|ies)\s+(and|&)\s+differenc/i,
  /\bhow\s+(do|does|are)\b.+\bdiffer\b/i,
  /\bacross\s+(multiple\s+)?documents?\b/i,
  /\bsynthesi(s|ze)\b/i,
  /\bmulti[- ]document\b/i,
];

const COMPARE_CATEGORY_RE =
  /\bcompare\s+(?:the\s+)?(symptoms|diagnosis|treatment|management|signs|causes)\s+(?:of\s+)?(.+?)\s+(?:and|vs\.?|versus|with)\s+(.+?)[\?\.!]?\s*$/i;

const COMPARE_SPLIT_RE =
  /\bcompare\s+(.+?)\s+(?:and|vs\.?|versus|with)\s+(.+?)[\?\.!]?\s*$/i;

const BETWEEN_SPLIT_RE =
  /\bdifference(s)?\s+between\s+(.+?)\s+(?:and|vs\.?|versus)\s+(.+?)[\?\.!]?\s*$/i;

const VS_SPLIT_RE =
  /^(?:compare\s+)?(.+?)\s+vs\.?\s+(.+?)[\?\.!]?\s*$/i;

export const COMPARISON_PER_TOPIC_K = 5;
export const RESEARCH_TOP_K = 10;
export const RESEARCH_PER_TOPIC_K = 4;

function cleanTopic(raw: string): string {
  return raw
    .trim()
    .replace(/^(the|a|an)\s+/i, "")
    .replace(/[?.!,;:]+$/g, "")
    .trim();
}

export function capitalizeTopic(topic: string): string {
  const cleaned = cleanTopic(topic);
  if (!cleaned) return topic;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export function isComparisonQuestion(question: string): boolean {
  const trimmed = question.trim();
  if (!trimmed) return false;
  return extractResearchTopics(trimmed).length >= 2;
}

export function isResearchQuestion(question: string): boolean {
  const trimmed = question.trim();
  if (!trimmed) return false;
  if (isComparisonQuestion(trimmed)) return true;
  return RESEARCH_PATTERNS.some((pattern) => pattern.test(trimmed));
}

export function extractComparisonAspect(question: string): string | undefined {
  const match = question.trim().match(COMPARE_CATEGORY_RE);
  return match?.[1]?.toLowerCase();
}

/** Aspect keyword from a single-topic question (e.g. "causes", "symptoms"). */
export function extractQuestionAspect(question: string): string | null {
  const match = question.match(
    /\b(causes?|symptoms?|signs?|diagnosis|treatment|management|complications|prevention|risk factors?)\b/i,
  );
  return match?.[1]?.toLowerCase() ?? null;
}

export function extractResearchTopics(question: string): string[] {
  const trimmed = question.trim();

  const categoryMatch = trimmed.match(COMPARE_CATEGORY_RE);
  if (categoryMatch) {
    return [categoryMatch[2], categoryMatch[3]]
      .map(cleanTopic)
      .filter(Boolean);
  }

  const compareMatch = trimmed.match(COMPARE_SPLIT_RE);
  if (compareMatch) {
    return [compareMatch[1], compareMatch[2]].map(cleanTopic).filter(Boolean);
  }

  const betweenMatch = trimmed.match(BETWEEN_SPLIT_RE);
  if (betweenMatch) {
    return [betweenMatch[2], betweenMatch[3]].map(cleanTopic).filter(Boolean);
  }

  const vsMatch = trimmed.match(VS_SPLIT_RE);
  if (vsMatch) {
    const topics = [vsMatch[1], vsMatch[2]].map(cleanTopic).filter(Boolean);
    if (topics.every((topic) => topic.length > 0 && topic.length < 80)) {
      return topics;
    }
  }

  return [];
}

export function shouldUseResearchMode(
  question: string,
  explicitMode: boolean,
): boolean {
  return explicitMode || isResearchQuestion(question);
}

export function shouldUseComparisonMode(
  question: string,
  _explicitResearchMode = false,
): boolean {
  return extractResearchTopics(question).length >= 2;
}

export type DocumentSourceGroup = {
  file: string;
  displayName: string;
  sources: CitationSource[];
  avgScore: number;
};

export function groupSourcesByDocument(
  sources: CitationSource[],
): DocumentSourceGroup[] {
  const map = new Map<string, CitationSource[]>();

  for (const source of sources) {
    const existing = map.get(source.file) ?? [];
    existing.push(source);
    map.set(source.file, existing);
  }

  return [...map.entries()]
    .map(([file, grouped]) => {
      const avgScore =
        grouped.reduce((sum, source) => sum + source.score, 0) / grouped.length;
      return {
        file,
        displayName: displayFilename(file),
        sources: grouped.sort((a, b) => b.score - a.score),
        avgScore,
      };
    })
    .sort((a, b) => b.avgScore - a.avgScore);
}

export function groupSourcesByTopic(
  chunksByTopic: Map<string, SearchResult[]>,
  toSource: (chunk: SearchResult) => CitationSource,
): TopicSourceGroup[] {
  return [...chunksByTopic.entries()].map(([topic, chunks]) => {
    const sources = chunks.map(toSource);
    const uniqueFiles = [...new Set(sources.map((source) => source.file))];

    return {
      topic,
      displayName: capitalizeTopic(topic),
      sources: sources.sort((a, b) => b.score - a.score),
      files: uniqueFiles.map(displayFilename),
    };
  });
}

export function buildTopicRetrievalQuery(
  topic: string,
  aspect?: string,
): string {
  if (aspect) {
    return `${topic} ${aspect}`;
  }
  return `${topic} symptoms diagnosis treatment`;
}
