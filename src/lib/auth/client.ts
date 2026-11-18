"use client";

import { readPlaidBearer } from "@/lib/plaid-client";

type DimadUser = { getIdToken: (forceRefresh?: boolean) => Promise<string>; uid?: string };
type DimadAuth = {
  currentUser?: DimadUser | null;
  onAuthStateChanged?: (cb: (user: DimadUser | null) => void) => () => void;
  authStateReady?: () => Promise<void>;
};

export function dimadAuth(): DimadAuth | null {
  const views = [window.parent, window];
  for (const view of views) {
    try {
      const auth = (view as Window & { DIMAD_FIREBASE?: { auth?: DimadAuth } }).DIMAD_FIREBASE?.auth;
      if (auth) return auth;
    } catch {
      /* cross-origin parent */
    }
  }
  return null;
}

function requestTokenFromParent(timeoutMs: number) {
  return new Promise<string>((resolve) => {
    if (window.parent === window) {
      resolve("");
      return;
    }
    let done = false;
    const finish = (token: string) => {
      if (done) return;
      done = true;
      window.removeEventListener("message", onMessage);
      resolve(token);
    };
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "dimad-id-token") finish(String(event.data.token || ""));
    };
    window.addEventListener("message", onMessage);
    window.parent.postMessage({ type: "dimad-request-id-token" }, window.location.origin);
    setTimeout(() => finish(""), timeoutMs);
  });
}

export async function waitForFirebaseToken(maxMs = 15000) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const handedOff = readPlaidBearer();
  if (handedOff) {
    console.log(
      `[dimad-perf] client.auth.waitForToken → ${(
        (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
      ).toFixed(1)}ms (plaid_bearer)`
    );
    return handedOff;
  }

  const deadline = Date.now() + maxMs;

  const fromAuth = async () => {
    const auth = dimadAuth();
    if (!auth) return "";
    try {
      if (typeof auth.authStateReady === "function") await auth.authStateReady();
    } catch {
      /* ignore */
    }
    if (auth.currentUser) {
      try {
        return await auth.currentUser.getIdToken();
      } catch {
        return "";
      }
    }
    if (!auth.onAuthStateChanged) return "";
    return await new Promise<string>((resolve) => {
      const timer = setTimeout(() => {
        unsub?.();
        resolve("");
      }, Math.max(400, deadline - Date.now()));
      const unsub = auth.onAuthStateChanged?.((user) => {
        clearTimeout(timer);
        unsub?.();
        if (!user) resolve("");
        else user.getIdToken().then(resolve).catch(() => resolve(""));
      });
    });
  };

  while (Date.now() < deadline) {
    const token = await fromAuth();
    if (token) {
      console.log(
        `[dimad-perf] client.auth.waitForToken → ${(
          (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
        ).toFixed(1)}ms (auth_currentUser)`
      );
      return token;
    }
    const parentToken = await requestTokenFromParent(Math.min(2000, Math.max(500, deadline - Date.now())));
    if (parentToken) {
      console.log(
        `[dimad-perf] client.auth.waitForToken → ${(
          (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
        ).toFixed(1)}ms (parent_postMessage)`
      );
      return parentToken;
    }
    await new Promise((r) => setTimeout(r, 200));
  }

  const token = (await fromAuth()) || (await requestTokenFromParent(2000));
  console.log(
    `[dimad-perf] client.auth.waitForToken → ${(
      (typeof performance !== "undefined" ? performance.now() : Date.now()) - t0
    ).toFixed(1)}ms (maxMs=${maxMs}, hasToken=${Boolean(token)})`
  );
  return token;
}

export async function authFetch(
  path: string,
  init: RequestInit = {},
  opts?: { tokenWaitMs?: number }
) {
  const t0 = typeof performance !== "undefined" ? performance.now() : Date.now();
  const token = await waitForFirebaseToken(opts?.tokenWaitMs ?? 15000);
  const tAuth = typeof performance !== "undefined" ? performance.now() : Date.now();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  console.log(
    `[dimad-perf] client.authFetch.start ${path} authWait=${(tAuth - t0).toFixed(1)}ms`
  );
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  const t1 = typeof performance !== "undefined" ? performance.now() : Date.now();
  console.log(
    `[dimad-perf] client.authFetch.done ${path} → ${(t1 - t0).toFixed(1)}ms (network=${(t1 - tAuth).toFixed(1)}ms, status=${res.status})`
  );
  return { res, data, token };
}
