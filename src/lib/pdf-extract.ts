import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { PDFParse } from "pdf-parse";

let workerReady = false;

function resolvePdfWorkerPath(): string {
  const candidates = [
    path.join(
      process.cwd(),
      "node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs",
    ),
    path.join(
      process.cwd(),
      "node_modules/pdf-parse/dist/pdf-parse/esm/pdf.worker.mjs",
    ),
  ];

  return candidates[0];
}

export async function ensurePdfWorker(): Promise<void> {
  if (workerReady) return;

  const workerPath = resolvePdfWorkerPath();

  try {
    await fs.access(workerPath);
  } catch {
    throw new Error(
      `PDF worker not found at ${workerPath}. Run npm install to restore pdfjs-dist.`,
    );
  }

  PDFParse.setWorker(pathToFileURL(workerPath).href);
  workerReady = true;
}

export async function extractPdfText(
  filePath: string,
  filename: string,
): Promise<string> {
  await ensurePdfWorker();

  let parser: PDFParse | null = null;

  try {
    const buffer = await fs.readFile(filePath);
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();
    const text = result.text.trim();

    if (!text) {
      throw new Error(`No extractable text in ${filename}`);
    }

    return text;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to extract text from ${filename}: ${message}`);
  } finally {
    await parser?.destroy();
  }
}
