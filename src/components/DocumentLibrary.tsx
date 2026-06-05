"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { cn, ds } from "@/lib/design-system";
import DocumentUpload from "@/components/DocumentUpload";

export type LibraryDocument = {
  filename: string;
  path: string;
  source: "library" | "upload";
  chunkCount: number;
  size?: number;
};

type DocumentLibraryData = {
  documents: LibraryDocument[];
  documentCount: number;
  totalChunks: number;
};

type DocumentLibraryProps = {
  onRefresh?: () => void;
  refreshKey?: number;
};

export default function DocumentLibrary({
  onRefresh,
  refreshKey = 0,
}: DocumentLibraryProps) {
  const [library, setLibrary] = useState<DocumentLibraryData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchLibrary = useCallback(async () => {
    try {
      const response = await fetch("/api/documents");
      if (!response.ok) throw new Error("Failed to load documents");

      const data = (await response.json()) as DocumentLibraryData;
      setLibrary(data);
    } catch {
      setLibrary({ documents: [], documentCount: 0, totalChunks: 0 });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchLibrary();
  }, [fetchLibrary, refreshKey]);

  function handleUploadComplete() {
    void fetchLibrary();
    onRefresh?.();
  }

  return (
    <div className="space-y-4">
      <Card padding="md">
        <h2 className="text-base font-semibold text-slate-900">Documents</h2>
        <p className="mt-0.5 text-sm text-slate-500">
          Indexed medical PDFs ready for querying
        </p>

        {loading ? (
          <p className="mt-4 text-sm text-slate-500">Loading library...</p>
        ) : library && library.documents.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">
            No documents yet. Upload a PDF to get started.
          </p>
        ) : (
          <ul className="mt-4 space-y-2">
            {library?.documents.map((doc) => (
              <li
                key={doc.path}
                className="flex items-start gap-2.5 rounded-lg border border-slate-100 bg-slate-50/60 px-3 py-2.5"
              >
                <span className="mt-0.5 text-base leading-none" aria-hidden>
                  📄
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">
                    {doc.filename}
                  </p>
                  <p className="text-xs text-slate-400">
                    {doc.chunkCount} chunk{doc.chunkCount === 1 ? "" : "s"}
                    {doc.source === "upload" ? " · uploaded" : " · library"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}

        {library && library.totalChunks > 0 && (
          <p className={cn("mt-4 text-sm font-medium", ds.colors.primary.text)}>
            Total Chunks: {library.totalChunks}
          </p>
        )}
      </Card>

      <DocumentUpload compact onComplete={handleUploadComplete} />
    </div>
  );
}
