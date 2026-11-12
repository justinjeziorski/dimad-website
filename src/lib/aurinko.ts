import type { NextRequest } from "next/server";
import { fetchWithTimeout } from "./with-timeout";

export const AURINKO_SCOPES = "Mail.ReadWrite,Mail.Send,Calendar.ReadWrite";

export type AurinkoProvider = "google" | "microsoft";

export function aurinkoClientId() {
  return process.env.AURINKO_CLIENT_ID || process.env.NEXT_PUBLIC_AURINKO_CLIENT_ID || "";
}

export function resolveAurinkoProvider(raw?: string | null): AurinkoProvider {
  const value = String(raw || "google").toLowerCase();
  if (
    value.includes("microsoft") ||
    value.includes("365") ||
    value.includes("outlook") ||
    value.includes("office")
  ) {
    return "microsoft";
  }
  return "google";
}

export function aurinkoServiceType(provider: AurinkoProvider) {
  return provider === "microsoft" ? "Office365" : "Google";
}

export function appOrigin(req?: NextRequest) {
  const host = req?.nextUrl.hostname || "";
  if (host === "localhost" || host === "127.0.0.1") {
    return req?.nextUrl.origin || "http://localhost:3000";
  }
  return (process.env.NEXT_PUBLIC_APP_URL || "").replace(/\/$/, "") || "https://dimad.co";
}

export function aurinkoCallbackUrl(req?: NextRequest) {
  return `${appOrigin(req)}/api/aurinko/callback`;
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
  const clientId = aurinkoClientId();
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
  return data as {
    accountId: number | string;
    accessToken: string;
    refreshToken?: string;
    expiresIn?: number;
    email?: string;
    serviceType?: string;
  };
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
  if (Array.isArray(data)) return data as Record<string, unknown>[];
  const row = data as Record<string, unknown>;
  if (Array.isArray(row.records)) return row.records as Record<string, unknown>[];
  if (Array.isArray(row.collection)) return row.collection as Record<string, unknown>[];
  if (Array.isArray(row.events)) return row.events as Record<string, unknown>[];
  if (Array.isArray(row.messages)) return row.messages as Record<string, unknown>[];
  if (Array.isArray(row.folders)) return row.folders as Record<string, unknown>[];
  if (Array.isArray(row.labels)) return row.labels as Record<string, unknown>[];
  if (row.messages && typeof row.messages === "object") {
    const nested = aurinkoRecords(row.messages);
    if (nested.length) return nested;
  }
  if (row.data && typeof row.data === "object") {
    const nested = aurinkoRecords(row.data);
    if (nested.length) return nested;
  }
  return [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function startAurinkoSync(accessToken: string, path: string) {
  let last: unknown = null;
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const listed = await aurinkoFetch(path, accessToken, { method: "POST" }, 20000);
    last = listed.data;
    console.log("Aurinko sync start", path, listed.status, listed.data);
    if (listed.status === 401) return { unauthorized: true as const, deltaToken: "" };
    const row = (listed.data || {}) as Record<string, unknown>;
    if (listed.ok && (row.ready === true || row.syncUpdatedToken)) {
      return { unauthorized: false as const, deltaToken: String(row.syncUpdatedToken || "") };
    }
    await sleep(900);
  }
  console.warn("Aurinko sync did not report ready", path, last);
  return { unauthorized: false as const, deltaToken: "" };
}

export async function pullAurinkoUpdated(accessToken: string, path: string, deltaToken: string) {
  const collected: Record<string, unknown>[] = [];
  if (!deltaToken) return collected;
  let token = deltaToken;
  let useDelta = true;
  for (let page = 0; page < 8; page += 1) {
    const query = useDelta ? `deltaToken=${encodeURIComponent(token)}` : `pageToken=${encodeURIComponent(token)}`;
    const listed = await aurinkoFetch(`${path}?${query}`, accessToken, {}, 20000);
    console.log("Aurinko sync updated", path, listed.status, listed.data);
    if (!listed.ok) break;
    collected.push(...aurinkoRecords(listed.data));
    const row = (listed.data || {}) as Record<string, unknown>;
    if (row.nextPageToken) {
      token = String(row.nextPageToken);
      useDelta = false;
      continue;
    }
    break;
  }
  return collected;
}

export async function aurinkoAccount(accessToken: string) {
  const listed = await aurinkoFetch("/account", accessToken, {}, 8000);
  console.log("Aurinko account", listed.status, listed.data);
  return (listed.ok ? listed.data : {}) as Record<string, unknown>;
}
