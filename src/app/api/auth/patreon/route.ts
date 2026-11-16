import { NextRequest, NextResponse } from "next/server";
import {
  clearPatreonOauthCookies,
  newPatreonOauthState,
  patreonAppBase,
  patreonAuthorizeUrl,
  setPatreonOauthCookies
} from "@/lib/patreon-oauth";
import { requireFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect() {
  const login = new URL("/login.html", patreonAppBase());
  login.searchParams.set("reason", "login_required");
  login.searchParams.set("next", "/dashboard");
  return NextResponse.redirect(login);
}

function fail(wantsJson: boolean, status: number, error: string) {
  if (wantsJson) return NextResponse.json({ ok: false, error }, { status });
  const dest = new URL("/dashboard", patreonAppBase());
  dest.searchParams.set("patreon", "error");
  dest.searchParams.set("reason", error);
  return clearPatreonOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const wantsJson = req.nextUrl.searchParams.get("format") === "json";
  const clientId = process.env.PATREON_CLIENT_ID || "";
  if (!clientId) return fail(wantsJson, 500, "missing_client_id");

  const session = await requireFirebaseUser(req);
  if ("error" in session) {
    if (wantsJson) return session.error;
    return loginRedirect();
  }

  try {
    const state = newPatreonOauthState();
    const url = patreonAuthorizeUrl(state);
    const res = wantsJson ? NextResponse.json({ ok: true, url }) : NextResponse.redirect(url);
    return setPatreonOauthCookies(res, state, session.uid, session.idToken);
  } catch (err) {
    const error = err instanceof Error ? err.message : "patreon_connect_failed";
    console.error("Patreon connect start failed", error);
    return fail(wantsJson, 500, error === "missing_client_id" ? error : "patreon_connect_failed");
  }
}
