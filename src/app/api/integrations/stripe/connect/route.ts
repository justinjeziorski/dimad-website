import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import {
  clearStripeOauthCookies,
  newStripeOauthState,
  setStripeOauthCookies,
  stripeAppBase,
  stripeAuthorizeUrl
} from "@/lib/stripe-connect";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function loginRedirect() {
  const login = new URL("/login.html", stripeAppBase());
  login.searchParams.set("reason", "login_required");
  login.searchParams.set("next", "/dashboard");
  return NextResponse.redirect(login);
}

function fail(wantsJson: boolean, status: number, error: string) {
  if (wantsJson) return NextResponse.json({ ok: false, error }, { status });
  const dest = new URL("/dashboard", stripeAppBase());
  dest.searchParams.set("stripe", "error");
  dest.searchParams.set("reason", error);
  return clearStripeOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const wantsJson = req.nextUrl.searchParams.get("format") === "json";
  if (!process.env.STRIPE_CONNECT_CLIENT_ID) return fail(wantsJson, 500, "missing_client_id");
  if (!process.env.STRIPE_SECRET_KEY) return fail(wantsJson, 500, "missing_stripe_secret");

  const session = await requireFirebaseUser(req);
  if ("error" in session) {
    if (wantsJson) return session.error;
    return loginRedirect();
  }

  try {
    const state = newStripeOauthState();
    const url = stripeAuthorizeUrl(state);
    const res = wantsJson
      ? NextResponse.json({ ok: true, url })
      : NextResponse.redirect(url);
    return setStripeOauthCookies(res, state, session.uid, session.idToken);
  } catch (err) {
    const error = err instanceof Error ? err.message : "stripe_connect_failed";
    console.error("Stripe connect start failed", error);
    return fail(wantsJson, 500, error === "missing_client_id" ? error : "stripe_connect_failed");
  }
}
