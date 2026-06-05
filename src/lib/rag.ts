import { sanitizePublicAnswer } from "./answer-sanitizer";
import { searchDocuments, type SearchResult } from "./retrieve";
import { getRagModelInfo, type RagModelInfo } from "./rag-config";
import { generateRetrievalPlan } from "./research/planner";
import {
  buildComparisonTopicContext,
  buildTopicContext,
  mapChunksByLabelToTopics,
} from "./research/context-builder";
import { hybridRetrieve } from "./search/hybrid";
import { isHybridRetrievalEnabled } from "./search/config";
import {
  getClassificationLimits,
  RETRIEVAL_CONFIG,
  type QueryClassification,
} from "./search/retrieval.config";
import type { HybridRetrievalDebug } from "./search/types";
import {
  buildPromptHistorySection,
  buildRetrievalQuery,
  type ConversationTurn,
} from "./conversation";
import { extractTopicFromQuestion } from "./memory-service";
import {
  capitalizeTopic,
  COMPARISON_PER_TOPIC_K,
  extractComparisonAspect,
  extractQuestionAspect,
  extractResearchTopics,
  buildTopicRetrievalQuery,
  groupSourcesByTopic,
  RESEARCH_PER_TOPIC_K,
  RESEARCH_TOP_K,
  shouldUseComparisonMode,
} from "./research-mode";
import type { TopicSourceGroup } from "@/types/comparison";
import {
  ragLog,
  ragLogSection,
  ragLogTiming,
  ragStreamNewline,
  ragStreamWrite,
  startProgressHeartbeat,
  startTimer,
  elapsedMs,
} from "./logger";

const TOP_K = 3;
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL ?? "http://localhost:11434";
/** Production default — best RAG instruction-following in the 7B class. Fast fallback: llama3.2:3b */
const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
/** Optional faster model for hybrid direct_qa / follow_up on CPU (e.g. llama3.2:3b). */
const OLLAMA_FAST_MODEL = process.env.OLLAMA_FAST_MODEL?.trim() || undefined;
const OLLAMA_TIMEOUT_MS = Number(process.env.OLLAMA_TIMEOUT_MS ?? "300000");
/** Research synthesis uses more context and a longer structured answer. */
const RESEARCH_OLLAMA_TIMEOUT_MS = Number(
  process.env.RESEARCH_OLLAMA_TIMEOUT_MS ?? "360000",
);
/** Comparison mode retrieves 10 chunks and generates a long structured report. */
const COMPARISON_OLLAMA_TIMEOUT_MS = Number(
  process.env.COMPARISON_OLLAMA_TIMEOUT_MS ?? "480000",
);
const RESEARCH_CHUNK_MAX_CHARS = 650;
const COMPARISON_CHUNK_MAX_CHARS = 500;
/** Default off. Set OLLAMA_THINK=true or pass think: true to see reasoning. */
const OLLAMA_THINK = process.env.OLLAMA_THINK === "true";

const OLLAMA_OPTIONS = {
  temperature: 0,
};

const NOT_FOUND_ANSWER =
  "I could not find this information in the uploaded documents.";

const TABLE_FIGURE_RULES = `Tables and figures (strict):
- If excerpts contain tabular data (e.g. diagnostic thresholds, glucose values), reproduce the values inline — prefer a short markdown table.
- Do not write "Table 1", "Figure 2", "as shown in Table…", or "see Table…" unless that table or figure's data appears in the excerpts.
- If only a table reference appears without the data, state the criteria in plain prose and omit the table label.`;

const ANSWER_STYLE_RULES = `Answer style (strict):
- Reply directly to the user in plain, natural language.
- Never mention "Context 1", chunk numbers, or how you interpreted the question.
- Never say "based on the conversation history", "according to the context", or similar meta phrases.
- Use conversation history silently only to resolve pronouns like "its" or "they".
- Give only the answer — no preamble or reasoning about your process.

${TABLE_FIGURE_RULES}`;

export interface RagSource {
  file: string;
  score: number;
  chunkIndex: number;
  excerpt: string;
}

export interface RagResponse {
  answer: string;
  sources: RagSource[];
  comparisonMode?: boolean;
  comparisonTopics?: string[];
  topicSources?: TopicSourceGroup[];
}

export type RagTimings = {
  retrievalMs: number;
  contextMs: number;
  ollamaMs: number;
  totalMs: number;
};

/** Extra fields when using askQuestion with options.log or options.includeDetails */
export type RagResponseDetails = RagResponse & {
  thinking?: string;
  chunks: SearchResult[];
  timings: RagTimings;
  prompt: string;
  models: RagModelInfo;
  hybridRetrieval?: HybridRetrievalDebug;
};

export { getRagModelInfo, type RagModelInfo };

export function buildRagPrompt(
  question: string,
  chunks: SearchResult[],
  history: ConversationTurn[] = [],
  researchMode = false,
  comparisonMode = false,
  comparisonTopics: string[] = [],
): string {
  const context = comparisonMode
    ? buildComparisonContext(groupChunksByTopic(chunks, comparisonTopics))
    : buildContext(chunks, researchMode);
  return buildUserPrompt(
    question,
    context,
    history,
    OLLAMA_MODEL,
    OLLAMA_THINK,
    researchMode,
    comparisonMode,
    comparisonTopics,
  );
}

export type { ConversationTurn };

export type AskQuestionOptions = {
  topK?: number;
  ollamaBaseUrl?: string;
  model?: string;
  timeoutMs?: number;
  think?: boolean;
  /** Verbose pipeline logs + returns RagResponseDetails */
  log?: boolean;
  /** Return chunks and timings without enabling logs */
  includeDetails?: boolean;
  /** Prior conversation turns for follow-up questions */
  history?: ConversationTurn[];
  /** Multi-document synthesis with structured sections and comparison table */
  researchMode?: boolean;
  /** Side-by-side comparison of two extracted topics */
  comparisonMode?: boolean;
  comparisonTopics?: string[];
  /** Use topic-grouped context labels (hybrid retrieval V2) */
  useHybridContext?: boolean;
  /** Planner classification when hybrid retrieval is active */
  hybridClassification?: QueryClassification;
};

type OllamaChatMessage = {
  role?: string;
  content?: string;
  thinking?: string;
};

type OllamaChatResponse = {
  message?: OllamaChatMessage;
  error?: string;
};

type OllamaCallResult = {
  answer: string;
  thinking?: string;
};

function validateQuestion(question: string): string {
  const trimmed = question.trim();

  if (!trimmed) {
    throw new Error("Question must be a non-empty string");
  }

  if (trimmed.length > 2000) {
    throw new Error("Question exceeds maximum length of 2000 characters");
  }

  return trimmed;
}

function groupChunksByTopic(
  chunks: SearchResult[],
  topics: string[],
): Map<string, SearchResult[]> {
  const map = new Map<string, SearchResult[]>();
  for (const topic of topics) {
    map.set(topic, []);
  }

  const topicMatchers = topics.map((topic) => ({
    topic,
    pattern: new RegExp(topic.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
  }));

  for (const chunk of chunks) {
    const text = `${chunk.metadata.filename} ${chunk.content}`.toLowerCase();
    let assigned = false;

    for (const { topic, pattern } of topicMatchers) {
      if (pattern.test(text)) {
        map.get(topic)?.push(chunk);
        assigned = true;
        break;
      }
    }

    if (!assigned && topics.length > 0) {
      map.get(topics[0])?.push(chunk);
    }
  }

  return map;
}

function buildComparisonContext(chunksByTopic: Map<string, SearchResult[]>): string {
  return [...chunksByTopic.entries()]
    .map(([topic, topicChunks]) => {
      const blocks = topicChunks
        .map((chunk, index) =>
          formatChunkBlock(chunk, index + 1, COMPARISON_CHUNK_MAX_CHARS),
        )
        .join("\n\n");
      return `=== Topic: ${capitalizeTopic(topic)} ===\n${blocks || "(no chunks retrieved)"}`;
    })
    .join("\n\n---\n\n");
}

function buildContext(chunks: SearchResult[], groupByDocument = false): string {
  const maxContentChars = groupByDocument ? RESEARCH_CHUNK_MAX_CHARS : undefined;

  if (!groupByDocument) {
    return chunks
      .map((chunk, index) => formatChunkBlock(chunk, index + 1, maxContentChars))
      .join("\n\n---\n\n");
  }

  const byFile = new Map<string, SearchResult[]>();
  for (const chunk of chunks) {
    const file = chunk.metadata.filename;
    const list = byFile.get(file) ?? [];
    list.push(chunk);
    byFile.set(file, list);
  }

  return [...byFile.entries()]
    .map(([filename, fileChunks]) => {
      const blocks = fileChunks
        .map((chunk, index) => formatChunkBlock(chunk, index + 1, maxContentChars))
        .join("\n\n");
      return `=== Document: ${filename} ===\n${blocks}`;
    })
    .join("\n\n---\n\n");
}

function formatChunkBlock(
  chunk: SearchResult,
  index: number,
  maxContentChars?: number,
): string {
  const { filename, chunkIndex } = chunk.metadata;
  let content = chunk.content.trim();
  if (maxContentChars && content.length > maxContentChars) {
    content = `${content.slice(0, maxContentChars).trimEnd()}…`;
  }
  return [`[${filename} · excerpt ${index}]`, content].join("\n");
}

function toExcerpt(content: string, maxLength = 220): string {
  const normalized = content.trim().replace(/\s+/g, " ");
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength).trimEnd()}...`;
}

function toSources(chunks: SearchResult[]): RagSource[] {
  return chunks.map((chunk) => ({
    file: chunk.metadata.filename,
    score: chunk.similarityScore,
    chunkIndex: chunk.metadata.chunkIndex,
    excerpt: toExcerpt(chunk.content),
  }));
}

function logRetrievedChunks(chunks: SearchResult[]): void {
  ragLogSection(`RETRIEVED CHUNKS (${chunks.length})`);

  for (const [i, chunk] of chunks.entries()) {
    const { filename, chunkIndex } = chunk.metadata;
    console.error(
      `Chunk ${i + 1}  |  ${filename}  |  index ${chunkIndex}  |  score ${chunk.similarityScore}`,
    );
    console.error("─".repeat(60));
    console.error(chunk.content.trim());
    console.error("");
  }
}

const THINK_OPEN = "<" + "think>";
const THINK_CLOSE = "</" + "think>";
const THINK_BLOCK_RE = new RegExp(
  `${THINK_OPEN}([\\s\\S]*?)${THINK_CLOSE}`,
  "i",
);
const THINK_CLOSE_TAG_RE = /<\/think>|<\/redacted_thinking>/gi;

/** Qwen3 often puts reasoning in `content` then closes with  before the real answer. */
function extractAnswer(message: OllamaChatMessage, context?: string): string {
  let content = message.content?.trim() ?? "";

  if (message.thinking?.trim()) {
    content = content.replace(THINK_BLOCK_RE, "").trim();
  }

  const closedParts = content.split(THINK_CLOSE_TAG_RE);
  if (closedParts.length > 1) {
    content = closedParts[closedParts.length - 1]?.trim() ?? content;
  } else if (THINK_BLOCK_RE.test(content)) {
    const parts = content.split(new RegExp(THINK_CLOSE, "i"));
    content = parts[parts.length - 1]?.trim() ?? content;
  }

  content = stripLeadingMetaReasoning(content);

  return sanitizePublicAnswer(
    content.replace(/\/no_think\s*$/i, "").trim(),
    context,
  );
}

function stripLeadingMetaReasoning(text: string): string {
  const metaLead =
    /^(Hmm,|Okay,|Let me |The user |I need to |Looking at|I'll |I should |For the answer)/i;
  if (!metaLead.test(text)) {
    return text;
  }

  const answerStart = text.search(
    /\n\n(?:(?:Based on|Increased|Frequent|Excessive|Blurry|Weight|Numbness|Easy|Passing|Becoming|Difficulty)[^\n]{0,80})/i,
  );
  if (answerStart !== -1) {
    return text.slice(answerStart).trim();
  }

  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const last = paragraphs[paragraphs.length - 1];
  if (last && last.length < 600 && !metaLead.test(last)) {
    return last;
  }

  return text;
}

function extractThinking(message: OllamaChatMessage): string | undefined {
  if (message.thinking?.trim()) {
    return message.thinking.trim();
  }

  const content = message.content ?? "";
  const match = content.match(THINK_BLOCK_RE);
  if (match?.[1]?.trim()) {
    return match[1].trim();
  }

  return undefined;
}

/** Qwen3 reasoning models — need /no_think and think:false for RAG. */
function isQwen3Model(model: string): boolean {
  return /qwen3/i.test(model);
}

function buildUserPrompt(
  question: string,
  context: string,
  history: ConversationTurn[],
  model: string,
  enableThink: boolean,
  researchMode = false,
  comparisonMode = false,
  comparisonTopics: string[] = [],
  hybridContext = false,
): string {
  const contextLabel = hybridContext
    ? "Context (grouped by topic):"
    : researchMode
      ? "Context (grouped by document):"
      : "Document excerpts:";
  const noThinkPrefix =
    isQwen3Model(model) && !enableThink ? "/no_think\n" : "";

  const historySection = buildPromptHistorySection(history, question);

  if (comparisonMode && comparisonTopics.length >= 2) {
    const [topicA, topicB] = comparisonTopics.map(capitalizeTopic);
    const aspect = extractComparisonAspect(question);

    return `${noThinkPrefix}You are a medical research assistant comparing conditions across multiple PDF documents.

Use ONLY the context below. Output markdown in EXACTLY this structure:

# Comparison

## ${topicA}

### Symptoms
- ...

### Diagnosis
- ...

### Treatment
- ...

## ${topicB}

### Symptoms
- ...

### Diagnosis
- ...

### Treatment
- ...

## Key Differences

| Category | ${topicA} | ${topicB} |
|----------|-----------|-----------|
| Symptoms | ... | ... |
| Diagnosis | ... | ... |
| Treatment | ... | ... |

Rules:
- Fill Symptoms, Diagnosis, and Treatment for each topic.
- Use 3–5 concise bullet points per subsection (no long paragraphs).
- End with the Key Differences table (at least Symptoms, Diagnosis, Treatment rows).
- If a subsection has no support in context, write "Not found in uploaded documents."
- If context is insufficient overall, say: "${NOT_FOUND_ANSWER}"
${TABLE_FIGURE_RULES}
${aspect ? `- Focus the comparison on ${aspect} where relevant.\n` : ""}
${historySection}Context (grouped by topic):
${context}

Answer:`;
  }

  if (researchMode && comparisonTopics.length >= 2) {
    const [topicA, topicB] = comparisonTopics.map(capitalizeTopic);
    const aspect = extractComparisonAspect(question);

    return `${noThinkPrefix}You are a medical research assistant. Synthesize ONLY from the context below.

Use this markdown structure (keep bullets concise):

## ${topicA}
### Symptoms
- ...

### Diagnosis
- ...

## ${topicB}
### Symptoms
- ...

### Diagnosis
- ...

## Comparison Table

| Aspect | ${topicA} | ${topicB} |
|--------|-----------|-----------|
| Symptoms | ... | ... |
| Diagnosis | ... | ... |

Rules:
- Cover exactly these two topics: ${topicA} and ${topicB}.
- Use Symptoms and Diagnosis under each topic.
- End with the comparison table.
- If unsupported, write "Not found in uploaded documents."
- If context is insufficient overall, say: "${NOT_FOUND_ANSWER}"
${TABLE_FIGURE_RULES}
${aspect ? `- Focus on ${aspect} where relevant.\n` : ""}
${historySection}${contextLabel}
${context}

Answer:`;
  }

  if (researchMode) {
    const topic =
      extractTopicFromQuestion(question) ??
      comparisonTopics[0] ??
      "the condition";
    const aspect = extractQuestionAspect(question);
    const sectionHeading = aspect ? capitalizeTopic(aspect) : "Key Points";

    return `${noThinkPrefix}You are a medical research assistant. Synthesize ONLY from the context below.

Answer the Current Question about ${capitalizeTopic(topic)} only.

Use this markdown structure (keep bullets concise):

## ${capitalizeTopic(topic)}

### ${sectionHeading}
- ...

Rules:
- Focus ONLY on ${capitalizeTopic(topic)}. Do NOT discuss other conditions.
- Do NOT create a comparison table.
- Do NOT invent a second topic.
- Include only sections supported by the context.
- If unsupported, write "Not found in uploaded documents."
- If context is insufficient overall, say: "${NOT_FOUND_ANSWER}"
${TABLE_FIGURE_RULES}

${historySection}${contextLabel}
${context}

Answer:`;
  }

  if (history.length > 0) {
    return `${noThinkPrefix}You are a medical document assistant continuing an existing chat.

Answer the Current Question using ONLY the document excerpts below.

${ANSWER_STYLE_RULES}

If the excerpts do not contain the answer, say exactly:
"${NOT_FOUND_ANSWER}"

${historySection}Document excerpts:
${context}

Answer directly to the user:`;
  }

  return `${noThinkPrefix}You are a medical document assistant.

Answer using only the document excerpts below.

${ANSWER_STYLE_RULES}

If the excerpts do not contain the answer, say exactly:
"${NOT_FOUND_ANSWER}"

${historySection}Document excerpts:
${context}

Answer directly to the user:`;
}

function resolveOllamaModel(
  model: string,
  hybridClassification?: QueryClassification,
): string {
  if (
    OLLAMA_FAST_MODEL &&
    hybridClassification &&
    (hybridClassification === "direct_qa" ||
      hybridClassification === "follow_up")
  ) {
    return OLLAMA_FAST_MODEL;
  }
  return model;
}

function wrapOllamaFetchError(
  error: unknown,
  baseUrl: string,
  model: string,
  timeoutMs: number,
): Error {
  const message = error instanceof Error ? error.message : String(error);
  const isTimeout =
    /timeout|aborted|fetch failed|ECONNRESET|ETIMEDOUT|socket hang up/i.test(
      message,
    );
  const hint = isTimeout
    ? ` Request failed after ~5 min — Ollama aborts slow non-streaming calls by default. Restart Ollama with OLLAMA_LOAD_TIMEOUT=30m, or use streaming (now default). For simple questions set OLLAMA_FAST_MODEL=llama3.2:3b and turn off Research mode. Client timeout: ${timeoutMs}ms.`
    : "";
  return new Error(
    `Failed to reach Ollama at ${baseUrl} (model "${model}"). ${message}${hint}`,
  );
}

function buildOllamaOptions(
  comparisonMode: boolean,
  researchMode: boolean,
  hybridClassification?: QueryClassification,
): Record<string, number> {
  const options: Record<string, number> = { temperature: 0 };

  if (hybridClassification) {
    options.num_predict =
      getClassificationLimits(hybridClassification).numPredict;
    return options;
  }

  if (comparisonMode) {
    options.num_predict = 1400;
  } else if (researchMode) {
    options.num_predict = 1000;
  }

  return options;
}

function buildOllamaBody(
  model: string,
  userPrompt: string,
  enableThink: boolean,
  stream: boolean,
  ollamaOptions: Record<string, number> = OLLAMA_OPTIONS,
): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    stream,
    options: ollamaOptions,
    messages: [{ role: "user", content: userPrompt }],
  };

  // Qwen3 is a reasoning model — must disable unless explicitly enabled
  if (isQwen3Model(model)) {
    body.think = enableThink;
  }

  return body;
}

type OllamaStreamChunk = {
  message?: OllamaChatMessage;
  done?: boolean;
  error?: string;
};

async function callOllamaStreaming(
  url: string,
  body: Record<string, unknown>,
  timeoutMs: number,
  log: boolean,
  think: boolean,
  ollamaStart: number,
  context: string,
): Promise<OllamaCallResult> {
  if (log) {
    ragLog(
      "Step 3/3 — Ollama streaming",
      "tokens below on stdout; status lines on stderr",
    );
    ragLogSection(think ? "OLLAMA THINKING (live)" : "OLLAMA ANSWER (live)");
  }

  const waitHeartbeat = startProgressHeartbeat(
    "Step 3/3 — Ollama waiting for first token",
    ollamaStart,
  );

  let response: Response;

  try {
    response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...body, stream: true }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    clearInterval(waitHeartbeat);
    const model =
      typeof body.model === "string" ? body.model : OLLAMA_MODEL;
    const baseUrl = url.replace(/\/api\/chat$/, "");
    throw wrapOllamaFetchError(error, baseUrl, model, timeoutMs);
  }

  clearInterval(waitHeartbeat);

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Ollama request failed (${response.status}): ${errText}`);
  }

  if (!response.body) {
    throw new Error("Ollama returned an empty stream");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let thinkingAcc = "";
  let contentAcc = "";
  let firstTokenLogged = false;
  let answerHeaderPrinted = false;
  const streamHeartbeat = log
    ? startProgressHeartbeat("Step 3/3 — Ollama streaming", ollamaStart, 20000)
    : null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        let chunk: OllamaStreamChunk;
        try {
          chunk = JSON.parse(trimmed) as OllamaStreamChunk;
        } catch {
          continue;
        }

        if (chunk.error) {
          throw new Error(chunk.error);
        }

        const deltaThinking = chunk.message?.thinking ?? "";
        const deltaContent = chunk.message?.content ?? "";

        if (deltaThinking) {
          if (log && !firstTokenLogged) {
            firstTokenLogged = true;
            ragLogTiming("Step 3/3 — Ollama first token", ollamaStart);
          }
          thinkingAcc += deltaThinking;
          if (log) ragStreamWrite(deltaThinking);
        }

        if (deltaContent) {
          if (log && !firstTokenLogged) {
            firstTokenLogged = true;
            ragLogTiming("Step 3/3 — Ollama first token", ollamaStart);
          }
          if (log && think && !answerHeaderPrinted) {
            answerHeaderPrinted = true;
            ragStreamNewline();
            ragLogSection("OLLAMA ANSWER (live)");
          }
          contentAcc += deltaContent;
          if (log) ragStreamWrite(deltaContent);
        }
      }
    }
  } finally {
    if (streamHeartbeat) clearInterval(streamHeartbeat);
  }

  if (log) {
    ragStreamNewline();
    ragLogTiming("Step 3/3 — Ollama stream complete", ollamaStart);
  }

  const message: OllamaChatMessage = {
    thinking: thinkingAcc || undefined,
    content: contentAcc,
  };

  const thinking = extractThinking(message) ?? (thinkingAcc || undefined);
  const answer = extractAnswer(message, context);

  if (!answer) {
    throw new Error("Ollama returned an empty answer");
  }

  if (log) {
    ragLog("Ollama answer ready", `${answer.length} characters`);
  }

  return { answer, thinking };
}

async function callOllama(
  question: string,
  context: string,
  history: ConversationTurn[],
  options: AskQuestionOptions,
): Promise<OllamaCallResult> {
  const baseUrl = (options.ollamaBaseUrl ?? OLLAMA_BASE_URL).replace(/\/$/, "");
  const model = resolveOllamaModel(
    options.model ?? OLLAMA_MODEL,
    options.hybridClassification,
  );
  const think = options.think ?? OLLAMA_THINK;
  const log = options.log ?? process.env.RAG_LOG === "true";
  const researchMode = options.researchMode === true;
  const comparisonMode = options.comparisonMode === true;
  const comparisonTopics = options.comparisonTopics ?? [];
  const timeoutMs = options.timeoutMs ?? resolveOllamaTimeout(options);
  const ollamaOptions = buildOllamaOptions(
    comparisonMode,
    researchMode,
    options.hybridClassification,
  );
  const url = `${baseUrl}/api/chat`;

  const enableThink = think === true;
  const userPrompt = buildUserPrompt(
    question,
    context,
    history,
    model,
    enableThink,
    researchMode,
    comparisonMode,
    comparisonTopics,
    options.useHybridContext === true,
  );
  if (log) {
    const modelNote =
      model !== (options.model ?? OLLAMA_MODEL)
        ? ` (fast model for ${options.hybridClassification})`
        : "";
    ragLog(
      "Step 3/3 — Call Ollama",
      `POST ${url} | model=${model}${modelNote} | think=${enableThink} | stream=true | timeout=${timeoutMs}ms | num_predict=${ollamaOptions.num_predict ?? "default"}`,
    );
    ragLog(
      "Ollama request payload",
      JSON.stringify(
        buildOllamaBody(model, userPrompt, enableThink, true, ollamaOptions),
        null,
        2,
      ),
    );
  }

  const ollamaStart = startTimer();

  // Always stream — Ollama returns 500 at ~5 min for slow non-streaming prefill on CPU.
  return callOllamaStreaming(
    url,
    buildOllamaBody(model, userPrompt, enableThink, true, ollamaOptions),
    timeoutMs,
    log,
    enableThink,
    ollamaStart,
    context,
  );
}

function resolveOllamaTimeout(options: AskQuestionOptions): number {
  if (options.timeoutMs != null) return options.timeoutMs;
  if (isHybridRetrievalEnabled()) return RETRIEVAL_CONFIG.ollama.timeoutMs;
  if (options.comparisonMode) return COMPARISON_OLLAMA_TIMEOUT_MS;
  if (options.researchMode) return RESEARCH_OLLAMA_TIMEOUT_MS;
  return OLLAMA_TIMEOUT_MS;
}

type ComparisonRetrievalResult = {
  chunks: SearchResult[];
  chunksByTopic: Map<string, SearchResult[]>;
};

async function retrieveChunksForComparison(
  question: string,
  topics: string[],
  log: boolean,
): Promise<ComparisonRetrievalResult> {
  const aspect = extractComparisonAspect(question);
  const queries = topics.map((topic) =>
    buildTopicRetrievalQuery(topic, aspect),
  );

  if (log) {
    ragLog(
      "Comparison retrieval",
      `${topics.length} topics × ${COMPARISON_PER_TOPIC_K} chunks — ${queries.join(" | ")}`,
    );
  }

  const resultSets = await Promise.all(
    queries.map((query) =>
      searchDocuments(query, { topK: COMPARISON_PER_TOPIC_K, log: false }),
    ),
  );

  const chunksByTopic = new Map<string, SearchResult[]>();
  const seen = new Set<string>();
  const merged: SearchResult[] = [];

  topics.forEach((topic, index) => {
    const hits = resultSets[index] ?? [];
    chunksByTopic.set(topic, hits);

    for (const chunk of hits) {
      if (seen.has(chunk.id)) continue;
      seen.add(chunk.id);
      merged.push(chunk);
    }
  });

  return { chunks: merged, chunksByTopic };
}

async function retrieveChunksForResearch(
  question: string,
  searchQuery: string,
  log: boolean,
): Promise<SearchResult[]> {
  const topics = extractResearchTopics(question);
  const explicitTopic = extractTopicFromQuestion(question);
  const aspect = extractQuestionAspect(question);

  let queries: string[];
  if (topics.length >= 2) {
    queries = [
      searchQuery,
      ...topics.map(
        (topic) => `${topic} symptoms diagnosis treatment complications`,
      ),
    ];
  } else if (explicitTopic) {
    queries = [buildTopicRetrievalQuery(explicitTopic, aspect ?? undefined)];
  } else {
    queries = [searchQuery];
  }

  if (log) {
    ragLog("Research retrieval", `${queries.length} parallel queries`);
  }

  const resultSets = await Promise.all(
    queries.map((query) =>
      searchDocuments(query, { topK: RESEARCH_PER_TOPIC_K, log: false }),
    ),
  );

  const seen = new Set<string>();
  const merged: SearchResult[] = [];

  for (const hits of resultSets) {
    for (const chunk of hits) {
      if (seen.has(chunk.id)) continue;
      seen.add(chunk.id);
      merged.push(chunk);
    }
  }

  return merged
    .sort((a, b) => b.similarityScore - a.similarityScore)
    .slice(0, RESEARCH_TOP_K);
}

/**
 * RAG pipeline: retrieve relevant chunks from ChromaDB, then generate an answer with Ollama.
 */
export async function askQuestion(
  question: string,
  options: AskQuestionOptions = {},
): Promise<RagResponse | RagResponseDetails> {
  const log = options.log ?? process.env.RAG_LOG === "true";
  const totalStart = startTimer();
  const query = validateQuestion(question);
  const history = options.history ?? [];
  const researchMode = options.researchMode === true;
  const comparisonTopics = extractResearchTopics(query);
  const comparisonMode =
    options.comparisonMode ??
    shouldUseComparisonMode(query, researchMode);
  const topK = options.topK ?? (researchMode ? RESEARCH_TOP_K : TOP_K);
  const searchQuery = buildRetrievalQuery(query, history);

  if (log) {
    ragLog(
      "Pipeline start",
      `question="${query}" history=${history.length} turns research=${researchMode} comparison=${comparisonMode} topics=${comparisonTopics.join(",")}`,
    );
    if (history.length > 0) {
      ragLog("Contextualized retrieval query", `"${searchQuery.slice(0, 120)}..."`);
    }
  }

  const retrievalStart = startTimer();
  let chunks: SearchResult[];
  let chunksByTopic: Map<string, SearchResult[]> | undefined;
  let chunksByLabel: Map<string, SearchResult[]> | undefined;
  let hybridRetrieval: HybridRetrievalDebug | undefined;
  let hybridClassification: QueryClassification | undefined;
  const useHybrid = isHybridRetrievalEnabled();

  try {
    if (useHybrid) {
      const planStart = startTimer();
      const plan = generateRetrievalPlan(query, history, {
        researchMode,
        comparisonMode,
        comparisonTopics,
      });
      hybridClassification = plan.classification;
      const planningMs = elapsedMs(planStart);
      const hybridResult = await hybridRetrieve(plan, {
        log,
        planningMs,
      });
      chunks = hybridResult.chunks;
      chunksByLabel = hybridResult.chunksByLabel;
      hybridRetrieval = hybridResult.diagnostics;

      if (comparisonMode && comparisonTopics.length >= 2) {
        chunksByTopic = mapChunksByLabelToTopics(
          chunksByLabel,
          comparisonTopics,
        );
      }
    } else if (comparisonMode && comparisonTopics.length >= 2) {
      const comparisonResult = await retrieveChunksForComparison(
        query,
        comparisonTopics,
        log,
      );
      chunks = comparisonResult.chunks;
      chunksByTopic = comparisonResult.chunksByTopic;
    } else if (researchMode) {
      chunks = await retrieveChunksForResearch(query, searchQuery, log);
    } else {
      chunks = await searchDocuments(searchQuery, { topK, log });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Retrieval failed: ${message}`);
  }

  const retrievalMs = elapsedMs(retrievalStart);

  if (chunks.length === 0) {
    if (log) {
      ragLog("Pipeline end", "no chunks found");
    }
    const empty: RagResponse = {
      answer: NOT_FOUND_ANSWER,
      sources: [],
      comparisonMode: comparisonMode && comparisonTopics.length >= 2,
      comparisonTopics:
        comparisonMode && comparisonTopics.length >= 2
          ? comparisonTopics
          : undefined,
      topicSources: [],
    };
    if (!log && !options.includeDetails) return empty;
    return {
      ...empty,
      chunks: [],
      timings: {
        retrievalMs,
        contextMs: 0,
        ollamaMs: 0,
        totalMs: elapsedMs(totalStart),
      },
      prompt: buildUserPrompt(
        query,
        "",
        history,
        OLLAMA_MODEL,
        OLLAMA_THINK,
        researchMode,
        comparisonMode,
        comparisonTopics,
        useHybrid,
      ),
      models: getRagModelInfo(),
      hybridRetrieval,
    };
  }

  const contextStart = startTimer();
  const contextOptions = hybridClassification
    ? { classification: hybridClassification }
    : {};
  let context: string;
  if (useHybrid && chunksByLabel) {
    context =
      comparisonMode && comparisonTopics.length >= 2
        ? buildComparisonTopicContext(
            chunksByLabel,
            comparisonTopics,
            contextOptions,
          )
        : buildTopicContext(chunksByLabel, contextOptions);
  } else if (comparisonMode && comparisonTopics.length >= 2 && chunksByTopic) {
    context = buildComparisonContext(chunksByTopic);
  } else {
    context = buildContext(chunks, researchMode);
  }
  const contextMs = elapsedMs(contextStart);

  if (log) {
    ragLogTiming("Build context", contextStart, `${context.length} chars from ${chunks.length} chunks`);
    logRetrievedChunks(chunks);
  }

  let answer: string;
  let thinking: string | undefined;
  const ollamaStart = startTimer();

  try {
    const ollamaResult = await callOllama(query, context, history, {
      ...options,
      researchMode,
      comparisonMode,
      comparisonTopics,
      useHybridContext: useHybrid,
      hybridClassification,
      timeoutMs: resolveOllamaTimeout({
        ...options,
        researchMode,
        comparisonMode,
      }),
    });
    answer = ollamaResult.answer;
    thinking = ollamaResult.thinking;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`LLM generation failed: ${message}`);
  }

  const ollamaMs = elapsedMs(ollamaStart);
  const totalMs = elapsedMs(totalStart);

  if (log) {
    ragLog("Pipeline complete", `total ${totalMs}ms (retrieval ${retrievalMs}ms | context ${contextMs}ms | ollama ${ollamaMs}ms)`);
  }

  const topicSources =
    comparisonMode && chunksByTopic
      ? groupSourcesByTopic(chunksByTopic, (chunk) => ({
          file: chunk.metadata.filename,
          score: chunk.similarityScore,
          chunkIndex: chunk.metadata.chunkIndex,
          excerpt: toExcerpt(chunk.content),
        }))
      : undefined;

  const response: RagResponse = {
    answer,
    sources: toSources(chunks),
    comparisonMode: comparisonMode && comparisonTopics.length >= 2,
    comparisonTopics:
      comparisonMode && comparisonTopics.length >= 2
        ? comparisonTopics
        : undefined,
    topicSources,
  };

  if (!log && !options.includeDetails) {
    return response;
  }

  const prompt = buildUserPrompt(
    query,
    context,
    history,
    options.model ?? OLLAMA_MODEL,
    (options.think ?? OLLAMA_THINK) === true,
    researchMode,
    comparisonMode,
    comparisonTopics,
    useHybrid,
  );

  return {
    ...response,
    thinking,
    chunks,
    timings: {
      retrievalMs,
      contextMs,
      ollamaMs,
      totalMs,
    },
    prompt,
    models: getRagModelInfo(),
    hybridRetrieval,
  };
}

