import { COLLECTION_NAME } from "./chroma";
import { getDocumentLibrary } from "./documents";
import { EMBEDDING_MODEL } from "./embeddings";
import {
  getBm25ChunkCount,
  initializeBM25,
  isBm25IndexLoaded,
} from "./search/bm25";
import { isHybridRetrievalEnabled } from "./search/config";

const OLLAMA_MODEL = process.env.OLLAMA_MODEL ?? "qwen2.5:7b";
const CHROMA_HOST = process.env.CHROMA_HOST ?? "localhost";
const CHROMA_PORT = process.env.CHROMA_PORT ?? "8000";

export type SystemStats = {
  documentCount: number;
  totalChunks: number;
  embeddingModel: string;
  llm: string;
  vectorStore: string;
  chromaEndpoint: string;
  hybridRetrievalEnabled: boolean;
  bm25ChunkCount: number;
  bm25IndexLoaded: boolean;
};

export async function getSystemStats(): Promise<SystemStats> {
  await initializeBM25();
  const library = await getDocumentLibrary();

  return {
    documentCount: library.documentCount,
    totalChunks: library.totalChunks,
    embeddingModel: EMBEDDING_MODEL,
    llm: OLLAMA_MODEL,
    vectorStore: "ChromaDB",
    chromaEndpoint: `${CHROMA_HOST}:${CHROMA_PORT} (${COLLECTION_NAME})`,
    hybridRetrievalEnabled: isHybridRetrievalEnabled(),
    bm25ChunkCount: getBm25ChunkCount(),
    bm25IndexLoaded: isBm25IndexLoaded(),
  };
}
