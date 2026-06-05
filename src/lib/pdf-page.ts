import fs from "node:fs/promises";
import { PDFParse } from "pdf-parse";
import { assertPdfReadable } from "./pdf-path";
import { ensurePdfWorker } from "./pdf-extract";

function normalizeForMatch(text: string): string {
  return text.toLowerCase().replace(/\s+/g, " ").trim();
}

export type ChunkPageMatch = {
  pageNumber: number;
  estimated: boolean;
};

export async function findPageForChunkText(
  metadataFilename: string,
  chunkText: string,
): Promise<ChunkPageMatch | null> {
  if (!chunkText.trim()) return null;

  const filePath = await assertPdfReadable(metadataFilename);
  await ensurePdfWorker();

  let parser: PDFParse | null = null;

  try {
    const buffer = await fs.readFile(filePath);
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const needle = normalizeForMatch(chunkText).slice(0, 120);
    if (!needle) return null;

    for (const page of result.pages) {
      const haystack = normalizeForMatch(page.text);
      if (haystack.includes(needle)) {
        return { pageNumber: page.num, estimated: false };
      }
    }

    const shortNeedle = needle.slice(0, 48);
    for (const page of result.pages) {
      const haystack = normalizeForMatch(page.text);
      if (shortNeedle.length >= 20 && haystack.includes(shortNeedle)) {
        return { pageNumber: page.num, estimated: true };
      }
    }

    return null;
  } finally {
    await parser?.destroy();
  }
}
