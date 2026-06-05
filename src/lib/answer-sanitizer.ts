const META_PARAGRAPH_RE =
  /^(?:Based on the conversation history|According to Context \d|I can see that the current question|From the conversation history|Looking at the (?:context|conversation)|The current question is asking)/i;

const META_INLINE_RE =
  /\b(?:based on (?:the )?conversation history|according to Context \d+(?:\s+and\s+Context \d+)*|as (?:per|mentioned in) (?:the )?(?:previous|earlier) conversation)\b/gi;

const TABLE_REF_RE = /\bTable\s+(\d+)\b/gi;
const FIGURE_REF_RE = /\bFigure\s+(\d+)\b/gi;

const TABLE_DATA_INDICATORS_RE =
  /\b(?:mmol\/l|mg\/dl|mg\/dL|≥|<=|>|<|\d+\.\d+\s*(?:mmol|mg)|fasting\s+(?:blood\s+)?glucose)\b/i;

function tableLabelInContext(context: string, tableNum: number): boolean {
  const pattern = new RegExp(`\\bTable\\s+${tableNum}\\b`, "i");
  return pattern.test(context);
}

/** True when context includes a table label with nearby numeric or unit data. */
export function contextContainsTableData(
  context: string,
  tableNum: number,
): boolean {
  if (!tableLabelInContext(context, tableNum)) return false;

  const pattern = new RegExp(
    `Table\\s+${tableNum}[^]{0,400}`,
    "i",
  );
  const snippet = context.match(pattern)?.[0] ?? "";
  if (!snippet) return false;

  return TABLE_DATA_INDICATORS_RE.test(snippet) || /\d/.test(snippet);
}

function contextContainsFigureData(
  context: string,
  figureNum: number,
): boolean {
  const pattern = new RegExp(
    `Figure\\s+${figureNum}[^]{0,200}`,
    "i",
  );
  const snippet = context.match(pattern)?.[0] ?? "";
  if (!snippet) return false;

  return snippet.length > `Figure ${figureNum}`.length + 10;
}

function collectReferenceNumbers(
  text: string,
  pattern: RegExp,
): number[] {
  const numbers = new Set<number>();
  for (const match of text.matchAll(pattern)) {
    const num = Number(match[1]);
    if (Number.isFinite(num)) numbers.add(num);
  }
  return [...numbers];
}

/** Remove dangling table/figure labels when context lacks the referenced data. */
export function stripDanglingTableReferences(
  answer: string,
  context: string,
): string {
  if (!answer.trim() || !context.trim()) return answer;

  let result = answer;

  for (const tableNum of collectReferenceNumbers(result, TABLE_REF_RE)) {
    if (contextContainsTableData(context, tableNum)) continue;

    result = result
      .replace(
        new RegExp(
          `\\s*,?\\s*(?:as\\s+)?shown\\s+in\\s+Table\\s+${tableNum}\\b`,
          "gi",
        ),
        "",
      )
      .replace(
        new RegExp(`\\s*\\(?see\\s+Table\\s+${tableNum}\\)?`, "gi"),
        "",
      )
      .replace(
        new RegExp(
          `\\s+in\\s+the\\s+diagnostic\\s+range\\s+shown\\s+in\\s+Table\\s+${tableNum}\\b`,
          "gi",
        ),
        " based on the diagnostic criteria in the documents",
      )
      .replace(
        new RegExp(`\\s+in\\s+Table\\s+${tableNum}\\b`, "gi"),
        "",
      )
      .replace(new RegExp(`\\bTable\\s+${tableNum}\\b`, "gi"), "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.])/g, "$1")
      .trim();
  }

  for (const figureNum of collectReferenceNumbers(result, FIGURE_REF_RE)) {
    if (contextContainsFigureData(context, figureNum)) continue;

    result = result
      .replace(
        new RegExp(
          `\\s*,?\\s*(?:as\\s+)?shown\\s+in\\s+Figure\\s+${figureNum}\\b`,
          "gi",
        ),
        "",
      )
      .replace(
        new RegExp(`\\s*\\(?see\\s+Figure\\s+${figureNum}\\)?`, "gi"),
        "",
      )
      .replace(new RegExp(`\\bFigure\\s+${figureNum}\\b`, "gi"), "")
      .replace(/[ \t]{2,}/g, " ")
      .replace(/\s+([,.])/g, "$1")
      .trim();
  }

  return result;
}

/** Strip RAG/meta phrasing so answers read like natural chat replies. */
export function sanitizePublicAnswer(text: string, context?: string): string {
  const trimmed = text.trim();
  if (!trimmed) return text;

  const paragraphs = trimmed
    .split(/\n\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  const kept = paragraphs.filter((paragraph) => {
    if (META_PARAGRAPH_RE.test(paragraph)) return false;
    if (
      /^In other words,/i.test(paragraph) &&
      /not explicitly listed|conversation history|Context \d/i.test(paragraph)
    ) {
      return false;
    }
    return true;
  });

  let answer = (kept.length > 0 ? kept : paragraphs).join("\n\n");

  answer = answer
    .replace(/\bContext \d+(?:\s+and\s+Context \d+)*/gi, "the documents")
    .replace(META_INLINE_RE, "")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  if (context) {
    answer = stripDanglingTableReferences(answer, context);
  }

  return answer || trimmed;
}
