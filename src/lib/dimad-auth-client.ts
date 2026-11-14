"use client";

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
    if (token) return token;
    const parentToken = await requestTokenFromParent(Math.min(2000, Math.max(500, deadline - Date.now())));
    if (parentToken) return parentToken;
    await new Promise((r) => setTimeout(r, 200));
  }

  return (await fromAuth()) || (await requestTokenFromParent(2000));
}

export async function authFetch(path: string, init: RequestInit = {}) {
  const token = await waitForFirebaseToken(15000);
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  const res = await fetch(path, {
    ...init,
    headers,
    credentials: "include",
    cache: "no-store"
  });
  const data = await res.json().catch(() => ({}));
  return { res, data, token };
}
