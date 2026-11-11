import type { NextRequest } from "next/server";
import { fetchWithTimeout } from "./with-timeout";

export const AURINKO_SCOPES = "Mail.Read Mail.Send Calendar.ReadWrite";

export function appOrigin(req?: NextRequest) {
  const host = req?.nextUrl.hostname || "";
  if (host === "localhost" || host === "127.0.0.1") {
    return req?.nextUrl.origin || "http://localhost:3000";
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") || "https://dimad.co";
}

export function aurinkoCallbackUrl(req?: NextRequest) {
  return `${appOrigin(req)}/api/auth/aurinko/callback`;
}

export function aurinkoAuthorizeUrl(params: {
  clientId: string;
  serviceType: string;
  returnUrl: string;
  state: string;
}) {
  const url = new URL("https://api.aurinko.io/v1/auth/authorize");
  url.searchParams.set("clientId", params.clientId);
  url.searchParams.set("serviceType", params.serviceType);
  url.searchParams.set("scopes", AURINKO_SCOPES);
  url.searchParams.set("responseType", "code");
  url.searchParams.set("returnUrl", params.returnUrl);
  url.searchParams.set("state", params.state);
  return url.toString();
}

export async function exchangeAurinkoCode(code: string) {
  const clientId = process.env.NEXT_PUBLIC_AURINKO_CLIENT_ID || "";
  const clientSecret = process.env.AURINKO_CLIENT_SECRET || "";
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
  const res = await fetchWithTimeout(
    `https://api.aurinko.io/v1/auth/token/${encodeURIComponent(code)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json"
      }
    },
    12000
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.accessToken) {
    console.error("Aurinko token exchange failed", res.status, data);
    throw new Error(data.message || data.error || "token_exchange_failed");
  }
  return data as { accountId: number | string; accessToken: string };
}

export async function aurinkoFetch(path: string, accessToken: string, init: RequestInit = {}, ms = 15000) {
  const url = path.startsWith("http") ? path : `https://api.aurinko.io/v1${path}`;
  const res = await fetchWithTimeout(
    url,
    {
      ...init,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {})
      }
    },
    ms
  );
  const text = await res.text();
  let data: unknown = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { ok: res.ok, status: res.status, data };
}

export function aurinkoRecords(data: unknown): Record<string, unknown>[] {
  if (!data || typeof data !== "object") return [];
  const row = data as Record<string, unknown>;
  if (Array.isArray(row.records)) return row.records as Record<string, unknown>[];
  if (Array.isArray(row.collection)) return row.collection as Record<string, unknown>[];
  if (Array.isArray(row.events)) return row.events as Record<string, unknown>[];
  if (Array.isArray(row.messages)) return row.messages as Record<string, unknown>[];
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  return [];
}
