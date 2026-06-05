import { NextRequest, NextResponse } from "next/server";
import {
  askQuestion,
  buildRagPrompt,
  getRagModelInfo,
  type RagResponseDetails,
} from "@/lib/rag";
import { trimConversationHistory } from "@/lib/conversation";
import {
  buildMemoryDebugInfo,
  MAX_CONTEXT_TURNS,
} from "@/lib/memory-service";
import {
  extractResearchTopics,
  shouldUseComparisonMode,
  shouldUseResearchMode,
} from "@/lib/research-mode";
import type { ConversationTurn, RagDebugInfo } from "@/types/chat";

/** Comparison mode can take up to ~8 minutes on CPU (retrieval + long synthesis). */
export const maxDuration = 600;

function shouldLogPipeline(): boolean {
  if (process.env.RAG_LOG === "false") return false;
  if (process.env.RAG_LOG === "true") return true;
  return process.env.NODE_ENV === "development";
}

function isRagDetails(
  result: Awaited<ReturnType<typeof askQuestion>>,
): result is RagResponseDetails {
  return "timings" in result && "chunks" in result;
}

function parseHistory(raw: unknown): ConversationTurn[] {
  if (!Array.isArray(raw)) return [];

  const turns = raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const turn = item as Record<string, unknown>;
      if (turn.role !== "user" && turn.role !== "assistant") return null;
      if (typeof turn.content !== "string") return null;

      return {
        role: turn.role,
        content: turn.content.trim().slice(0, 4000),
      } satisfies ConversationTurn;
    })
    .filter((turn): turn is ConversationTurn => turn !== null && turn.content.length > 0);

  return trimConversationHistory(turns, MAX_CONTEXT_TURNS);
}

function buildDebugPayload(
  question: string,
  details: RagResponseDetails,
  history: ConversationTurn[],
  researchMode: boolean,
  comparisonMode: boolean,
  comparisonTopics: string[],
): RagDebugInfo {
  return {
    question,
    prompt:
      details.prompt ??
      buildRagPrompt(
        question,
        details.chunks,
        history,
        researchMode,
        comparisonMode,
        comparisonTopics,
      ),
    chunks: details.chunks.map((chunk) => ({
      file: chunk.metadata.filename,
      chunkIndex: chunk.metadata.chunkIndex,
      score: chunk.similarityScore,
      content: chunk.content.trim(),
    })),
    timings: {
      totalMs: details.timings.totalMs,
      retrievalMs: details.timings.retrievalMs,
      generationMs: details.timings.ollamaMs,
      estimated: false,
    },
    models: details.models ?? getRagModelInfo(),
    memory: buildMemoryDebugInfo(history),
    hybridRetrieval: details.hybridRetrieval,
  };
}

export async function POST(request: NextRequest) {
  const started = Date.now();

  try {
    const body = await request.json();
    const { question, debug: debugMode, history: rawHistory, research: researchFlag } = body;

    if (!question || typeof question !== "string") {
      return NextResponse.json(
        { error: "Question is required" },
        { status: 400 },
      );
    }

    const history = parseHistory(rawHistory);
    const log = shouldLogPipeline();
    const includeDetails = debugMode === true;
    const researchMode = shouldUseResearchMode(
      question,
      researchFlag === true,
    );
    const comparisonTopics = extractResearchTopics(question);
    const comparisonMode = shouldUseComparisonMode(question, researchMode);

    console.log(
      `[api/chat] POST question="${question.slice(0, 80)}..." history=${history.length} log=${log} debug=${includeDetails} research=${researchMode} comparison=${comparisonMode}`,
    );

    const result = await askQuestion(question, {
      log,
      includeDetails,
      history,
      researchMode,
      comparisonMode,
      comparisonTopics,
    });

    console.log(
      `[api/chat] done in ${Date.now() - started}ms | sources=${result.sources.length}`,
    );

    const memory = buildMemoryDebugInfo(history);

    const response: Record<string, unknown> = {
      answer: result.answer,
      sources: result.sources,
      researchMode,
      comparisonMode: result.comparisonMode === true,
      comparisonTopics: result.comparisonTopics ?? [],
      topicSources: result.topicSources ?? [],
      memory,
    };

    if (includeDetails && isRagDetails(result)) {
      response.debug = buildDebugPayload(
        question,
        result,
        history,
        researchMode,
        comparisonMode,
        comparisonTopics,
      );
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[api/chat] error:", error);

    const message =
      error instanceof Error ? error.message : "Internal server error";
    const isTimeout =
      /timeout|aborted|deadline exceeded|fetch failed|CPU prefill exceeded/i.test(
        message,
      );
    const clientMessage =
      process.env.NODE_ENV === "development"
        ? message
        : isTimeout
          ? "Answer generation timed out. On CPU, large prompts can take several minutes — try again, set HYBRID_OLLAMA_TIMEOUT_MS=600000, or use OLLAMA_FAST_MODEL=llama3.2:3b for simple questions."
          : "Internal server error";

    return NextResponse.json(
      { error: clientMessage },
      { status: isTimeout ? 504 : 500 },
    );
  }
}
