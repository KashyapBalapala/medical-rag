const MAJOR_SECTION_RE = /^(Key Points|Overview|Symptoms)$/i;
const SUB_SECTION_RE =
  /^(Treatment|Diagnosis|Management|Prognosis|Causes|Risk Factors|Complications|Prevention|Monitoring)$/i;

/** Collapse spaces/tabs without merging markdown line breaks. */
function collapseInlineWhitespace(text: string): string {
  return text
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Drop plain-text preamble when the model repeats the same answer in markdown. */
function stripPlaintextPreamble(text: string): string {
  const markdownStart = text.search(/^#{1,3}\s+/m);
  if (markdownStart <= 0) return text;

  const preamble = text.slice(0, markdownStart).trim();
  const body = text.slice(markdownStart).trim();
  if (!preamble || !body) return text;

  return body;
}

/** Fix lines like "# - bullet text" back into list items. */
function repairErroneousBulletHeadings(text: string): string {
  return text.replace(/^#{1,3}\s+(-\s+.+)$/gm, "$1");
}

function normalizeResearchSectionBullets(text: string): string {
  const lines = text.split("\n");
  const out: string[] = [];
  let inSection = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (/^#{1,3}\s+/.test(trimmed)) {
      inSection = /^#{2,3}\s+/.test(trimmed);
      out.push(line);
      continue;
    }

    if (!trimmed) {
      inSection = false;
      out.push("");
      continue;
    }

    if (
      inSection &&
      !trimmed.startsWith("-") &&
      !trimmed.startsWith("*") &&
      !trimmed.startsWith("|")
    ) {
      const labelMatch = trimmed.match(/^([A-Z][A-Za-z\s/&-]{1,50}):\s+(.+)$/);
      if (labelMatch) {
        out.push(`- **${labelMatch[1].trim()}:** ${labelMatch[2].trim()}`);
        continue;
      }

      out.push(`- ${trimmed}`);
      continue;
    }

    out.push(line);
  }

  return out.join("\n");
}

function convertPlainResearchStructure(text: string): string {
  if (/^#{1,3}\s+/m.test(text)) return text;

  const lines = text.split("\n").map((line) => line.trim());
  const nonEmpty = lines.filter(Boolean);
  if (nonEmpty.length < 2) return text;

  const out: string[] = [`# ${nonEmpty[0]}`];
  let index = 1;

  while (index < nonEmpty.length) {
    const line = nonEmpty[index];
    if (MAJOR_SECTION_RE.test(line)) {
      out.push("", `## ${line}`);
      index += 1;
      continue;
    }
    if (SUB_SECTION_RE.test(line)) {
      out.push("", `### ${line}`);
      index += 1;
      continue;
    }

    out.push(`- ${line}`);
    index += 1;
  }

  return out.join("\n");
}

/** Move embedded ##/### headings on the same line onto their own line. */
function splitEmbeddedHeadingsFromLines(text: string): string {
  return text
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (/^#{1,3}\s/.test(trimmed)) return line;

      const match = trimmed.match(/^(.+?)(#{2,3}\s+.+)$/);
      if (!match) return line;

      const body = match[1].trimEnd();
      const heading = match[2].trim();
      if (!body || !heading) return line;

      return `${body}\n\n${heading}`;
    })
    .join("\n");
}

/** Map legacy ## topic / ### section output to # topic / ## section. */
function normalizeResearchHeadingHierarchy(text: string): string {
  let result = text.trim();

  result = result.replace(
    /^(#{2}\s+[^\n#]+?)[ \t]+(#{3}\s+[^\n]+)$/gm,
    (_, topic, section) => {
      const topicText = topic.replace(/^#+\s*/, "").trim();
      const sectionText = section.replace(/^#+\s*/, "").trim();
      return `# ${topicText}\n\n## ${sectionText}`;
    },
  );

  if (!/^#\s+/m.test(result) && /^##\s+/m.test(result)) {
    result = result.replace(/^##\s+([^\n]+)/m, "# $1");
    result = result.replace(/^###\s+([^\n]+)/gm, "## $1");
  }

  return result;
}

/**
 * Normalize research-mode LLM output so headings and lists render in markdown.
 * Hierarchy: # title, ## section, ### subsection.
 */
export function normalizeResearchAnswerMarkdown(text: string): string {
  if (!text.trim()) return text;

  let result = text.trim();
  result = repairErroneousBulletHeadings(result);
  result = stripPlaintextPreamble(result);
  result = convertPlainResearchStructure(result);
  result = splitEmbeddedHeadingsFromLines(result);
  result = normalizeResearchHeadingHierarchy(result);
  result = normalizeResearchSectionBullets(result);
  result = repairErroneousBulletHeadings(result);

  return collapseInlineWhitespace(result);
}
