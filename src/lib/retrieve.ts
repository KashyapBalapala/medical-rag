import { embedQuery } from "./embeddings";
import { getCollection } from "./chroma";
import { ragLog, ragLogTiming, startTimer } from "./logger";

const DEFAULT_TOP_K = 3;

export type ChunkMetadata = {
  filename: string;
  chunkIndex: number;
};

export type SearchResult = {
  id: string;
  content: string;
  metadata: ChunkMetadata;
  distance: number;
  similarityScore: number;
};

export type SearchDocumentsOptions = {
  topK?: number;
  log?: boolean;
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

function parseMetadata(raw: unknown): ChunkMetadata {
  if (!raw || typeof raw !== "object") {
    return { filename: "unknown", chunkIndex: -1 };
  }

  const meta = raw as Record<string, unknown>;

  return {
    filename: typeof meta.filename === "string" ? meta.filename : "unknown",
    chunkIndex:
      typeof meta.chunkIndex === "number" ? meta.chunkIndex : -1,
  };
}

/**
 * Converts L2 distance to cosine similarity for normalized embedding vectors.
 * For unit vectors: cosine_similarity = 1 - (L2² / 2)
 */
export function distanceToSimilarityScore(distance: number): number {
  if (!Number.isFinite(distance) || distance < 0) {
    return 0;
  }
  const score = 1 - (distance * distance) / 2;
  return Number(Math.max(0, Math.min(1, score)).toFixed(2));
}

function mapQueryResults(
  ids: string[],
  documents: (string | null)[],
  metadatas: (unknown | null)[],
  distances: (number | null)[] | undefined,
): SearchResult[] {
  return ids.map((id, index) => {
    const distance = distances?.[index] ?? 0;

    return {
      id,
      content: documents[index] ?? "",
      metadata: parseMetadata(metadatas[index]),
      distance,
      similarityScore: distanceToSimilarityScore(distance),
    };
  });
}

/**
 * Search ingested medical documents for chunks relevant to a question.
 */
export async function searchDocuments(
  question: string,
  options: SearchDocumentsOptions = {},
): Promise<SearchResult[]> {
  const query = validateQuestion(question);
  const topK = options.topK ?? DEFAULT_TOP_K;
  const log = options.log ?? process.env.RAG_LOG === "true";

  if (topK < 1 || topK > 50) {
    throw new Error("topK must be between 1 and 50");
  }

  if (log) {
    ragLog("Step 1/3 — Embed question", `Xenova/all-MiniLM-L6-v2 | "${query.slice(0, 60)}..."`);
  }

  let queryEmbedding: number[];
  const embedStart = startTimer();

  try {
    queryEmbedding = await embedQuery(query);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to generate query embedding: ${message}`);
  }

  if (log) {
    ragLogTiming(
      "Step 1/3 — Embed complete",
      embedStart,
      `${queryEmbedding.length}-dim vector`,
    );
    ragLog("Step 2/3 — Search ChromaDB", `top ${topK} chunks`);
  }

  let collection;
  const chromaStart = startTimer();

  try {
    collection = await getCollection();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to connect to ChromaDB: ${message}`);
  }

  try {
    const result = await collection.query({
      queryEmbeddings: [queryEmbedding],
      nResults: topK,
      include: ["documents", "metadatas", "distances"],
    });

    const ids = result.ids[0] ?? [];

    if (log) {
      ragLogTiming("Step 2/3 — ChromaDB search complete", chromaStart, `${ids.length} hits`);
    }

    if (ids.length === 0) {
      return [];
    }

    return mapQueryResults(
      ids,
      result.documents[0] ?? [],
      result.metadatas[0] ?? [],
      result.distances?.[0],
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`ChromaDB search failed: ${message}`);
  }
}
