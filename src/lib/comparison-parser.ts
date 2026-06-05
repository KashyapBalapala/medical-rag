import { capitalizeTopic } from "@/lib/research-mode";
import type {
  ComparisonSection,
  ParsedComparison,
  ParsedTopicComparison,
} from "@/types/comparison";

function normalizeHeading(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

function matchTopic(heading: string, topics: string[]): string | null {
  const normalized = normalizeHeading(heading);

  for (const topic of topics) {
    const topicNorm = normalizeHeading(topic);
    if (
      normalized === topicNorm ||
      normalized.includes(topicNorm) ||
      topicNorm.includes(normalized)
    ) {
      return topic;
    }
  }

  return null;
}

function parseSubsections(body: string): ComparisonSection[] {
  const sections: ComparisonSection[] = [];
  const parts = body.split(/^###\s+/m).filter(Boolean);

  if (parts.length <= 1 && !body.includes("###")) {
    const trimmed = body.trim();
    if (trimmed) {
      sections.push({ title: "Overview", content: trimmed });
    }
    return sections;
  }

  for (const part of parts) {
    const newline = part.indexOf("\n");
    const title =
      newline === -1 ? part.trim() : part.slice(0, newline).trim();
    const content =
      newline === -1 ? "" : part.slice(newline + 1).trim();

    if (title) {
      sections.push({ title, content });
    }
  }

  return sections;
}

export function parseComparisonMarkdown(
  content: string,
  topics: string[],
): ParsedComparison {
  const topicMap = new Map<string, ComparisonSection[]>();
  for (const topic of topics) {
    topicMap.set(topic, []);
  }

  let keyDifferences: string | null = null;
  const blocks = content.split(/^##\s+/m).filter(Boolean);

  for (const block of blocks) {
    const newline = block.indexOf("\n");
    const heading =
      newline === -1 ? block.trim() : block.slice(0, newline).trim();
    const body = newline === -1 ? "" : block.slice(newline + 1).trim();

    if (!heading) continue;

    if (/key\s+differences?/i.test(heading)) {
      keyDifferences = body.trim();
      continue;
    }

    const matchedTopic = matchTopic(heading, topics);
    if (matchedTopic) {
      topicMap.set(matchedTopic, parseSubsections(body));
    }
  }

  const parsedTopics: ParsedTopicComparison[] = topics.map((topic) => ({
    topic,
    displayName: capitalizeTopic(topic),
    sections: topicMap.get(topic) ?? [],
  }));

  return {
    topics: parsedTopics,
    keyDifferences,
  };
}
