import { NextResponse } from "next/server";
import { getSystemStats } from "@/lib/stats";

export async function GET() {
  try {
    const stats = await getSystemStats();

    return NextResponse.json(stats);
  } catch (error) {
    console.error("[api/stats] error:", error);

    return NextResponse.json(
      { error: "Failed to load system stats" },
      { status: 500 },
    );
  }
}
