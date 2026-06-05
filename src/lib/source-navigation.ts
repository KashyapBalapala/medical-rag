import type { SourceEvidence } from "@/types/evidence";

export function sourcesMatch(
  a: SourceEvidence,
  b: SourceEvidence,
): boolean {
  return a.file === b.file && a.chunkIndex === b.chunkIndex;
}

export function findSourceIndex(
  sources: SourceEvidence[],
  source: SourceEvidence,
): number {
  const index = sources.findIndex((item) => sourcesMatch(item, source));
  return index >= 0 ? index : 0;
}

export function clampSourceIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return Math.min(Math.max(index, 0), length - 1);
}
