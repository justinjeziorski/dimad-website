import { createHmac, timingSafeEqual } from "crypto";

function secret() {
  return process.env.CALENDLY_CLIENT_SECRET || "dimad-oauth-state";
}

export function signOauthState(payload: Record<string, string>) {
  const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const sig = createHmac("sha256", secret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readOauthState(state: string | null): Record<string, string> {
  if (!state || !state.includes(".")) return {};
  const [body, sig] = state.split(".");
  const expected = createHmac("sha256", secret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return {};
  try {
    return JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
  } catch {
    return {};
  }
}
