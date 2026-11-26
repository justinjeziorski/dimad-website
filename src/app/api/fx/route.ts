import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const FRANKFURTER_RATES = "https://api.frankfurter.dev/v2/rates";
const FRANKFURTER_CURRENCIES = "https://api.frankfurter.dev/v2/currencies";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

type CacheRow = { at: number; body: unknown };
const cache = new Map<string, CacheRow>();

type FrankfurterRateRow = {
  date?: string;
  base?: string;
  quote?: string;
  rate?: number;
};

type FrankfurterCurrencyRow = {
  iso_code?: string;
  name?: string;
  symbol?: string | null;
  type?: string;
};

function readCache(key: string): unknown | null {
  const row = cache.get(key);
  if (!row) return null;
  if (Date.now() - row.at > CACHE_TTL_MS) {
    cache.delete(key);
    return null;
  }
  return row.body;
}

function writeCache(key: string, body: unknown) {
  cache.set(key, { at: Date.now(), body });
  if (cache.size > 80) {
    const oldest = cache.keys().next().value;
    if (oldest) cache.delete(oldest);
  }
}

function normalizeRates(base: string, rows: FrankfurterRateRow[]) {
  const rates: Record<string, number> = { [base]: 1 };
  let date = "";
  for (const row of rows) {
    const quote = String(row.quote || "")
      .trim()
      .toUpperCase();
    const rate = Number(row.rate);
    if (!quote || !Number.isFinite(rate)) continue;
    rates[quote] = rate;
    if (!date && row.date) date = String(row.date);
  }
  return { base, date, rates };
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const listCurrencies = searchParams.get("currencies") === "1";

  if (listCurrencies) {
    const cached = readCache("currencies");
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": "public, max-age=3600" }
      });
    }
    try {
      const res = await fetch(FRANKFURTER_CURRENCIES, {
        headers: { Accept: "application/json" },
        next: { revalidate: 21600 }
      });
      if (!res.ok) {
        return NextResponse.json({ error: `frankfurter_${res.status}` }, { status: 502 });
      }
      const rows = (await res.json()) as FrankfurterCurrencyRow[];
      const currencies = (Array.isArray(rows) ? rows : [])
        .map((row) => ({
          code: String(row.iso_code || "")
            .trim()
            .toUpperCase(),
          name: String(row.name || "").trim(),
          symbol: row.symbol ? String(row.symbol) : "",
          type: String(row.type || "currency")
        }))
        .filter((c) => /^[A-Z0-9]{2,8}$/.test(c.code));
      const body = { currencies };
      writeCache("currencies", body);
      return NextResponse.json(body, {
        headers: { "Cache-Control": "public, max-age=3600" }
      });
    } catch (err) {
      return NextResponse.json(
        { error: "frankfurter_currencies_failed", detail: String(err) },
        { status: 502 }
      );
    }
  }

  const base = String(searchParams.get("base") || "USD")
    .trim()
    .toUpperCase()
    .slice(0, 8);
  if (!/^[A-Z0-9]{2,8}$/.test(base)) {
    return NextResponse.json({ error: "invalid_base" }, { status: 400 });
  }

  const cacheKey = `rates:${base}`;
  const cached = readCache(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { "Cache-Control": "public, max-age=300" }
    });
  }

  try {
    const url = `${FRANKFURTER_RATES}?base=${encodeURIComponent(base)}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      next: { revalidate: 21600 }
    });
    if (!res.ok) {
      return NextResponse.json({ error: `frankfurter_${res.status}` }, { status: 502 });
    }
    const rows = (await res.json()) as FrankfurterRateRow[];
    const body = normalizeRates(base, Array.isArray(rows) ? rows : []);
    writeCache(cacheKey, body);
    return NextResponse.json(body, {
      headers: { "Cache-Control": "public, max-age=300" }
    });
  } catch (err) {
    return NextResponse.json(
      { error: "frankfurter_rates_failed", detail: String(err) },
      { status: 502 }
    );
  }
}
