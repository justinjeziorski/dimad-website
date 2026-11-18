import { NextRequest, NextResponse } from "next/server";
import {
  clearGumroadOauthCookies,
  exchangeGumroadCode,
  gumroadAppBase,
  gumroadStatesMatch,
  writeGumroadIntegration
} from "@/lib/integrations/gumroad/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function finish(query: string) {
  const dest = new URL("/dashboard/index.html", gumroadAppBase());
  const params = new URLSearchParams(query);
  params.forEach((value, key) => dest.searchParams.set(key, value));
  return clearGumroadOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const cookieState = req.cookies.get("gumroad_oauth_state")?.value || "";
  const uid = req.cookies.get("gumroad_oauth_uid")?.value || "";
  const idToken = req.cookies.get("gumroad_fb_token")?.value || "";
  const returnedState = req.nextUrl.searchParams.get("state") || "";
  const code = req.nextUrl.searchParams.get("code") || "";

  if (!uid || !cookieState || !/^[A-Za-z0-9_-]{16,128}$/.test(uid)) {
    console.error("Gumroad callback missing oauth session");
    return finish("connected=gumroad&oauth=error&reason=login_required");
  }
  if (!gumroadStatesMatch(cookieState, returnedState)) {
    console.error("Gumroad callback state mismatch");
    return finish("connected=gumroad&oauth=error&reason=csrf");
  }

  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    console.error("Gumroad OAuth denied", oauthError);
    return finish("connected=gumroad&oauth=error&reason=denied");
  }

  if (!code || code.length > 512) {
    console.error("Gumroad callback missing code");
    return finish("connected=gumroad&oauth=error&reason=missing_code");
  }

  try {
    const token = await exchangeGumroadCode(code);
    await writeGumroadIntegration(
      uid,
      {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        scope: token.scope,
        userId: "",
        name: "",
        email: "",
        profileUrl: "",
        connectedAt: new Date().toISOString()
      },
      idToken || undefined
    );
    const res = finish("connected=gumroad");
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
    console.error("Gumroad callback failed", reason);
    const known = [
      "token_exchange_failed",
      "missing_client_id",
      "missing_client_secret",
      "firestore_permission_denied",
      "firestore_write_failed"
    ].includes(reason);
    return finish(
      `connected=gumroad&oauth=error&reason=${encodeURIComponent(known ? reason : "token_exchange_failed")}`
    );
  }
}
