import { NextRequest, NextResponse } from "next/server";
import {
  clearGumroadOauthCookies,
  gumroadAppBase,
  gumroadAuthorizeUrl,
  newGumroadOauthState,
  setGumroadOauthCookies
} from "@/lib/integrations/gumroad/oauth";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect() {
  const login = new URL("/login.html", gumroadAppBase());
  login.searchParams.set("reason", "login_required");
  login.searchParams.set("next", "/dashboard");
  return NextResponse.redirect(login);
}

function fail(wantsJson: boolean, status: number, error: string) {
  if (wantsJson) return NextResponse.json({ ok: false, error }, { status });
  const dest = new URL("/dashboard", gumroadAppBase());
  dest.searchParams.set("gumroad", "error");
  dest.searchParams.set("reason", error);
  return clearGumroadOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const wantsJson = req.nextUrl.searchParams.get("format") === "json";
  const clientId = process.env.GUMROAD_CLIENT_ID || "";
  if (!clientId) return fail(wantsJson, 500, "missing_client_id");

  const session = await requireFirebaseUser(req);
  if ("error" in session) {
    if (wantsJson) return session.error;
    return loginRedirect();
  }

  try {
    const state = newGumroadOauthState();
    const url = gumroadAuthorizeUrl(state);
    const res = wantsJson ? NextResponse.json({ ok: true, url }) : NextResponse.redirect(url);
    return setGumroadOauthCookies(res, state, session.uid, session.idToken);
  } catch (err) {
    const error = err instanceof Error ? err.message : "gumroad_connect_failed";
    console.error("Gumroad connect start failed", error);
    return fail(wantsJson, 500, error === "missing_client_id" ? error : "gumroad_connect_failed");
  }
}
