import { NextResponse } from "next/server";
import { getDailyQuote, secondsUntilNextUtcMidnight } from "@/lib/quotes";

export const runtime = "nodejs";

export async function GET() {
  try {
    const quote = await getDailyQuote();
    const maxAge = secondsUntilNextUtcMidnight();
    return NextResponse.json(
      {
        quote: quote.quote,
        author: quote.author,
        context: quote.context,
        date: quote.date,
        source: quote.source
      },
      {
        headers: {
          "Cache-Control": `public, s-maxage=${maxAge}, stale-while-revalidate=300`
        }
      }
    );
  } catch (error) {
    console.error("GET /api/quotes/daily failed:", error);
    return NextResponse.json({ error: "quote_unavailable" }, { status: 500 });
  }
}
