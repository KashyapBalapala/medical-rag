import { NextRequest, NextResponse } from "next/server";
import { getChunkByReference } from "@/lib/chunk-lookup";

export async function GET(request: NextRequest) {
  try {
    const file = request.nextUrl.searchParams.get("file");
    const chunkIndexRaw = request.nextUrl.searchParams.get("chunkIndex");

    if (!file || typeof file !== "string") {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const chunkIndex = Number(chunkIndexRaw);
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      return NextResponse.json(
        { error: "chunkIndex must be a non-negative integer" },
        { status: 400 },
      );
    }

    const chunk = await getChunkByReference(file, chunkIndex);

    if (!chunk) {
      return NextResponse.json({ error: "Chunk not found" }, { status: 404 });
    }

    return NextResponse.json(chunk);
  } catch (error) {
    console.error("[api/sources/chunk]", error);
    return NextResponse.json(
      { error: "Failed to load chunk" },
      { status: 500 },
    );
  }
}
