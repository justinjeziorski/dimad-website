import { NextRequest, NextResponse } from "next/server";
import { uidFromIdToken, writeCalendlyTokens } from "@/lib/firebase-server";
import { syncCalendlyForUser } from "@/lib/calendly-sync";
import { readOauthState } from "@/lib/oauth-state";
import { fetchWithTimeout, withTimeout } from "@/lib/with-timeout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function dashboardRedirect(req: NextRequest, query: string) {
  return NextResponse.redirect(new URL(`/dashboard?${query}`, req.url));
}

function successRedirect(req: NextRequest) {
  return NextResponse.redirect(new URL("/dashboard?calendly=success", req.url));
}

function clearOauthCookies(res: NextResponse) {
  for (const name of ["calendly_pkce", "calendly_uid", "dimad_fb_token", "calendly_redirect_uri"]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
}

async function calendlyOwnerUri(accessToken: string, fallback: string) {
  if (fallback) return fallback;
  try {
    const me = await fetchWithTimeout("https://api.calendly.com/users/me", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
    const data = await me.json();
    return (data?.resource?.uri as string) || "";
  } catch (err) {
    console.error("Calendly users/me failed", err);
    return "";
  }
}

export async function GET(req: NextRequest) {
  try {
    const oauthError = req.nextUrl.searchParams.get("error");
    if (oauthError) {
      console.error("Calendly OAuth error", oauthError, req.nextUrl.searchParams.get("error_description"));
      return dashboardRedirect(req, `calendly=error&reason=${encodeURIComponent(oauthError)}`);
    }

    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      console.error("Calendly callback missing authorization code", req.nextUrl.href);
      return dashboardRedirect(req, "calendly=error&reason=missing_code");
    }

    const clientId = process.env.NEXT_PUBLIC_CALENDLY_CLIENT_ID || "";
    const clientSecret = process.env.CALENDLY_CLIENT_SECRET || "";
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "";
    const redirectUri =
      req.cookies.get("calendly_redirect_uri")?.value || `${appUrl}/api/auth/calendly/callback`;
    const verifier = req.cookies.get("calendly_pkce")?.value || "";
    const statePayload = readOauthState(req.nextUrl.searchParams.get("state"));

    const body = new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
      client_id: clientId,
      client_secret: clientSecret
    });
    if (verifier) body.set("code_verifier", verifier);

    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
    let tokenRes: Response;
    try {
      tokenRes = await fetchWithTimeout("https://auth.calendly.com/oauth/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${basic}`,
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body
      });
    } catch (err) {
      console.error("Calendly token request failed or timed out", err);
      return dashboardRedirect(req, "calendly=error&reason=token_timeout");
    }

    const raw = await tokenRes.text();
    let token: {
      access_token?: string;
      refresh_token?: string;
      owner?: string;
      error?: string;
      error_description?: string;
    } = {};
    try {
      token = JSON.parse(raw);
    } catch {
      console.error("Calendly token response was not JSON", tokenRes.status, raw);
      return dashboardRedirect(req, "calendly=error&reason=token_exchange_failed");
    }

    if (!tokenRes.ok || !token.access_token) {
      console.error("Calendly token exchange failed", tokenRes.status, token);
      return dashboardRedirect(
        req,
        `calendly=error&reason=${encodeURIComponent(token.error_description || token.error || "token_exchange_failed")}`
      );
    }

    const idToken = req.cookies.get("dimad_fb_token")?.value || "";
    let uid = req.cookies.get("calendly_uid")?.value || statePayload.uid || "";
    if (!uid && idToken) {
      try {
        uid = await withTimeout(uidFromIdToken(idToken), 8000, "firebase_uid_lookup");
      } catch (err) {
        console.error("Firebase ID token lookup failed", err);
      }
    }

    if (uid && idToken) {
      try {
        const userUri = await calendlyOwnerUri(token.access_token, token.owner || "");
        await withTimeout(
          writeCalendlyTokens(uid, idToken, {
            calendly_access_token: token.access_token,
            calendly_refresh_token: token.refresh_token || "",
            calendly_user_uri: userUri,
            calendly_connected_at: new Date().toISOString()
          }),
          8000,
          "firestore_calendly_write"
        );
        try {
          const synced = await withTimeout(syncCalendlyForUser(uid, idToken), 15000, "calendly_sync_after_oauth");
          console.log("Calendly post-OAuth sync wrote", synced.count, "events");
        } catch (syncErr) {
          console.error("Calendly post-OAuth sync failed; user can retry from dashboard", syncErr);
        }
      } catch (writeErr) {
        console.error("Firestore Calendly token write failed; continuing to dashboard", writeErr);
      }
    } else {
      console.error("Calendly tokens received but DIMAD user session is missing", {
        uid: !!uid,
        idToken: !!idToken
      });
    }

    return clearOauthCookies(successRedirect(req));
  } catch (err) {
    console.error("Calendly callback unhandled error", err);
    return NextResponse.redirect(new URL("/dashboard?calendly=success", req.url));
  }
}
