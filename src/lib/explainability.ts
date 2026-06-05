import type { CitationSource, RetrievalExplanation } from "@/types/chat";

export type ExplainabilityData = RetrievalExplanation & {
  reasoning: string;
};

function humanizeDocumentName(filename: string): string {
  return filename
    .replace(/\.pdf$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function displayFilename(path: string): string {
  const parts = path.split("/");
  return parts[parts.length - 1] ?? path;
}

const SECTION_PATTERNS: Array<{ pattern: RegExp; hint: string }> = [
  { pattern: /symptom/i, hint: "symptoms" },
  { pattern: /signs?\s+and\s+symptoms/i, hint: "signs and symptoms" },
  { pattern: /diagnos/i, hint: "diagnosis" },
  { pattern: /complicat/i, hint: "complications" },
  { pattern: /treatment|therapy|management/i, hint: "treatment" },
  { pattern: /prevention|prevent/i, hint: "prevention" },
  { pattern: /hypertension|blood pressure/i, hint: "hypertension" },
  { pattern: /diabetes|glucose|insulin|glycemi/i, hint: "diabetes" },
  { pattern: /guideline|recommend/i, hint: "clinical guidelines" },
  { pattern: /definition|what is/i, hint: "definitions" },
  { pattern: /risk factor/i, hint: "risk factors" },
];

function detectSectionHint(excerpt: string): string {
  for (const { pattern, hint } of SECTION_PATTERNS) {
    if (pattern.test(excerpt)) return hint;
  }
  return "relevant medical content";
}

function buildReasoningText(
  uniqueSections: string[],
  documentSummary: string,
): string {
  if (uniqueSections.length === 0) {
    return "This answer was generated without retrieved document evidence.";
  }

  const sectionPhrase =
    uniqueSections.length === 1
      ? uniqueSections[0]
      : uniqueSections.slice(0, 3).join(", ");

  return `This answer was generated because the retrieved chunks contain information about ${sectionPhrase} from ${documentSummary}.`;
}

export function buildExplainabilityData(
  question: string,
  sources: CitationSource[],
): ExplainabilityData {
  if (sources.length === 0) {
    return {
      summary:
        "No document chunks were retrieved. The model answered using only its training or indicated that the information was not found.",
      chunks: [],
      documentSummary: "no indexed documents",
      sectionSummary: "no matching sections",
      reasoning:
        "This answer was generated without matching retrieved evidence from the document library.",
    };
  }

  const chunks = sources.map((source) => ({
    chunkIndex: source.chunkIndex,
    score: source.score,
    file: displayFilename(source.file),
    sectionHint: detectSectionHint(source.excerpt),
  }));

  const uniqueDocs = [...new Set(chunks.map((c) => c.file))];
  const uniqueSections = [...new Set(chunks.map((c) => c.sectionHint))];

  const documentSummary =
    uniqueDocs.length === 1
      ? humanizeDocumentName(uniqueDocs[0]!)
      : `${uniqueDocs.length} medical documents`;

  const sectionSummary =
    uniqueSections.length === 1
      ? `the ${uniqueSections[0]} section`
      : `sections covering ${uniqueSections.join(", ")}`;

  const topChunk = chunks[0];
  const summary = `The system retrieved ${sources.length} chunk${sources.length === 1 ? "" : "s"} from ${documentSummary} with up to ${Math.round((topChunk?.score ?? 0) * 100)}% semantic similarity to your question.`;

  const reasoning = buildReasoningText(uniqueSections, documentSummary);

  return {
    summary,
    chunks,
    documentSummary,
    sectionSummary,
    reasoning,
  };
}
