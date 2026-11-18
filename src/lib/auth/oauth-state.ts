import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  return process.env.AURINKO_CLIENT_SECRET || "dimad-oauth-state";
}

export function signOauthState(payload: Record<string, string>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function signUserId(uid: string) {
  const sig = createHmac("sha256", secret()).update(uid).digest("base64url");
  return `${uid}.${sig}`;
}

export function readUserId(state: string | null): string {
  if (!state) return "";
  const signed = readOauthState(state);
  if (signed.uid) return signed.uid;
  const idx = state.lastIndexOf(".");
  if (idx <= 0) return /^[A-Za-z0-9_-]{16,128}$/.test(state) ? state : "";
  const uid = state.slice(0, idx);
  const sig = state.slice(idx + 1);
  const expected = createHmac("sha256", secret()).update(uid).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length === b.length && timingSafeEqual(a, b)) return uid;
  return "";
}

export function readOauthState(state: string | null): Record<string, string> {
  if (!state || !state.includes(".")) return {};
  const [body, sig] = state.split(".");
  if (!body || !sig) return {};
  try {
    const expected = createHmac("sha256", secret()).update(body).digest("base64url");
    const a = Buffer.from(sig);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return {};
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}
