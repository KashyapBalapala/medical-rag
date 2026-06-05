"use client";

import { useCallback, useMemo, useState } from "react";
import {
  clampSourceIndex,
  findSourceIndex,
} from "@/lib/source-navigation";
import type { SourceCollectionState, SourceOpenPayload } from "@/types/evidence";

export function useSourceCollection() {
  const [state, setState] = useState<SourceCollectionState | null>(null);

  const open = useCallback((payload: SourceOpenPayload) => {
    if (payload.sources.length === 0) return;

    setState({
      sources: payload.sources,
      activeIndex: findSourceIndex(payload.sources, payload.source),
      query: payload.query,
      retrievedAt: payload.retrievedAt,
    });
  }, []);

  const openAtSource = useCallback(
    (source: SourceCollectionState["sources"][number], collection: SourceCollectionState) => {
      setState({
        ...collection,
        activeIndex: findSourceIndex(collection.sources, source),
      });
    },
    [],
  );

  const close = useCallback(() => {
    setState(null);
  }, []);

  const goToIndex = useCallback((index: number) => {
    setState((current) => {
      if (!current) return current;
      return {
        ...current,
        activeIndex: clampSourceIndex(index, current.sources.length),
      };
    });
  }, []);

  const goNext = useCallback(() => {
    setState((current) => {
      if (!current || current.activeIndex >= current.sources.length - 1) {
        return current;
      }
      return { ...current, activeIndex: current.activeIndex + 1 };
    });
  }, []);

  const goPrev = useCallback(() => {
    setState((current) => {
      if (!current || current.activeIndex <= 0) return current;
      return { ...current, activeIndex: current.activeIndex - 1 };
    });
  }, []);

  const activeSource = useMemo(
    () => (state ? state.sources[state.activeIndex] ?? null : null),
    [state],
  );

  const canGoPrev = (state?.activeIndex ?? 0) > 0;
  const canGoNext = state
    ? state.activeIndex < state.sources.length - 1
    : false;

  return {
    state,
    activeSource,
    open,
    openAtSource,
    close,
    goToIndex,
    goNext,
    goPrev,
    canGoPrev,
    canGoNext,
  };
}
