import { getChunksByReferences } from "./chunk-lookup";
import { buildChunkId } from "./chunk-id";
import type { SearchResult } from "./retrieve";

const NEIGHBOR_SIMILARITY_SCORE = 0.5;

export async function expandWithNeighborChunks(
  chunks: SearchResult[],
  radius = 1,
): Promise<SearchResult[]> {
  if (chunks.length === 0 || radius < 1) return chunks;

  const seen = new Set(chunks.map((chunk) => chunk.id));
  const references: Array<{ filename: string; chunkIndex: number }> = [];

  for (const chunk of chunks) {
    const { filename, chunkIndex } = chunk.metadata;
    if (chunkIndex < 0) continue;

    for (let offset = -radius; offset <= radius; offset++) {
      if (offset === 0) continue;

      const neighborIndex = chunkIndex + offset;
      if (neighborIndex < 0) continue;

      const id = buildChunkId(filename, neighborIndex);
      if (seen.has(id)) continue;

      seen.add(id);
      references.push({ filename, chunkIndex: neighborIndex });
    }
  }

  if (references.length === 0) return chunks;

  const neighbors = await getChunksByReferences(references);
  const neighborResults: SearchResult[] = neighbors.map((neighbor) => ({
    id: buildChunkId(neighbor.file, neighbor.chunkIndex),
    content: neighbor.content,
    metadata: {
      filename: neighbor.file,
      chunkIndex: neighbor.chunkIndex,
    },
    distance: 1,
    similarityScore: NEIGHBOR_SIMILARITY_SCORE,
  }));

  return [...chunks, ...neighborResults];
}
