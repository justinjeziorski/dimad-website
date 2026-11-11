import { NextRequest, NextResponse } from "next/server";
import { uidFromIdToken, writeUserFields } from "@/lib/firebase-server";
import { readOauthState } from "@/lib/oauth-state";
import { exchangeAurinkoCode } from "@/lib/aurinko";
import { syncCalendarForUser } from "@/lib/calendar-sync";
import { withTimeout } from "@/lib/with-timeout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function dashboardRedirect(req: NextRequest, query: string) {
  return NextResponse.redirect(new URL(`/dashboard?${query}`, req.url));
}

function clearOauthCookies(res: NextResponse) {
  for (const name of ["aurinko_uid", "dimad_fb_token", "aurinko_service"]) {
    res.cookies.set(name, "", { path: "/", maxAge: 0 });
  }
  return res;
}

export async function GET(req: NextRequest) {
  try {
    const status = req.nextUrl.searchParams.get("status");
    const oauthError = req.nextUrl.searchParams.get("error");
    if (oauthError || status === "error") {
      console.error("Aurinko OAuth error", oauthError, req.nextUrl.searchParams.toString());
      return dashboardRedirect(req, `aurinko=error&reason=${encodeURIComponent(oauthError || "denied")}`);
    }

    const code = req.nextUrl.searchParams.get("code");
    if (!code) {
      console.error("Aurinko callback missing code", req.nextUrl.href);
      return dashboardRedirect(req, "aurinko=error&reason=missing_code");
    }

    const statePayload = readOauthState(req.nextUrl.searchParams.get("state"));
    let token;
    try {
      token = await withTimeout(exchangeAurinkoCode(code), 12000, "aurinko_token");
    } catch (err) {
      console.error("Aurinko token request failed", err);
      return dashboardRedirect(req, "aurinko=error&reason=token_exchange_failed");
    }

    const idToken = req.cookies.get("dimad_fb_token")?.value || "";
    let uid = req.cookies.get("aurinko_uid")?.value || statePayload.uid || "";
    if (!uid && idToken) {
      try {
        uid = await withTimeout(uidFromIdToken(idToken), 8000, "firebase_uid_lookup");
      } catch (err) {
        console.error("Firebase ID token lookup failed", err);
      }
    }

    const serviceType = req.cookies.get("aurinko_service")?.value || statePayload.serviceType || "Google";

    if (uid && idToken) {
      try {
        await withTimeout(
          writeUserFields(uid, idToken, {
            aurinko_access_token: token.accessToken,
            aurinko_account_id: String(token.accountId || ""),
            aurinko_service_type: serviceType,
            aurinko_connected_at: new Date().toISOString()
          }),
          8000,
          "firestore_aurinko_write"
        );
        try {
          const synced = await withTimeout(syncCalendarForUser(uid, idToken), 15000, "calendar_sync_after_oauth");
          console.log("Aurinko post-OAuth calendar sync wrote", synced.count, "events");
        } catch (syncErr) {
          console.error("Aurinko post-OAuth calendar sync failed; user can retry from dashboard", syncErr);
        }
      } catch (writeErr) {
        console.error("Firestore Aurinko token write failed; continuing to dashboard", writeErr);
      }
    } else {
      console.error("Aurinko tokens received but DIMAD user session is missing", {
        uid: !!uid,
        idToken: !!idToken
      });
    }

    return clearOauthCookies(dashboardRedirect(req, "aurinko=success"));
  } catch (err) {
    console.error("Aurinko callback unhandled error", err);
    return dashboardRedirect(req, "aurinko=error&reason=unhandled");
  }
}
