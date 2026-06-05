import { COLLECTION_NAME } from "./chroma";
import { EMBEDDING_MODEL } from "./embeddings";

export type RagModelInfo = {
  embeddingModel: string;
  vectorDatabase: string;
  llmModel: string;
};

export function getRagModelInfo(): RagModelInfo {
  const host = process.env.CHROMA_HOST ?? "localhost";
  const port = process.env.CHROMA_PORT ?? "8000";

  return {
    embeddingModel: EMBEDDING_MODEL,
    vectorDatabase: `ChromaDB (${COLLECTION_NAME} @ ${host}:${port})`,
    llmModel: process.env.OLLAMA_MODEL ?? "qwen2.5:7b",
  };
}
