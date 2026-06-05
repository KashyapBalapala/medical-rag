import { pipeline, type FeatureExtractionPipeline } from "@xenova/transformers";

const MODEL = "Xenova/all-MiniLM-L6-v2";

export const EMBEDDING_MODEL = MODEL;

let embedder: FeatureExtractionPipeline | null = null;

async function getEmbedder(): Promise<FeatureExtractionPipeline> {
  if (!embedder) {
    embedder = await pipeline("feature-extraction", MODEL);
  }
  return embedder;
}

async function embedText(text: string): Promise<number[]> {
  const model = await getEmbedder();
  const output = await model(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function embedDocuments(texts: string[]): Promise<number[][]> {
  return Promise.all(texts.map((text) => embedText(text)));
}

export async function embedQuery(query: string): Promise<number[]> {
  return embedText(query);
}
