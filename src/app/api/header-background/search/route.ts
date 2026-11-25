import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Server proxy for Unsplash landscape search (keeps UNSPLASH_ACCESS_KEY off the client).
 * Returns the same shape used by resolveHeaderBackground's search helper.
 */
export async function GET(req: NextRequest) {
  const query = String(req.nextUrl.searchParams.get("query") || "").trim();
  if (!query) {
    return NextResponse.json({ error: "missing_query" }, { status: 400 });
  }

  const accessKey = process.env.UNSPLASH_ACCESS_KEY || process.env.NEXT_PUBLIC_UNSPLASH_ACCESS_KEY;
  if (!accessKey) {
    return NextResponse.json({ error: "missing_unsplash_key" }, { status: 500 });
  }

  try {
    const url = new URL("https://api.unsplash.com/search/photos");
    url.searchParams.set("query", query);
    url.searchParams.set("orientation", "landscape");
    url.searchParams.set("per_page", "5");
    url.searchParams.set("content_filter", "high");

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Client-ID ${accessKey}` },
      next: { revalidate: 0 }
    });

    if (!res.ok) {
      return NextResponse.json({ error: "unsplash_error", status: res.status }, { status: 502 });
    }

    const json = await res.json();
    const results = Array.isArray(json?.results) ? json.results : [];
    if (results.length === 0) {
      return NextResponse.json(null);
    }

    const chosen =
      results.find((p: { width?: number; height?: number }) => (p?.width ?? 0) > (p?.height ?? 0)) ??
      results[0];

    const imageUrl: string | undefined =
      chosen?.urls?.regular || chosen?.urls?.full || chosen?.urls?.raw;
    if (!imageUrl) return NextResponse.json(null);

    const utmSuffix = "?utm_source=dimad&utm_medium=referral";
    const profileBase = chosen?.user?.links?.html as string | undefined;

    return NextResponse.json({
      imageUrl,
      blurHash: chosen?.blur_hash,
      photographerName: chosen?.user?.name,
      photographerUrl: profileBase ? `${profileBase}${utmSuffix}` : undefined
    });
  } catch {
    return NextResponse.json({ error: "search_failed" }, { status: 500 });
  }
}
