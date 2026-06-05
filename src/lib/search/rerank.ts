import { getRerankWeights, RETRIEVAL_CONFIG } from "./retrieval.config";
import { getSectionKey } from "./diversity";
import type { FusedHit } from "./types";

function normalize(values: number[]): number[] {
  if (values.length === 0) return [];
  const min = Math.min(...values);
  const max = Math.max(...values);
  if (max === min) {
    return values.map(() => 1);
  }
  return values.map((value) => (value - min) / (max - min));
}

function computeDiversityBonus(
  hit: FusedHit,
  seenDocuments: Set<string>,
  seenSections: Set<string>,
): number {
  const filename = hit.chunk.metadata.filename;
  const section = getSectionKey(filename, hit.chunk.metadata.chunkIndex);
  const { newDocumentBonus, newSectionBonus } = RETRIEVAL_CONFIG.rerank;

  let bonus = 0;
  if (!seenDocuments.has(filename)) {
    bonus += newDocumentBonus;
    seenDocuments.add(filename);
  }
  if (!seenSections.has(section)) {
    bonus += newSectionBonus;
    seenSections.add(section);
  }

  return bonus;
}

export function rerankResults(hits: FusedHit[]): FusedHit[] {
  if (hits.length === 0) return [];

  const weights = getRerankWeights();
  const sorted = [...hits].sort((a, b) => b.rrfScore - a.rrfScore);

  const normRrf = normalize(sorted.map((hit) => hit.rrfScore));
  const normBm25 = normalize(sorted.map((hit) => hit.bm25Score));
  const normVector = normalize(sorted.map((hit) => hit.vectorScore));

  const seenDocuments = new Set<string>();
  const seenSections = new Set<string>();

  const reranked = sorted.map((hit, index) => {
    const diversityBonus = computeDiversityBonus(
      hit,
      seenDocuments,
      seenSections,
    );

    const finalScore =
      weights.rrf * normRrf[index] +
      weights.vector * normVector[index] +
      weights.bm25 * normBm25[index] +
      diversityBonus;

    return {
      ...hit,
      diversityBonus,
      finalScore: Number(finalScore.toFixed(4)),
    };
  });

  return reranked.sort((a, b) => b.finalScore - a.finalScore);
}
