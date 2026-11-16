export const PLAID_LINK_TOKEN_KEY = "dimad_plaid_link_token";
export const PLAID_BEARER_KEY = "dimad_plaid_bearer";

export function readPlaidBearer() {
  if (typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(PLAID_BEARER_KEY) || "";
  } catch {
    return "";
  }
}

export function writePlaidBearer(token: string) {
  if (typeof window === "undefined" || !token) return;
  try {
    sessionStorage.setItem(PLAID_BEARER_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearPlaidBearer() {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(PLAID_BEARER_KEY);
  } catch {
    /* ignore */
  }
}

export function readPlaidLinkToken() {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(PLAID_LINK_TOKEN_KEY) || "";
  } catch {
    return "";
  }
}

export function writePlaidLinkToken(token: string) {
  if (typeof window === "undefined" || !token) return;
  try {
    localStorage.setItem(PLAID_LINK_TOKEN_KEY, token);
  } catch {
    /* ignore */
  }
}

export function clearPlaidLinkToken() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PLAID_LINK_TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

/** Close the Link popup (if any) and return the opener/dashboard to Command Center. */
export function finishPlaidConnect(ok: boolean, reason = "") {
  const path = ok
    ? "/dashboard/index.html?connected=plaid"
    : `/dashboard/index.html?connected=plaid&oauth=error&reason=${encodeURIComponent(reason || "denied")}`;
  const absolute = new URL(path, window.location.origin).href;
  clearPlaidBearer();
  clearPlaidLinkToken();

  try {
    if (window.opener && !window.opener.closed) {
      try {
        window.opener.focus();
      } catch {
        /* ignore */
      }
      try {
        window.opener.location.assign(absolute);
      } catch {
        /* cross-origin opener — fall through */
      }
      window.close();
      // If close is blocked, still navigate this window.
      window.setTimeout(() => {
        window.location.assign(path);
      }, 250);
      return;
    }
  } catch {
    /* ignore */
  }

  window.location.assign(path);
}

export function plaidAppOrigin() {
  return String(process.env.NEXT_PUBLIC_PLAID_APP_ORIGIN || "https://dimad.co").replace(/\/$/, "");
}

export function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1";
}
