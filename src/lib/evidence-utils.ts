import type { SourceType } from "@/types/evidence";

export function getSourceType(file: string): SourceType {
  return file.startsWith("uploads/") ? "upload" : "library";
}

export function formatSourceType(type: SourceType): string {
  return type === "upload" ? "Uploaded document" : "Library document";
}

export function formatRetrievalTimestamp(iso?: string): string {
  if (!iso) return "Just now";

  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
