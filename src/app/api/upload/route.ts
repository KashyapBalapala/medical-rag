import { NextRequest, NextResponse } from "next/server";
import { ingestSinglePdf } from "@/lib/ingest";
import {
  saveUploadedPdf,
  validatePdfFile,
  type UploadResult,
} from "@/lib/upload";

export const maxDuration = 300;

export async function POST(request: NextRequest) {
  const started = Date.now();

  try {
    const formData = await request.formData();
    const entries = formData.getAll("files");

    if (entries.length === 0) {
      return NextResponse.json(
        { error: "No files provided. Use form field name 'files'." },
        { status: 400 },
      );
    }

    const results: UploadResult[] = [];

    for (const entry of entries) {
      if (!(entry instanceof File)) {
        results.push({
          filename: "unknown",
          success: false,
          error: "Invalid file entry",
        });
        continue;
      }

      const originalName = entry.name || "document.pdf";

      try {
        validatePdfFile(entry);

        const buffer = Buffer.from(await entry.arrayBuffer());
        const saved = await saveUploadedPdf(buffer, originalName);

        console.log(
          `[api/upload] saved ${saved.filename} (${buffer.length} bytes), ingesting...`,
        );

        const ingested = await ingestSinglePdf(
          saved.filePath,
          saved.metadataFilename,
          { verbose: false },
        );

        results.push({
          filename: saved.filename,
          success: true,
          chunkCount: ingested.chunkCount,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`[api/upload] failed for ${originalName}:`, message);

        results.push({
          filename: originalName,
          success: false,
          error: message,
        });
      }
    }

    const succeeded = results.filter((r) => r.success).length;
    console.log(
      `[api/upload] done in ${Date.now() - started}ms | ${succeeded}/${results.length} succeeded`,
    );

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[api/upload] error:", error);

    return NextResponse.json(
      { error: "Upload failed. Please try again." },
      { status: 500 },
    );
  }
}
