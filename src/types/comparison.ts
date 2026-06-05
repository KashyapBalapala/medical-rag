import type { CitationSource } from "@/types/chat";

export type TopicSourceGroup = {
  topic: string;
  displayName: string;
  sources: CitationSource[];
  /** Unique source PDF filenames for this topic */
  files: string[];
};

export type ComparisonSection = {
  title: string;
  content: string;
};

export type ParsedTopicComparison = {
  topic: string;
  displayName: string;
  sections: ComparisonSection[];
};

export type ParsedComparison = {
  topics: ParsedTopicComparison[];
  keyDifferences: string | null;
};
