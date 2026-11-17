import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function decodeHeader(value: string | null) {
  if (!value) return null;
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export async function GET(request: NextRequest) {
  const rawCity = request.headers.get("x-vercel-ip-city") || request.headers.get("cf-ipcity") || "";
  const decodedCity = rawCity ? decodeHeader(rawCity) : null;

  if (!decodedCity) {
    return NextResponse.json({ city: null, source: "none" }, { status: 200 });
  }

  return NextResponse.json({
    city: decodedCity,
    country: request.headers.get("x-vercel-ip-country") || request.headers.get("cf-ipcountry") || null,
    timezone: request.headers.get("x-vercel-ip-timezone") || request.headers.get("cf-timezone") || null,
    source: "ip_header"
  });
}
