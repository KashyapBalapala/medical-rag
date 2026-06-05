import fs from "node:fs/promises";
import path from "node:path";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const winkBm25 = require("wink-bm25-text-search") as () => WinkBm25Engine;
import { getCollection } from "@/lib/chroma";
import type { SearchResult } from "@/lib/retrieve";
import type { BM25ChunkRecord } from "./types";

type WinkBm25Engine = {
  defineConfig: (config: {
    fldWeights: Record<string, number>;
    bm25Params?: { k1?: number; b?: number; k?: number };
  }) => void;
  definePrepTasks: (tasks: Array<(text: string) => string[]>) => number;
  addDoc: (doc: Record<string, string>, id: string) => void;
  consolidate: () => void;
  search: (query: string, limit?: number) => Array<[string, number]>;
  exportJSON: () => string;
  importJSON: (json: string) => boolean;
  reset: () => void;
};

const BM25_DIR = path.join(process.cwd(), "data", "bm25");
const INDEX_PATH = path.join(BM25_DIR, "index.json");
const CHUNKS_PATH = path.join(BM25_DIR, "chunks.json");

type ChunksStore = {
  version: number;
  chunks: Record<string, BM25ChunkRecord>;
};

let engine: WinkBm25Engine | null = null;
let chunkStore: ChunksStore = { version: 1, chunks: {} };
let initialized = false;
let indexLoaded = false;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1);
}

function createEngine(): WinkBm25Engine {
  const instance = winkBm25();
  instance.defineConfig({
    fldWeights: { content: 2, filename: 1 },
    bm25Params: { k1: 1.2, b: 0.75, k: 1 },
  });
  instance.definePrepTasks([tokenize]);
  return instance;
}

function buildSearchResult(record: BM25ChunkRecord): SearchResult {
  return {
    id: record.id,
    content: record.content,
    metadata: {
      filename: record.filename,
      chunkIndex: record.chunkIndex,
    },
    distance: 0,
    similarityScore: 0,
  };
}

async function ensureBm25Dir(): Promise<void> {
  await fs.mkdir(BM25_DIR, { recursive: true });
}

async function loadChunksStore(): Promise<void> {
  try {
    const raw = await fs.readFile(CHUNKS_PATH, "utf8");
    chunkStore = JSON.parse(raw) as ChunksStore;
  } catch {
    chunkStore = { version: 1, chunks: {} };
  }
}

async function saveChunksStore(): Promise<void> {
  await ensureBm25Dir();
  await fs.writeFile(CHUNKS_PATH, JSON.stringify(chunkStore, null, 2), "utf8");
}

function rebuildEngineFromStore(): void {
  engine = createEngine();
  for (const record of Object.values(chunkStore.chunks)) {
    engine.addDoc(
      {
        content: record.content,
        filename: record.filename,
      },
      record.id,
    );
  }
  if (Object.keys(chunkStore.chunks).length > 0) {
    engine.consolidate();
  }
  indexLoaded = Object.keys(chunkStore.chunks).length > 0;
}

export async function initializeBM25(): Promise<void> {
  if (initialized) return;

  await ensureBm25Dir();
  await loadChunksStore();

  try {
    const indexJson = await fs.readFile(INDEX_PATH, "utf8");
    engine = createEngine();
    engine.importJSON(indexJson);
    indexLoaded = true;
  } catch {
    rebuildEngineFromStore();
  }

  initialized = true;
}

export async function loadIndex(): Promise<boolean> {
  await initializeBM25();
  return indexLoaded;
}

export function indexChunk(record: BM25ChunkRecord): void {
  chunkStore.chunks[record.id] = record;
}

export function indexChunks(records: BM25ChunkRecord[]): void {
  for (const record of records) {
    indexChunk(record);
  }
}

export async function saveIndex(): Promise<void> {
  await ensureBm25Dir();
  await saveChunksStore();

  if (Object.keys(chunkStore.chunks).length === 0) {
    engine = null;
    try {
      await fs.unlink(INDEX_PATH);
    } catch {
      // no index file yet
    }
    indexLoaded = false;
    return;
  }

  rebuildEngineFromStore();
  if (!engine) {
    throw new Error("BM25 engine failed to initialize");
  }
  const exported = engine.exportJSON();
  await fs.writeFile(INDEX_PATH, exported, "utf8");
  indexLoaded = true;
}

export function getBm25ChunkCount(): number {
  return Object.keys(chunkStore.chunks).length;
}

export function isBm25IndexLoaded(): boolean {
  return indexLoaded;
}

export async function searchBM25(
  query: string,
  topK: number,
): Promise<Array<{ id: string; score: number; rank: number; chunk: SearchResult }>> {
  await initializeBM25();

  if (!engine || Object.keys(chunkStore.chunks).length === 0) {
    return [];
  }

  const results = engine.search(query.trim(), topK);
  return results.map(([id, score], index) => {
    const record = chunkStore.chunks[id];
    const chunk = record
      ? buildSearchResult(record)
      : {
          id,
          content: "",
          metadata: { filename: "unknown", chunkIndex: -1 },
          distance: 0,
          similarityScore: 0,
        };

    return {
      id,
      score: Number(score.toFixed(4)),
      rank: index + 1,
      chunk: {
        ...chunk,
        similarityScore: Number(Math.min(1, score / 10).toFixed(2)),
      },
    };
  });
}

export async function rebuildIndexFromChroma(): Promise<number> {
  const collection = await getCollection();
  const result = await collection.get({
    include: ["documents", "metadatas"],
  });

  const ids = result.ids ?? [];
  const documents = result.documents ?? [];
  const metadatas = result.metadatas ?? [];

  chunkStore = { version: 1, chunks: {} };

  ids.forEach((id, index) => {
    const meta = metadatas[index] as Record<string, unknown> | null;
    const filename =
      typeof meta?.filename === "string" ? meta.filename : "unknown";
    const chunkIndex =
      typeof meta?.chunkIndex === "number" ? meta.chunkIndex : -1;
    const content = documents[index] ?? "";

    chunkStore.chunks[id] = {
      id,
      content,
      filename,
      chunkIndex,
    };
  });

  await saveIndex();
  initialized = true;
  return ids.length;
}

export async function clearBm25Index(): Promise<void> {
  chunkStore = { version: 1, chunks: {} };
  engine = null;
  initialized = false;
  indexLoaded = false;

  try {
    await fs.rm(BM25_DIR, { recursive: true, force: true });
  } catch {
    // directory may not exist
  }
}

export function toBm25Record(chunk: {
  id: string;
  text: string;
  metadata: { filename: string; chunkIndex: number };
}): BM25ChunkRecord {
  return {
    id: chunk.id,
    content: chunk.text,
    filename: chunk.metadata.filename,
    chunkIndex: chunk.metadata.chunkIndex,
  };
}
