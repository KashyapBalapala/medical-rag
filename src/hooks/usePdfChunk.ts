"use client";

import { useEffect, useState } from "react";

export type PdfChunkData = {
  file: string;
  chunkIndex: number;
  content: string;
  pageNumber: number | null;
  pageNumberEstimated: boolean;
};

type UsePdfChunkResult = {
  data: PdfChunkData | null;
  loading: boolean;
  error: string | null;
};

export function usePdfChunk(
  file: string | null,
  chunkIndex: number | null,
  enabled: boolean,
): UsePdfChunkResult {
  const [data, setData] = useState<PdfChunkData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled || !file || chunkIndex === null) {
      setData(null);
      setLoading(false);
      setError(null);
      return;
    }

    const controller = new AbortController();

    async function loadChunk() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          file: file!,
          chunkIndex: String(chunkIndex),
        });

        const response = await fetch(`/api/sources/chunk?${params}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as {
            error?: string;
          } | null;
          throw new Error(body?.error ?? "Failed to load chunk");
        }

        setData((await response.json()) as PdfChunkData);
      } catch (fetchError) {
        if (controller.signal.aborted) return;
        const message =
          fetchError instanceof Error
            ? fetchError.message
            : "Failed to load chunk";
        setData(null);
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadChunk();

    return () => controller.abort();
  }, [enabled, file, chunkIndex]);

  return { data, loading, error };
}
