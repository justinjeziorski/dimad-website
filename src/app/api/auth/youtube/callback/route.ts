import { NextRequest, NextResponse } from "next/server";
import {
  clearYouTubeOauthCookies,
  exchangeYouTubeCode,
  writeYouTubeIntegration,
  youtubeAppBase,
  youtubeStatesMatch
} from "@/lib/youtube-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function finish(query: string) {
  const dest = new URL("/dashboard/index.html", youtubeAppBase());
  const params = new URLSearchParams(query);
  params.forEach((value, key) => dest.searchParams.set(key, value));
  return clearYouTubeOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const cookieState = req.cookies.get("youtube_oauth_state")?.value || "";
  const uid = req.cookies.get("youtube_oauth_uid")?.value || "";
  const idToken = req.cookies.get("youtube_fb_token")?.value || "";
  const returnedState = req.nextUrl.searchParams.get("state") || "";
  const code = req.nextUrl.searchParams.get("code") || "";

  if (!uid || !cookieState || !/^[A-Za-z0-9_-]{16,128}$/.test(uid)) {
    console.error("YouTube callback missing oauth session");
    return finish("connected=youtube&oauth=error&reason=login_required");
  }
  if (!youtubeStatesMatch(cookieState, returnedState)) {
    console.error("YouTube callback state mismatch");
    return finish("connected=youtube&oauth=error&reason=csrf");
  }

  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    console.error("YouTube OAuth denied", oauthError);
    return finish("connected=youtube&oauth=error&reason=denied");
  }

  if (!code || code.length > 2048) {
    console.error("YouTube callback missing code");
    return finish("connected=youtube&oauth=error&reason=missing_code");
  }

  try {
    const token = await exchangeYouTubeCode(code);
    await writeYouTubeIntegration(
      uid,
      {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        scope: token.scope,
        channelId: "",
        channelTitle: "",
        thumbnail: "",
        connectedAt: new Date().toISOString()
      },
      idToken || undefined
    );
    const res = finish("connected=youtube");
    if (idToken) {
      res.cookies.set("dimad_fb_token", idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3300
      });
    }
    return res;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "token_exchange_failed";
    console.error("YouTube callback failed", reason);
    const known = [
      "token_exchange_failed",
      "missing_client_id",
      "missing_client_secret",
      "firestore_permission_denied",
      "firestore_write_failed"
    ].includes(reason);
    return finish(
      `connected=youtube&oauth=error&reason=${encodeURIComponent(known ? reason : "token_exchange_failed")}`
    );
  }
}
