import type { ReactNode } from "react";

const STOP_WORDS = new Set([
  "what",
  "are",
  "is",
  "the",
  "a",
  "an",
  "how",
  "can",
  "does",
  "do",
  "of",
  "in",
  "for",
  "to",
  "and",
  "or",
  "be",
  "with",
  "from",
  "this",
  "that",
  "was",
  "were",
  "will",
  "have",
  "has",
  "had",
  "why",
  "when",
  "where",
  "which",
  "who",
  "whom",
  "into",
  "about",
]);

export function extractQueryTerms(query: string): string[] {
  const terms = query
    .toLowerCase()
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .map((term) => term.trim())
    .filter((term) => term.length > 2 && !STOP_WORDS.has(term));

  return [...new Set(terms)];
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function highlightQueryTerms(
  text: string,
  query?: string,
): ReactNode[] {
  if (!query?.trim()) return [text];

  const terms = extractQueryTerms(query);
  if (terms.length === 0) return [text];

  const pattern = new RegExp(
    `(${terms.map(escapeRegExp).join("|")})`,
    "gi",
  );

  const parts = text.split(pattern);

  return parts.map((part, index) => {
    const isMatch = terms.some(
      (term) => part.toLowerCase() === term.toLowerCase(),
    );

    if (isMatch) {
      return (
        <mark
          key={`${part}-${index}`}
          className="rounded-sm bg-amber-200/80 px-0.5 font-medium text-amber-950"
        >
          {part}
        </mark>
      );
    }
    return <span key={`${part}-${index}`}>{part}</span>;
  });
}
