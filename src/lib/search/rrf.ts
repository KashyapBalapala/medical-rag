import type { FusedHit, RankedHit } from "./types";

export function fuseResults(
  bm25Hits: RankedHit[],
  vectorHits: RankedHit[],
  k = 60,
): FusedHit[] {
  const fused = new Map<string, FusedHit>();

  const applyList = (hits: RankedHit[]) => {
    for (const hit of hits) {
      const contribution = 1 / (k + hit.rank);
      const existing = fused.get(hit.chunk.id);

      if (!existing) {
        fused.set(hit.chunk.id, {
          chunk: hit.chunk,
          queryLabel: hit.queryLabel,
          rrfScore: contribution,
          bm25Score: hit.source === "bm25" ? hit.score : 0,
          vectorScore: hit.source === "vector" ? hit.score : 0,
          bm25Rank: hit.source === "bm25" ? hit.rank : null,
          vectorRank: hit.source === "vector" ? hit.rank : null,
          diversityBonus: 0,
          finalScore: 0,
        });
        continue;
      }

      existing.rrfScore += contribution;
      if (hit.source === "bm25") {
        existing.bm25Score = Math.max(existing.bm25Score, hit.score);
        existing.bm25Rank = hit.rank;
      } else {
        existing.vectorScore = Math.max(existing.vectorScore, hit.score);
        existing.vectorRank = hit.rank;
      }
      if (hit.queryLabel) {
        existing.queryLabel = hit.queryLabel;
      }
    }
  };

  applyList(bm25Hits);
  applyList(vectorHits);

  return [...fused.values()].sort((a, b) => b.rrfScore - a.rrfScore);
}
