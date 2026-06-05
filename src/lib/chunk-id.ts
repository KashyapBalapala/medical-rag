import path from "node:path";

export function buildChunkId(filename: string, chunkIndex: number): string {
  const safe = path
    .basename(filename, path.extname(filename))
    .replace(/[/\\]/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
  const prefix = filename.includes("/") ? "upload" : "doc";
  return `${prefix}-${safe}-chunk-${chunkIndex}`;
}
