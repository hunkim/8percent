import { NextResponse } from "next/server";
import { getAllReturns } from "@/lib/returns";

export const runtime = "nodejs";
// Cache the response for 24 hours. On Vercel this is served from the data cache
// without re-running the heavy Yahoo fetch.
export const revalidate = 86400;
// Vercel hobby tier max. The full fetch is ~18s locally; serverless cold start
// adds a few more seconds but should stay well under this.
export const maxDuration = 60;

export async function GET() {
  try {
    const { data, fetchedAt, cached } = await getAllReturns();
    return NextResponse.json({
      fetchedAt,
      cached,
      count: data.length,
      data,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
