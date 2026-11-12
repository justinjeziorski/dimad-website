import { NextRequest, NextResponse } from "next/server";

type FinnhubHit = {
  symbol?: string;
  description?: string;
  type?: string;
  displaySymbol?: string;
};

export async function GET(req: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Market search is unavailable because FINNHUB_API_KEY is not configured." },
      { status: 500 }
    );
  }

  const q = String(req.nextUrl.searchParams.get("q") || "").trim();
  if (q.length < 1) return NextResponse.json({ results: [] });

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/search?q=${encodeURIComponent(q)}&token=${apiKey}`,
      { next: { revalidate: 300 } }
    );
    if (!res.ok) throw new Error(`finnhub_${res.status}`);
    const data = (await res.json()) as { result?: FinnhubHit[]; error?: string };
    if (data.error) throw new Error("finnhub_rejected");
    const results = (data.result || [])
      .filter((row) => row.symbol)
      .slice(0, 8)
      .map((row) => ({
        symbol: String(row.displaySymbol || row.symbol || "").toUpperCase(),
        description: String(row.description || ""),
        type: String(row.type || "")
      }));
    return NextResponse.json(
      { results },
      { headers: { "Cache-Control": "s-maxage=300, stale-while-revalidate=60" } }
    );
  } catch {
    return NextResponse.json({ error: "Market search is temporarily unavailable." }, { status: 502 });
  }
}
