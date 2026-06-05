"use client";

import { useRef, useState } from "react";
import { Button, Card } from "@/components/ui";
import { cn } from "@/lib/design-system";
import type { UploadResult } from "@/lib/upload";

type UploadPhase = "idle" | "uploading" | "ingesting" | "done" | "error";

type DocumentUploadProps = {
  compact?: boolean;
  onComplete?: () => void;
};

function UploadCloudIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 16V8m0 0L9 11m3-3 3 3" />
      <path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25" />
    </svg>
  );
}

function uploadWithProgress(
  files: File[],
  onProgress: (percent: number) => void,
): Promise<{ results: UploadResult[] }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();

    for (const file of files) {
      formData.append("files", file);
    }

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      let payload: { results?: UploadResult[]; error?: string };

      try {
        payload = JSON.parse(xhr.responseText) as {
          results?: UploadResult[];
          error?: string;
        };
      } catch {
        reject(new Error("Invalid server response"));
        return;
      }

      if (xhr.status >= 200 && xhr.status < 300) {
        resolve({ results: payload.results ?? [] });
        return;
      }

      reject(new Error(payload.error ?? "Upload failed"));
    });

    xhr.addEventListener("error", () => {
      reject(new Error("Network error during upload"));
    });

    xhr.open("POST", "/api/upload");
    xhr.send(formData);
  });
}

export default function DocumentUpload({
  compact = false,
  onComplete,
}: DocumentUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<UploadResult[]>([]);
  const [error, setError] = useState("");

  async function processFiles(fileList: FileList | File[]) {
    const files = Array.from(fileList).filter((f) =>
      f.name.toLowerCase().endsWith(".pdf"),
    );

    if (files.length === 0) {
      setError("Please select at least one PDF file.");
      setPhase("error");
      return;
    }

    setPhase("uploading");
    setProgress(0);
    setError("");
    setResults([]);

    try {
      const response = await uploadWithProgress(files, (percent) => {
        setProgress(percent);
        if (percent >= 100) {
          setPhase("ingesting");
        }
      });

      setResults(response.results);
      setPhase("done");
      onComplete?.();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Upload failed";
      setError(message);
      setPhase("error");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragActive(false);
    void processFiles(e.dataTransfer.files);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    if (e.target.files) {
      void processFiles(e.target.files);
    }
    e.target.value = "";
  }

  const isBusy = phase === "uploading" || phase === "ingesting";
  const successCount = results.filter((r) => r.success).length;
  const failureCount = results.filter((r) => !r.success).length;

  return (
    <Card padding="md">
      <h3 className="text-sm font-semibold text-slate-900">Upload PDF</h3>
      <p className="mt-0.5 text-xs text-slate-500">
        Saved to docs/uploads · indexed automatically
      </p>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragActive(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragActive(false);
        }}
        onDrop={handleDrop}
        className={cn(
          "relative mt-3 rounded-xl border-2 border-dashed text-center transition",
          compact ? "px-4 py-5" : "px-6 py-8",
          dragActive
            ? "border-blue-400 bg-blue-50/60"
            : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50",
          isBusy && "pointer-events-none opacity-70",
        )}
      >
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          multiple
          className="hidden"
          onChange={handleFileChange}
          disabled={isBusy}
        />

        <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <UploadCloudIcon className="h-5 w-5" />
        </div>

        <p className="text-sm font-medium text-slate-700">
          Drag & drop PDFs
        </p>

        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="mt-2"
          disabled={isBusy}
          onClick={() => inputRef.current?.click()}
        >
          Browse files
        </Button>
      </div>

      {isBusy && (
        <div className="mt-3 space-y-2" aria-live="polite">
          <div className="flex items-center justify-between text-xs">
            <span className="font-medium text-slate-700">
              {phase === "uploading"
                ? "Uploading..."
                : "Processing & storing in ChromaDB..."}
            </span>
            {phase === "uploading" && (
              <span className="text-slate-500">{progress}%</span>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-300",
                phase === "ingesting"
                  ? "w-full animate-pulse bg-cyan-500"
                  : "bg-blue-600",
              )}
              style={
                phase === "uploading"
                  ? { width: `${Math.max(progress, 4)}%` }
                  : undefined
              }
            />
          </div>
        </div>
      )}

      {phase === "done" && results.length > 0 && (
        <div className="mt-3 space-y-2">
          {successCount > 0 && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              {successCount} document{successCount === 1 ? "" : "s"} ready for
              querying.
            </div>
          )}
          {failureCount > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {failureCount} file{failureCount === 1 ? "" : "s"} failed.
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setPhase("idle");
              setResults([]);
            }}
          >
            Upload more
          </Button>
        </div>
      )}

      {phase === "error" && error && (
        <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-1"
            onClick={() => {
              setPhase("idle");
              setError("");
            }}
          >
            Try again
          </Button>
        </div>
      )}
    </Card>
  );
}
