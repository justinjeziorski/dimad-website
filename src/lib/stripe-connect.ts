import { randomBytes, timingSafeEqual } from "crypto";
import Stripe from "stripe";
import { NextResponse } from "next/server";
import {
  cleanStripeText,
  currencyBuckets,
  formatMoneyList,
  maskStripeAccount,
  monthlyRecurringCents
} from "./stripe-metrics";
import type { StripeConnectedMetrics } from "./stripe-types";

const OAUTH_COOKIES = ["stripe_oauth_state", "stripe_oauth_uid", "stripe_fb_token"] as const;

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("missing_stripe_secret");
  if (!stripeClient) stripeClient = new Stripe(key);
  return stripeClient;
}

export function stripeAppBase() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function stripeRedirectUri() {
  return `${stripeAppBase()}/api/integrations/stripe/callback`;
}

export function newStripeOauthState() {
  return randomBytes(32).toString("base64url");
}

export function stripeStatesMatch(left: string, right: string) {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length === 0 || a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function cookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600
  };
}

export function setStripeOauthCookies(res: NextResponse, state: string, uid: string, idToken: string) {
  const options = cookieOptions();
  res.cookies.set("stripe_oauth_state", state, options);
  res.cookies.set("stripe_oauth_uid", uid, options);
  if (idToken) res.cookies.set("stripe_fb_token", idToken, options);
  return res;
}

export function clearStripeOauthCookies(res: NextResponse) {
  const options = { ...cookieOptions(), maxAge: 0 };
  for (const name of OAUTH_COOKIES) res.cookies.set(name, "", options);
  return res;
}

export function stripeAuthorizeUrl(state: string) {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID || "";
  if (!clientId) throw new Error("missing_client_id");
  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "read_write");
  url.searchParams.set("stripe_landing", "login");
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", stripeRedirectUri());
  return url.toString();
}

export function safeStripeError(err: unknown) {
  const message = err instanceof Error ? err.message : "stripe_request_failed";
  if (/sk_(live|test)_/i.test(message) || message.length > 180) return "stripe_request_failed";
  return message;
}

export async function exchangeStripeCode(code: string) {
  const token = await getStripe().oauth.token({
    grant_type: "authorization_code",
    code
  });
  const stripeUserId = String(token.stripe_user_id || "");
  if (!/^acct_[A-Za-z0-9]+$/.test(stripeUserId)) throw new Error("invalid_stripe_account");
  return { stripeUserId, livemode: token.livemode === true };
}

export async function deauthorizeStripeAccount(stripeUserId: string) {
  const clientId = process.env.STRIPE_CONNECT_CLIENT_ID || "";
  if (!clientId) throw new Error("missing_client_id");
  await getStripe().oauth.deauthorize({
    client_id: clientId,
    stripe_user_id: stripeUserId
  });
}

function addAmount(totals: Map<string, number>, currency: string, amount: number) {
  const code = currency || "usd";
  totals.set(code, (totals.get(code) || 0) + amount);
}

function displayRows(totals: Map<string, number>) {
  const nonzero = currencyBuckets(totals, false);
  if (nonzero.length) return nonzero;
  const zeros = currencyBuckets(totals, true);
  return zeros.length ? [zeros[0]] : [];
}

async function listRecentCharges(stripe: Stripe, stripeAccount: string, since: number) {
  const charges: Stripe.Charge[] = [];
  let startingAfter = "";
  let capped = false;
  for (let page = 0; page < 5; page += 1) {
    const result = await stripe.charges.list(
      {
        limit: 100,
        created: { gte: since },
        ...(startingAfter ? { starting_after: startingAfter } : {})
      },
      { stripeAccount }
    );
    charges.push(...result.data);
    if (!result.has_more || result.data.length === 0) return { charges, capped };
    startingAfter = result.data[result.data.length - 1]?.id || "";
    if (!startingAfter) return { charges, capped };
  }
  capped = true;
  return { charges, capped };
}

async function listActiveSubscriptions(stripe: Stripe, stripeAccount: string) {
  const subscriptions: Stripe.Subscription[] = [];
  let startingAfter = "";
  let capped = false;
  for (let page = 0; page < 3; page += 1) {
    const result = await stripe.subscriptions.list(
      {
        status: "active",
        limit: 100,
        ...(startingAfter ? { starting_after: startingAfter } : {})
      },
      { stripeAccount }
    );
    subscriptions.push(...result.data);
    if (!result.has_more || result.data.length === 0) return { subscriptions, capped };
    startingAfter = result.data[result.data.length - 1]?.id || "";
    if (!startingAfter) return { subscriptions, capped };
  }
  capped = true;
  return { subscriptions, capped };
}

function subscriptionMonthly(item: Stripe.SubscriptionItem) {
  const price = item.price;
  const legacy = (item as Stripe.SubscriptionItem & {
    plan?: { amount?: number | null; currency?: string | null; interval?: string; interval_count?: number | null };
  }).plan;
  const unit = price?.unit_amount ?? legacy?.amount ?? 0;
  const currency = price?.currency || legacy?.currency || "usd";
  const recurring = price?.recurring
    ? { interval: price.recurring.interval, interval_count: price.recurring.interval_count }
    : legacy?.interval
      ? { interval: legacy.interval, interval_count: legacy.interval_count || 1 }
      : null;
  return {
    currency,
    cents: monthlyRecurringCents(unit || 0, item.quantity || 1, recurring?.interval, recurring?.interval_count || 1)
  };
}

export async function loadStripeMetrics(stripeUserId: string, connectedAt: string, livemode: boolean): Promise<Omit<StripeConnectedMetrics, "ok" | "connected">> {
  const stripe = getStripe();
  const since = Math.floor(Date.now() / 1000) - 30 * 24 * 60 * 60;
  const [balance, chargePage, subscriptionPage] = await Promise.all([
    stripe.balance.retrieve(undefined, { stripeAccount: stripeUserId }),
    listRecentCharges(stripe, stripeUserId, since),
    listActiveSubscriptions(stripe, stripeUserId)
  ]);

  const successful = chargePage.charges.filter((charge) => charge.status === "succeeded");
  const gross = new Map<string, number>();
  for (const charge of successful) addAmount(gross, charge.currency, charge.amount || 0);

  const mrr = new Map<string, number>();
  for (const subscription of subscriptionPage.subscriptions) {
    for (const item of subscription.items?.data || []) {
      const monthly = subscriptionMonthly(item);
      addAmount(mrr, monthly.currency, monthly.cents);
    }
  }

  const availableTotals = new Map<string, number>();
  const pendingTotals = new Map<string, number>();
  for (const row of balance.available || []) addAmount(availableTotals, row.currency, row.amount || 0);
  for (const row of balance.pending || []) addAmount(pendingTotals, row.currency, row.amount || 0);
  const available = displayRows(availableTotals);
  const pending = displayRows(pendingTotals);
  const recent = successful
    .slice()
    .sort((a, b) => b.created - a.created)
    .slice(0, 10)
    .map((charge) => ({
      id: charge.id,
      description: cleanStripeText(charge.description || "Payment"),
      created: charge.created,
      displayAmount: formatMoneyList([{ amount: charge.amount || 0, currency: charge.currency || "usd" }])
    }));

  return {
    accountLabel: maskStripeAccount(stripeUserId),
    connectedAt,
    livemode,
    activeSubscriptions: subscriptionPage.subscriptions.length,
    subscriptionsCapped: subscriptionPage.capped,
    successfulCount: successful.length,
    display: {
      available: formatMoneyList(available),
      pending: formatMoneyList(pending),
      gross30d: formatMoneyList(displayRows(gross)),
      mrr: formatMoneyList(displayRows(mrr))
    },
    recent
  };
}
