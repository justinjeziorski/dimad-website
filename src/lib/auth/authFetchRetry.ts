"use client";

import { authFetch } from "@/lib/auth/client";

type AuthFetchResult = Awaited<ReturnType<typeof authFetch>>;

/**
 * Same 3-attempt auth retry the integration cards already use:
 * stop once a token is present and the response is not 401, otherwise wait 900ms.
 */
export async function authFetchWithRetry(path: string, init: RequestInit = {}): Promise<AuthFetchResult> {
  let last: AuthFetchResult | null = null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    last = await authFetch(path, init);
    if (last.token && last.res.status !== 401) break;
    if (attempt < 2) await new Promise((r) => setTimeout(r, 900));
  }
  return (
    last || {
      res: new Response(null, { status: 401 }),
      data: {},
      token: ""
    }
  );
}
