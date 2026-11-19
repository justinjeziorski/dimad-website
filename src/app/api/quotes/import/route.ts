import { NextRequest, NextResponse } from "next/server";
import { importDailyQuotes, INITIAL_DAILY_QUOTES, isUtcDateKey } from "@/lib/quotes";
import type { QuoteImportItem } from "@/lib/quotes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest): boolean {
  const secret = process.env.QUOTES_IMPORT_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") || "";
  const bearer = header.startsWith("Bearer ") ? header.slice(7).trim() : "";
  const query = request.nextUrl.searchParams.get("secret") || "";
  return bearer === secret || query === secret;
}

/**
 * Explicit bulk import trigger. Never auto-runs.
 * POST body: { items?: QuoteImportItem[], startDate?: "YYYY-MM-DD", useSeed?: boolean }
 * Auth: Authorization: Bearer $QUOTES_IMPORT_SECRET
 */
export async function POST(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      items?: QuoteImportItem[];
      startDate?: string;
      useSeed?: boolean;
    };

    const startDate = body.startDate?.trim();
    if (startDate && !isUtcDateKey(startDate)) {
      return NextResponse.json({ error: "invalid_start_date" }, { status: 400 });
    }

    const items =
      Array.isArray(body.items) && body.items.length > 0
        ? body.items
        : body.useSeed === false
          ? []
          : INITIAL_DAILY_QUOTES;

    if (!items.length) {
      return NextResponse.json({ error: "items_required" }, { status: 400 });
    }

    const result = await importDailyQuotes(items, { startDate });
    return NextResponse.json({
      ok: true,
      ...result,
      count: {
        written: result.written.length,
        skipped: result.skipped.length,
        total: items.length
      }
    });
  } catch (error) {
    console.error("POST /api/quotes/import failed:", error);
    const message = error instanceof Error ? error.message : "import_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
