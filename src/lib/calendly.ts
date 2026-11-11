import type { NextRequest } from "next/server";

export function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing ${name}`);
  return value;
}

function isLocalHost(req?: NextRequest): boolean {
  const host = req?.nextUrl.hostname || "";
  return host === "localhost" || host === "127.0.0.1";
}

export function calendlyRedirectUri(req?: NextRequest): string {
  if (req && isLocalHost(req)) {
    return `${req.nextUrl.origin}/api/auth/calendly/callback`;
  }
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL").replace(/\/$/, "");
  try {
    const url = new URL(appUrl);
    if (url.pathname.endsWith(".html") || url.pathname.includes("/dashboard")) {
      return `${url.origin}/api/auth/calendly/callback`;
    }
  } catch {
    /* use formula below */
  }
  return `${appUrl}/api/auth/calendly/callback`;
}

export function dashboardReturnUrl(query = "", req?: NextRequest): string {
  if (req && isLocalHost(req)) {
    const q = query ? `?${query}` : "";
    return `http://127.0.0.1:18767/dashboard/${q}`;
  }
  const appUrl = requireEnv("NEXT_PUBLIC_APP_URL");
  if (!query) return appUrl;
  const join = appUrl.includes("?") ? "&" : "?";
  return `${appUrl}${join}${query}`;
}

export function loginUrl(req?: NextRequest): string {
  if (req && isLocalHost(req)) return "http://127.0.0.1:18767/login.html";
  try {
    return `${new URL(requireEnv("NEXT_PUBLIC_APP_URL")).origin}/login.html`;
  } catch {
    return "/login.html";
  }
}

export function calendlyClientId(): string {
  return requireEnv("NEXT_PUBLIC_CALENDLY_CLIENT_ID");
}

export function calendlyClientSecret(): string {
  return requireEnv("CALENDLY_CLIENT_SECRET");
}
