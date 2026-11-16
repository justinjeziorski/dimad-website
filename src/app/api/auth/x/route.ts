import { NextRequest, NextResponse } from "next/server";
import {
  clearXOauthCookies,
  newXOauthState,
  newXPkcePair,
  setXOauthCookies,
  xAppBase,
  xAuthorizeUrl
} from "@/lib/x-oauth";
import { requireFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect() {
  const login = new URL("/login.html", xAppBase());
  login.searchParams.set("reason", "login_required");
  login.searchParams.set("next", "/dashboard");
  return NextResponse.redirect(login);
}

function fail(wantsJson: boolean, status: number, error: string) {
  if (wantsJson) return NextResponse.json({ ok: false, error }, { status });
  const dest = new URL("/dashboard", xAppBase());
  dest.searchParams.set("x", "error");
  dest.searchParams.set("reason", error);
  return clearXOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const wantsJson = req.nextUrl.searchParams.get("format") === "json";
  const clientId = process.env.X_CLIENT_ID || "";
  if (!clientId) return fail(wantsJson, 500, "missing_client_id");

  const session = await requireFirebaseUser(req);
  if ("error" in session) {
    if (wantsJson) return session.error;
    return loginRedirect();
  }

  try {
    const state = newXOauthState();
    const { verifier, challenge } = newXPkcePair();
    const url = xAuthorizeUrl(state, challenge);
    const res = wantsJson ? NextResponse.json({ ok: true, url }) : NextResponse.redirect(url);
    return setXOauthCookies(res, state, verifier, session.uid, session.idToken);
  } catch (err) {
    const error = err instanceof Error ? err.message : "x_connect_failed";
    console.error("X connect start failed", error);
    return fail(wantsJson, 500, error === "missing_client_id" ? error : "x_connect_failed");
  }
}
