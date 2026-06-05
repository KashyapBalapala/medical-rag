import fs from "node:fs/promises";
import { NextRequest, NextResponse } from "next/server";
import { assertPdfReadable } from "@/lib/pdf-path";

export async function GET(request: NextRequest) {
  try {
    const file = request.nextUrl.searchParams.get("file");

    if (!file || typeof file !== "string") {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const fullPath = await assertPdfReadable(file);
    const buffer = await fs.readFile(fullPath);
    const filename = file.split("/").pop() ?? "document.pdf";

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${filename}"`,
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load PDF";
    const status = message === "PDF not found" ? 404 : 400;

    return NextResponse.json({ error: message }, { status });
  }
}
