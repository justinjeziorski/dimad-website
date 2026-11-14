import { NextRequest, NextResponse } from "next/server";
import { exchangeStripeCode, clearStripeOauthCookies, stripeAppBase, stripeStatesMatch, safeStripeError } from "@/lib/stripe-connect";
import { signStripeAccount, writeStripeIntegration } from "@/lib/stripe-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function finish(query: string) {
  const dest = new URL("/dashboard", stripeAppBase());
  const params = new URLSearchParams(query);
  params.forEach((value, key) => dest.searchParams.set(key, value));
  return clearStripeOauthCookies(NextResponse.redirect(dest));
}

export async function GET(req: NextRequest) {
  const cookieState = req.cookies.get("stripe_oauth_state")?.value || "";
  const uid = req.cookies.get("stripe_oauth_uid")?.value || "";
  const idToken = req.cookies.get("stripe_fb_token")?.value || "";
  const returnedState = req.nextUrl.searchParams.get("state") || "";

  if (!uid || !cookieState || !/^[A-Za-z0-9_-]{16,128}$/.test(uid)) {
    console.error("Stripe callback missing oauth session");
    return finish("stripe=error&reason=login_required");
  }
  if (!stripeStatesMatch(cookieState, returnedState)) {
    console.error("Stripe callback state mismatch");
    return finish("stripe=error&reason=csrf");
  }

  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    console.error("Stripe OAuth denied", oauthError);
    return finish("stripe=error&reason=denied");
  }

  const code = req.nextUrl.searchParams.get("code") || "";
  if (!code || code.length > 512) {
    console.error("Stripe callback missing code");
    return finish("stripe=error&reason=missing_code");
  }

  try {
    const linked = await exchangeStripeCode(code);
    await writeStripeIntegration(uid, {
      stripe_user_id: linked.stripeUserId,
      connectedAt: new Date().toISOString(),
      livemode: linked.livemode,
      account_mac: signStripeAccount(uid, linked.stripeUserId)
    }, idToken || undefined);
    return finish("stripe=connected");
  } catch (err) {
    const reason = safeStripeError(err);
    console.error("Stripe callback failed", reason);
    const known = reason === "invalid_stripe_account" || reason === "firestore_permission_denied" || reason === "firestore_write_failed" || reason === "missing_stripe_secret";
    return finish(`stripe=error&reason=${encodeURIComponent(known ? reason : "token_exchange_failed")}`);
  }
}
