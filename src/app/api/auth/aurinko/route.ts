import { NextRequest, NextResponse } from "next/server";
import { uidFromIdToken } from "@/lib/firebase-server";
import { signOauthState } from "@/lib/oauth-state";
import { aurinkoAuthorizeUrl, aurinkoCallbackUrl } from "@/lib/aurinko";

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
  const clientId = process.env.NEXT_PUBLIC_AURINKO_CLIENT_ID || "";
  if (!clientId) {
    return NextResponse.json({ error: "missing_aurinko_client_id" }, { status: 500 });
  }

  const serviceTypeRaw = (req.nextUrl.searchParams.get("serviceType") || "Google").toLowerCase();
  const serviceType = serviceTypeRaw.includes("365") || serviceTypeRaw.includes("outlook") || serviceTypeRaw.includes("office")
    ? "Office365"
    : "Google";

  const idToken =
    req.nextUrl.searchParams.get("id_token") ||
    req.cookies.get("dimad_fb_token")?.value ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  let uid = "";
  if (idToken) {
    try {
      uid = await uidFromIdToken(idToken);
    } catch {
      uid = "";
    }
  }

  const returnUrl = aurinkoCallbackUrl(req);
  const state = signOauthState({
    uid,
    ts: String(Date.now()),
    serviceType
  });

  const authUrl = aurinkoAuthorizeUrl({
    clientId,
    serviceType,
    returnUrl,
    state
  });

  const res = NextResponse.redirect(authUrl, 307);
  if (idToken) res.cookies.set("dimad_fb_token", idToken, COOKIE);
  if (uid) res.cookies.set("aurinko_uid", uid, COOKIE);
  res.cookies.set("aurinko_service", serviceType, COOKIE);
  return res;
}
