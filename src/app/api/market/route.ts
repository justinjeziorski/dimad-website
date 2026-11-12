import { NextRequest, NextResponse } from "next/server";

const DEFAULT_WATCHLIST = ["AAPL", "MSFT", "NVDA", "TSLA", "SPY", "AMZN"] as const;

type FinnhubQuote = {
  c?: number;
  d?: number;
  dp?: number;
  h?: number;
  l?: number;
  error?: string;
};

type FinnhubArticle = {
  id?: number;
  headline?: string;
  source?: string;
  url?: string;
  datetime?: number;
  image?: string;
  error?: string;
};

export type MarketQuote = {
  symbol: string;
  price: number | null;
  change: number | null;
  percent: number | null;
  high: number | null;
  low: number | null;
};

export type MarketArticle = {
  id: number;
  headline: string;
  source: string;
  url: string;
  datetime: number;
  image: string;
};

const CACHE_HEADER = "s-maxage=60, stale-while-revalidate=30";

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseSymbols(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("symbols") || "";
  const fromQuery = raw
    .split(",")
    .map((sym) => sym.trim().toUpperCase().replace(/[^A-Z0-9.]/g, ""))
    .filter(Boolean);
  const list = fromQuery.length ? fromQuery : [...DEFAULT_WATCHLIST];
  return [...new Set(list)].slice(0, 24);
}

async function readJson<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error(`finnhub_${res.status}`);
  const data = (await res.json()) as T;
  if (data && typeof data === "object" && "error" in data && (data as { error?: string }).error) {
    throw new Error("finnhub_rejected");
  }
  return data;
}

export async function GET(req: NextRequest) {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Market data is unavailable because FINNHUB_API_KEY is not configured." },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }

  const symbols = parseSymbols(req);

  try {
    const quoteRequests = symbols.map(async (symbol) => {
      const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`, {
        next: { revalidate: 60 }
      });
      const quote = await readJson<FinnhubQuote>(res);
      return {
        symbol,
        price: num(quote.c),
        change: num(quote.d),
        percent: num(quote.dp),
        high: num(quote.h),
        low: num(quote.l)
      } satisfies MarketQuote;
    });

    const newsRequest = (async () => {
      const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${apiKey}`, {
        next: { revalidate: 60 }
      });
      const articles = await readJson<FinnhubArticle[]>(res);
      return (Array.isArray(articles) ? articles : []).slice(0, 6).map((article) => ({
        id: num(article.id) ?? 0,
        headline: article.headline || "Untitled",
        source: article.source || "Finnhub",
        url: article.url || "",
        datetime: num(article.datetime) ?? 0,
        image: article.image || ""
      })) satisfies MarketArticle[];
    })();

    const results = await Promise.all([...quoteRequests, newsRequest]);
    const news = results.at(-1) as MarketArticle[];
    const quotes = results.slice(0, -1) as MarketQuote[];

    return NextResponse.json(
      { quotes, news },
      { headers: { "Cache-Control": CACHE_HEADER } }
    );
  } catch {
    return NextResponse.json(
      { error: "Market data is temporarily unavailable." },
      { status: 502, headers: { "Cache-Control": "no-store" } }
    );
  }
}
