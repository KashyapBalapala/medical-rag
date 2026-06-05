import { NextResponse } from "next/server";
import { getDocumentLibrary } from "@/lib/documents";

export async function GET() {
  try {
    const library = await getDocumentLibrary();

    return NextResponse.json(library);
  } catch (error) {
    console.error("[api/documents] error:", error);

    return NextResponse.json(
      { error: "Failed to load document library" },
      { status: 500 },
    );
  }
}
