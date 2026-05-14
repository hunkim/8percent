import { NextResponse } from "next/server";
import { getIndices } from "@/lib/indices";

export const runtime = "nodejs";
// 60s cache — Yahoo data is ~15min delayed anyway. Short cache keeps the
// strip feeling live without hammering Yahoo.
export const revalidate = 60;

export async function GET() {
  try {
    const data = await getIndices();
    return NextResponse.json({ fetchedAt: Date.now(), data });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
