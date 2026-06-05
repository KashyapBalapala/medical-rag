"use client";

import { useSourceCollection } from "@/hooks/useSourceCollection";

/** @deprecated Prefer useSourceCollection — kept for stable import paths */
export function useEvidenceDrawer() {
  const collection = useSourceCollection();

  return {
    state: collection.state,
    activeSource: collection.activeSource,
    openDrawer: collection.open,
    close: collection.close,
    goToIndex: collection.goToIndex,
    goNext: collection.goNext,
    goPrev: collection.goPrev,
    canGoPrev: collection.canGoPrev,
    canGoNext: collection.canGoNext,
  };
}
