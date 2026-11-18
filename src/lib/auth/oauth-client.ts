"use client";

import { dimadAuth, waitForFirebaseToken } from "@/lib/auth/client";

/** Fast client-side OAuth kickoff — never call /api/auth/[provider] just to build a URL. */

const GUMROAD_SCOPES = "edit_products view_sales view_profile view_payouts";
const SHOPIFY_SCOPES = "read_products,read_orders,read_customers,read_analytics";
const YOUTUBE_SCOPE = "https://www.googleapis.com/auth/youtube.readonly";
const X_SCOPES = "tweet.read users.read follows.read offline.access";

function appBase() {
  return (process.env.NEXT_PUBLIC_APP_URL || window.location.origin).replace(/\/$/, "");
}

function env(name: string, fallback = "") {
  const value = (process.env[name] || fallback || "").trim();
  return value;
}

function redirectOr(publicName: string, path: string) {
  return env(publicName) || `${appBase()}${path}`;
}

function base64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  for (let i = 0; i < view.length; i += 1) binary += String.fromCharCode(view[i]!);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function newOauthState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64Url(bytes);
}

export async function createPkcePair() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const verifier = base64Url(bytes);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier));
  return { verifier, challenge: base64Url(digest) };
}

/** Short-lived Lax cookies readable by the callback route (not HttpOnly — tradeoff for zero cold-start). */
export function setOauthCookie(name: string, value: string, maxAgeSec = 600) {
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Max-Age=${maxAgeSec}; Path=/; SameSite=Lax${secure}`;
}

function uidFromToken(token: string) {
  try {
    const payload = token.split(".")[1] || "";
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const data = JSON.parse(json) as { user_id?: string; sub?: string };
    return String(data.user_id || data.sub || "");
  } catch {
    return "";
  }
}

export async function requireClientSession() {
  const token = await waitForFirebaseToken(4000);
  if (!token) return { ok: false as const, error: "login_required" };
  const auth = dimadAuth();
  const uid = String(auth?.currentUser?.uid || uidFromToken(token) || "");
  if (!uid || !/^[A-Za-z0-9_-]{16,128}$/.test(uid)) {
    return { ok: false as const, error: "login_required" };
  }
  setOauthCookie("dimad_fb_token", token, 3300);
  return { ok: true as const, token, uid };
}

function navigateTop(url: string) {
  (window.top || window).location.href = url;
}

export async function startYoutubeOAuth() {
  const clientId = env("NEXT_PUBLIC_GOOGLE_CLIENT_ID", env("NEXT_PUBLIC_YOUTUBE_CLIENT_ID"));
  if (!clientId) return { ok: false as const, error: "missing_client_id" };
  const session = await requireClientSession();
  if (!session.ok) return session;

  const state = newOauthState();
  setOauthCookie("youtube_oauth_state", state);
  setOauthCookie("youtube_oauth_uid", session.uid);
  setOauthCookie("youtube_fb_token", session.token);

  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectOr("NEXT_PUBLIC_YOUTUBE_REDIRECT_URI", "/api/auth/youtube/callback"));
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", YOUTUBE_SCOPE);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  navigateTop(url.toString());
  return { ok: true as const };
}

export async function startXOauth() {
  const clientId = env("NEXT_PUBLIC_X_CLIENT_ID");
  if (!clientId) return { ok: false as const, error: "missing_client_id" };
  const session = await requireClientSession();
  if (!session.ok) return session;

  const state = newOauthState();
  const { verifier, challenge } = await createPkcePair();
  setOauthCookie("x_oauth_state", state);
  setOauthCookie("x_oauth_verifier", verifier);
  setOauthCookie("x_oauth_uid", session.uid);
  setOauthCookie("x_fb_token", session.token);

  const url = new URL("https://twitter.com/i/oauth2/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectOr("NEXT_PUBLIC_X_REDIRECT_URI", "/api/auth/x/callback"));
  url.searchParams.set("scope", X_SCOPES);
  url.searchParams.set("state", state);
  url.searchParams.set("code_challenge", challenge);
  url.searchParams.set("code_challenge_method", "S256");
  navigateTop(url.toString());
  return { ok: true as const };
}

export async function startGumroadOAuth() {
  const clientId = env("NEXT_PUBLIC_GUMROAD_CLIENT_ID");
  if (!clientId) return { ok: false as const, error: "missing_client_id" };
  const session = await requireClientSession();
  if (!session.ok) return session;

  const state = newOauthState();
  setOauthCookie("gumroad_oauth_state", state);
  setOauthCookie("gumroad_oauth_uid", session.uid);
  setOauthCookie("gumroad_fb_token", session.token);

  const url = new URL("https://gumroad.com/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectOr("NEXT_PUBLIC_GUMROAD_REDIRECT_URI", "/api/auth/gumroad/callback"));
  url.searchParams.set("scope", GUMROAD_SCOPES);
  url.searchParams.set("state", state);
  navigateTop(url.toString());
  return { ok: true as const };
}

export function normalizeShopifyShopClient(raw: string) {
  let shop = String(raw || "").trim().toLowerCase();
  shop = shop.replace(/^https?:\/\//, "").replace(/\/.*$/, "").replace(/:\d+$/, "");
  if (!shop) return "";
  if (!shop.includes(".")) shop = `${shop}.myshopify.com`;
  if (!/^[a-z0-9][a-z0-9-]*\.myshopify\.com$/.test(shop)) return "";
  return shop;
}

export async function startShopifyOAuth(shopInput: string) {
  const clientId = env("NEXT_PUBLIC_SHOPIFY_CLIENT_ID");
  if (!clientId) return { ok: false as const, error: "missing_client_id" };
  const shop = normalizeShopifyShopClient(shopInput);
  if (!shop) return { ok: false as const, error: "missing_shop" };
  const session = await requireClientSession();
  if (!session.ok) return session;

  const state = newOauthState();
  setOauthCookie("shopify_oauth_state", state);
  setOauthCookie("shopify_oauth_uid", session.uid);
  setOauthCookie("shopify_oauth_shop", shop);
  setOauthCookie("shopify_fb_token", session.token);

  const url = new URL(`https://${shop}/admin/oauth/authorize`);
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", SHOPIFY_SCOPES);
  url.searchParams.set("redirect_uri", redirectOr("NEXT_PUBLIC_SHOPIFY_REDIRECT_URI", "/api/auth/shopify/callback"));
  url.searchParams.set("state", state);
  navigateTop(url.toString());
  return { ok: true as const };
}

export async function startStripeOAuth() {
  const clientId = env("NEXT_PUBLIC_STRIPE_CONNECT_CLIENT_ID");
  if (!clientId) return { ok: false as const, error: "missing_client_id" };
  const session = await requireClientSession();
  if (!session.ok) return session;

  const state = newOauthState();
  setOauthCookie("stripe_oauth_state", state);
  setOauthCookie("stripe_oauth_uid", session.uid);
  setOauthCookie("stripe_fb_token", session.token);

  const url = new URL("https://connect.stripe.com/oauth/authorize");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("scope", "read_write");
  url.searchParams.set("stripe_landing", "login");
  url.searchParams.set("state", state);
  url.searchParams.set(
    "redirect_uri",
    redirectOr("NEXT_PUBLIC_STRIPE_REDIRECT_URI", "/api/integrations/stripe/callback")
  );
  navigateTop(url.toString());
  return { ok: true as const };
}
