import fs from "node:fs/promises";
import path from "node:path";

export const UPLOADS_DIR = path.join(process.cwd(), "docs", "uploads");

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;

export type UploadedDocument = {
  filename: string;
  size: number;
  uploadedAt: string;
};

export type SaveUploadResult = {
  filename: string;
  filePath: string;
  metadataFilename: string;
};

export async function ensureUploadsDirectory(): Promise<void> {
  await fs.mkdir(UPLOADS_DIR, { recursive: true });
}

export function sanitizeFilename(name: string): string {
  const base = path.basename(name).trim();

  if (!base.toLowerCase().endsWith(".pdf")) {
    throw new Error("Only PDF files are allowed");
  }

  const cleaned = base.replace(/[^a-zA-Z0-9._() -]/g, "_");

  if (!cleaned.toLowerCase().endsWith(".pdf")) {
    throw new Error("Invalid PDF filename");
  }

  return cleaned;
}

export function validatePdfFile(
  file: File | { name: string; size: number; type: string },
): void {
  const isPdf =
    file.type === "application/pdf" ||
    file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    throw new Error(`${file.name} is not a PDF file`);
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    throw new Error(
      `${file.name} exceeds the ${Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024))}MB limit`,
    );
  }

  if (file.size === 0) {
    throw new Error(`${file.name} is empty`);
  }
}

async function resolveUniqueFilename(filename: string): Promise<string> {
  const target = path.join(UPLOADS_DIR, filename);

  try {
    await fs.access(target);
  } catch {
    return filename;
  }

  const ext = path.extname(filename);
  const stem = path.basename(filename, ext);
  return `${stem}-${Date.now()}${ext}`;
}

export async function saveUploadedPdf(
  buffer: Buffer,
  originalName: string,
): Promise<SaveUploadResult> {
  await ensureUploadsDirectory();

  const sanitized = sanitizeFilename(originalName);
  const filename = await resolveUniqueFilename(sanitized);
  const filePath = path.join(UPLOADS_DIR, filename);

  await fs.writeFile(filePath, buffer);

  return {
    filename,
    filePath,
    metadataFilename: `uploads/${filename}`,
  };
}

export async function listUploadedDocuments(): Promise<UploadedDocument[]> {
  await ensureUploadsDirectory();

  const entries = await fs.readdir(UPLOADS_DIR);
  const pdfs = entries
    .filter((name) => name.toLowerCase().endsWith(".pdf"))
    .sort();

  const documents: UploadedDocument[] = [];

  for (const filename of pdfs) {
    const stat = await fs.stat(path.join(UPLOADS_DIR, filename));
    documents.push({
      filename,
      size: stat.size,
      uploadedAt: stat.mtime.toISOString(),
    });
  }

  return documents;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export type UploadResult = {
  filename: string;
  success: boolean;
  chunkCount?: number;
  error?: string;
};
