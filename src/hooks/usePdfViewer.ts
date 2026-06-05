"use client";

import { useSourceCollection } from "@/hooks/useSourceCollection";
import type { SourceEvidence } from "@/types/evidence";

/** @deprecated Prefer useSourceCollection — kept for stable import paths */
export function usePdfViewer() {
  const collection = useSourceCollection();

  const openViewer = (
    source: SourceEvidence,
    sources: SourceEvidence[],
    query?: string,
  ) => {
    collection.open({ source, sources, query });
  };

  return {
    state: collection.state
      ? {
          sources: collection.state.sources,
          activeIndex: collection.state.activeIndex,
          query: collection.state.query,
        }
      : null,
    activeSource: collection.activeSource,
    openViewer,
    close: collection.close,
    goToIndex: collection.goToIndex,
    goNext: collection.goNext,
    goPrev: collection.goPrev,
    canGoPrev: collection.canGoPrev,
    canGoNext: collection.canGoNext,
  };
}
