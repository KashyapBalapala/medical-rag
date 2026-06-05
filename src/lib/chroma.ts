import { ChromaClient, type Collection } from "chromadb";

export const COLLECTION_NAME = "medical_docs";

const CHROMA_HOST = process.env.CHROMA_HOST ?? "localhost";
const CHROMA_PORT = Number(process.env.CHROMA_PORT ?? "8000");
const CHROMA_SSL = process.env.CHROMA_SSL === "true";

let client: ChromaClient | null = null;

export function getChromaClient(): ChromaClient {
  if (!client) {
    client = new ChromaClient({
      host: CHROMA_HOST,
      port: CHROMA_PORT,
      ssl: CHROMA_SSL,
    });
  }
  return client;
}

export async function ensureChromaConnection(): Promise<void> {
  const chroma = getChromaClient();
  try {
    await chroma.heartbeat();
  } catch {
    throw new Error(
      `Cannot reach Chroma at ${CHROMA_SSL ? "https" : "http"}://${CHROMA_HOST}:${CHROMA_PORT}. ` +
        "Start the server with: npm run chroma:server",
    );
  }
}

export async function getCollection(): Promise<Collection> {
  await ensureChromaConnection();
  const chroma = getChromaClient();
  return chroma.getOrCreateCollection({
    name: COLLECTION_NAME,
    embeddingFunction: null,
  });
}
