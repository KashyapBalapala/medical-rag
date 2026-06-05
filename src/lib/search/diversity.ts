import { RETRIEVAL_CONFIG } from "./retrieval.config";
import type { FusedHit } from "./types";

export type DiversityOptions = {
  maxPerDocument?: number;
  preferredPerDocument?: number;
  targetCount?: number;
  minSourceDocuments?: number;
  sectionChunkGap?: number;
};

function sectionKey(filename: string, chunkIndex: number): string {
  const window = RETRIEVAL_CONFIG.diversity.sectionChunkGap + 1;
  return `${filename}#${Math.floor(chunkIndex / window)}`;
}

function isSectionTooClose(
  hit: FusedHit,
  selected: FusedHit[],
  gap: number,
): boolean {
  const { filename, chunkIndex } = hit.chunk.metadata;

  return selected.some((existing) => {
    if (existing.chunk.metadata.filename !== filename) return false;
    return (
      Math.abs(existing.chunk.metadata.chunkIndex - chunkIndex) <= gap
    );
  });
}

function canAcceptHit(
  hit: FusedHit,
  selected: FusedHit[],
  docCounts: Map<string, number>,
  maxPerDocument: number,
  preferredPerDocument: number,
  sectionChunkGap: number,
  requireSpread: boolean,
): boolean {
  const filename = hit.chunk.metadata.filename;
  const count = docCounts.get(filename) ?? 0;

  if (count >= maxPerDocument) return false;
  if (requireSpread && count >= preferredPerDocument) return false;
  if (isSectionTooClose(hit, selected, sectionChunkGap)) return false;

  return true;
}

export function applyDiversitySelection(
  hits: FusedHit[],
  options: DiversityOptions = {},
): FusedHit[] {
  const config = RETRIEVAL_CONFIG.diversity;
  const maxPerDocument = options.maxPerDocument ?? config.maxChunksPerDocument;
  const preferredPerDocument =
    options.preferredPerDocument ?? config.preferredChunksPerDocument;
  const targetCount = options.targetCount ?? config.outputTopK;
  const minSourceDocuments =
    options.minSourceDocuments ?? config.minSourceDocuments;
  const sectionChunkGap = options.sectionChunkGap ?? config.sectionChunkGap;

  const sorted = [...hits].sort((a, b) => b.rrfScore - a.rrfScore);
  const selected: FusedHit[] = [];
  const docCounts = new Map<string, number>();

  const passes = [
    { requireSpread: true },
    { requireSpread: false },
  ] as const;

  for (const pass of passes) {
    for (const hit of sorted) {
      if (selected.length >= targetCount) break;
      if (selected.some((item) => item.chunk.id === hit.chunk.id)) continue;

      if (
        !canAcceptHit(
          hit,
          selected,
          docCounts,
          maxPerDocument,
          preferredPerDocument,
          sectionChunkGap,
          pass.requireSpread,
        )
      ) {
        continue;
      }

      const filename = hit.chunk.metadata.filename;
      docCounts.set(filename, (docCounts.get(filename) ?? 0) + 1);
      selected.push(hit);
    }
  }

  const uniqueDocs = new Set(
    selected.map((hit) => hit.chunk.metadata.filename),
  ).size;

  if (uniqueDocs < minSourceDocuments) {
    for (const hit of sorted) {
      if (selected.length >= targetCount) break;
      if (selected.some((item) => item.chunk.id === hit.chunk.id)) continue;

      const filename = hit.chunk.metadata.filename;
      const count = docCounts.get(filename) ?? 0;
      if (count >= maxPerDocument) continue;
      if (isSectionTooClose(hit, selected, sectionChunkGap)) continue;

      docCounts.set(filename, count + 1);
      selected.push(hit);

      if (
        new Set(selected.map((item) => item.chunk.metadata.filename)).size >=
        minSourceDocuments
      ) {
        break;
      }
    }
  }

  return selected.map((hit) => ({
    ...hit,
    diversityBonus: 0,
  }));
}

export function getSectionKey(filename: string, chunkIndex: number): string {
  return sectionKey(filename, chunkIndex);
}
