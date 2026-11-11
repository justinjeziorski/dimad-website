import { NextRequest, NextResponse } from "next/server";
import { uidFromIdToken } from "@/lib/firebase-server";
import { createPkce } from "@/lib/pkce";
import { signOauthState } from "@/lib/oauth-state";

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
  const clientId = process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  const redirectUri = `${appUrl}/api/auth/calendly/callback`;
  const { verifier, challenge } = createPkce();

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

  const state = signOauthState({
    uid,
    ts: String(Date.now())
  });

  const authUrl =
    `https://auth.calendly.com/oauth/authorize?client_id=${clientId}` +
    `&response_type=code` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&code_challenge_method=S256` +
    `&code_challenge=${challenge}` +
    `&state=${state}`;

  const res = NextResponse.redirect(authUrl, 307);
  res.cookies.set("calendly_pkce", verifier, COOKIE);
  res.cookies.set("calendly_redirect_uri", redirectUri, COOKIE);
  if (idToken) res.cookies.set("dimad_fb_token", idToken, COOKIE);
  if (uid) res.cookies.set("calendly_uid", uid, COOKIE);
  return res;
}
