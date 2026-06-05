import fs from "node:fs/promises";
import path from "node:path";

const DOCS_DIR = path.join(process.cwd(), "docs");

export function resolvePdfPath(metadataFilename: string): string {
  const normalized = path
    .normalize(metadataFilename)
    .replace(/^(\.\.(\/|\\|$))+/, "");

  if (normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error("Invalid PDF path");
  }

  const fullPath = path.join(DOCS_DIR, normalized);
  const docsRoot = `${DOCS_DIR}${path.sep}`;

  if (fullPath !== DOCS_DIR && !fullPath.startsWith(docsRoot)) {
    throw new Error("Invalid PDF path");
  }

  return fullPath;
}

export async function assertPdfReadable(metadataFilename: string): Promise<string> {
  const fullPath = resolvePdfPath(metadataFilename);

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      throw new Error("PDF not found");
    }
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error("PDF not found");
    }
    throw error;
  }

  if (!fullPath.toLowerCase().endsWith(".pdf")) {
    throw new Error("Not a PDF file");
  }

  return fullPath;
}
