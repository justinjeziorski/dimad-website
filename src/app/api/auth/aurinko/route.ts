import { NextRequest, NextResponse } from "next/server";
import { uidFromIdToken } from "@/lib/firebase-server";
import {
  aurinkoAuthorizeUrl,
  aurinkoCallbackUrl,
  aurinkoClientId,
  aurinkoServiceType,
  resolveAurinkoProvider
} from "@/lib/aurinko";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: 600
};

export async function GET(req: NextRequest) {
  const clientId = aurinkoClientId();
  if (!clientId) {
    return NextResponse.json({ error: "missing_aurinko_client_id" }, { status: 500 });
  }

  const provider = resolveAurinkoProvider(
    req.nextUrl.searchParams.get("provider") || req.nextUrl.searchParams.get("serviceType") || "google"
  );
  const serviceType = aurinkoServiceType(provider);

  const idToken =
    req.nextUrl.searchParams.get("id_token") ||
    req.cookies.get("dimad_fb_token")?.value ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  let uid = req.cookies.get("aurinko_uid")?.value || "";
  if (idToken) {
    try {
      uid = await uidFromIdToken(idToken);
    } catch (err) {
      console.error("Aurinko connect could not verify Firebase session", err);
      uid = uid && /^[A-Za-z0-9_-]{16,128}$/.test(uid) ? uid : "";
    }
  }

  if (!uid) {
    const login = new URL("/login.html", req.nextUrl.origin);
    login.searchParams.set("reason", "login_required");
    login.searchParams.set("next", "/dashboard");
    console.error("Aurinko connect blocked: no Firebase user");
    return NextResponse.redirect(login, 302);
  }

  const returnUrl = aurinkoCallbackUrl(req);
  const state = JSON.stringify({ userId: uid, provider });
  const authUrl = aurinkoAuthorizeUrl({
    clientId,
    serviceType,
    returnUrl,
    state
  });
  console.log("Aurinko authorize redirect for uid", uid, "provider", provider, "service", serviceType);

  const res = NextResponse.redirect(authUrl, 307);
  res.cookies.set("aurinko_uid", uid, COOKIE);
  res.cookies.set("aurinko_service", serviceType, COOKIE);
  res.cookies.set("aurinko_provider", provider, COOKIE);
  return res;
}
