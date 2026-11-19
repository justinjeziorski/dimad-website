import { NextResponse } from "next/server";
import { listDailyQuotes, secondsUntilNextUtcMidnight } from "@/lib/quotes";

export const runtime = "nodejs";

export async function GET() {
  try {
    const quotes = await listDailyQuotes();
    const maxAge = Math.min(300, secondsUntilNextUtcMidnight());
    return NextResponse.json(
      { quotes, count: quotes.length },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=60`
        }
      }
    );
  } catch (error) {
    console.error("GET /api/quotes failed:", error);
    return NextResponse.json({ error: "quotes_unavailable" }, { status: 500 });
  }
}
