import { getCollection } from "./chroma";
import { buildChunkId } from "./chunk-id";
import { findPageForChunkText } from "./pdf-page";

export type ChunkLookupResult = {
  file: string;
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  pageNumberEstimated: boolean;
};

export type ChunkReference = {
  filename: string;
  chunkIndex: number;
};

export type ChunkDocument = {
  file: string;
  chunkIndex: number;
  content: string;
};

export async function getChunksByReferences(
  references: ChunkReference[],
): Promise<ChunkDocument[]> {
  if (references.length === 0) return [];

  const collection = await getCollection();
  const ids = references.map((ref) =>
    buildChunkId(ref.filename, ref.chunkIndex),
  );

  const result = await collection.get({
    ids,
    include: ["documents", "metadatas"],
  });

  const chunks: ChunkDocument[] = [];

  for (let i = 0; i < ids.length; i++) {
    const content = result.documents?.[i] ?? "";
    if (!content) continue;

    const meta = result.metadatas?.[i] as Record<string, unknown> | null;
    const ref = references[i];
    chunks.push({
      file:
        typeof meta?.filename === "string" ? meta.filename : ref.filename,
      chunkIndex:
        typeof meta?.chunkIndex === "number"
          ? meta.chunkIndex
          : ref.chunkIndex,
      content: content.trim(),
    });
  }

  return chunks;
}

export async function getChunkByReference(
  filename: string,
  chunkIndex: number,
): Promise<ChunkLookupResult | null> {
  const [chunk] = await getChunksByReferences([{ filename, chunkIndex }]);
  if (!chunk) return null;

  const pageMatch = await findPageForChunkText(chunk.file, chunk.content);

  return {
    file: chunk.file,
    chunkIndex: chunk.chunkIndex,
    content: chunk.content,
    pageNumber: pageMatch?.pageNumber ?? null,
    pageNumberEstimated: pageMatch?.estimated ?? false,
  };
}
