import { NextRequest, NextResponse } from "next/server";
import {
  clearYouTubeOauthCookies,
  newYouTubeOauthState,
  setYouTubeOauthCookies,
  youtubeAppBase,
  youtubeAuthorizeUrl
} from "@/lib/integrations/youtube/oauth";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect() {
  const login = new URL("/login.html", youtubeAppBase());
  login.searchParams.set("reason", "login_required");
  login.searchParams.set("next", "/dashboard");
  return NextResponse.redirect(login);
}

function fail(wantsJson: boolean, status: number, error: string) {
  if (wantsJson) return NextResponse.json({ ok: false, error }, { status });
  const dest = new URL("/dashboard", youtubeAppBase());
  dest.searchParams.set("youtube", "error");
  dest.searchParams.set("reason", error);
  return clearYouTubeOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const wantsJson = req.nextUrl.searchParams.get("format") === "json";
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  if (!clientId) return fail(wantsJson, 500, "missing_client_id");

  const session = await requireFirebaseUser(req);
  if ("error" in session) {
    if (wantsJson) return session.error;
    return loginRedirect();
  }

  try {
    const state = newYouTubeOauthState();
    const url = youtubeAuthorizeUrl(state);
    const res = wantsJson ? NextResponse.json({ ok: true, url }) : NextResponse.redirect(url);
    return setYouTubeOauthCookies(res, state, session.uid, session.idToken);
  } catch (err) {
    const error = err instanceof Error ? err.message : "youtube_connect_failed";
    console.error("YouTube connect start failed", error);
    return fail(wantsJson, 500, error === "missing_client_id" ? error : "youtube_connect_failed");
  }
}
