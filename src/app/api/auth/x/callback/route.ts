import { NextRequest, NextResponse } from "next/server";
import {
  clearXOauthCookies,
  exchangeXCode,
  writeXIntegration,
  xAppBase,
  xStatesMatch
} from "@/lib/x-oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function finish(query: string) {
  const dest = new URL("/dashboard/index.html", xAppBase());
  const params = new URLSearchParams(query);
  params.forEach((value, key) => dest.searchParams.set(key, value));
  return clearXOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const cookieState = req.cookies.get("x_oauth_state")?.value || "";
  const verifier = req.cookies.get("x_oauth_verifier")?.value || "";
  const uid = req.cookies.get("x_oauth_uid")?.value || "";
  const idToken = req.cookies.get("x_fb_token")?.value || "";
  const returnedState = req.nextUrl.searchParams.get("state") || "";
  const code = req.nextUrl.searchParams.get("code") || "";

  if (!uid || !cookieState || !verifier || !/^[A-Za-z0-9_-]{16,128}$/.test(uid)) {
    console.error("X callback missing oauth session");
    return finish("connected=x&oauth=error&reason=login_required");
  }
  if (!xStatesMatch(cookieState, returnedState)) {
    console.error("X callback state mismatch");
    return finish("connected=x&oauth=error&reason=csrf");
  }

  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    console.error("X OAuth denied", oauthError);
    return finish("connected=x&oauth=error&reason=denied");
  }

  if (!code || code.length > 2048) {
    console.error("X callback missing code");
    return finish("connected=x&oauth=error&reason=missing_code");
  }

  try {
    const token = await exchangeXCode(code, verifier);
    await writeXIntegration(
      uid,
      {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expiresAt: token.expiresAt,
        scope: token.scope,
        userId: "",
        username: "",
        name: "",
        profileImageUrl: "",
        connectedAt: new Date().toISOString()
      },
      idToken || undefined
    );
    const res = finish("connected=x");
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
    console.error("X callback failed", reason);
    const known = [
      "token_exchange_failed",
      "missing_client_id",
      "missing_client_secret",
      "firestore_permission_denied",
      "firestore_write_failed"
    ].includes(reason);
    return finish(`connected=x&oauth=error&reason=${encodeURIComponent(known ? reason : "token_exchange_failed")}`);
  }
}
