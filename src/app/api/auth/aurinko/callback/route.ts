import { NextRequest, NextResponse } from "next/server";
import { readUserId } from "@/lib/oauth-state";
import { aurinkoAccount, exchangeAurinkoCode, startAurinkoSync } from "@/lib/aurinko";
import { adminWriteUser } from "@/lib/firebase-admin";
import { syncCalendarForUser } from "@/lib/calendar-sync";
import { listInboxWithAccessToken } from "@/lib/email-sync";
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

    const userId =
      readUserId(req.nextUrl.searchParams.get("state")) ||
      req.cookies.get("aurinko_uid")?.value ||
      "";
    if (!userId) {
      console.error("Aurinko callback missing Firestore userId in state");
      return dashboardRedirect(req, "aurinko=error&reason=login_required");
    }

    let token;
    try {
      token = await withTimeout(exchangeAurinkoCode(code), 12000, "aurinko_token");
    } catch (err) {
      console.error("Aurinko token request failed", err);
      return dashboardRedirect(req, "aurinko=error&reason=token_exchange_failed");
    }

    const serviceType = req.cookies.get("aurinko_service")?.value || "Google";
    let accountEmail = "";
    try {
      const account = await aurinkoAccount(token.accessToken);
      accountEmail = String(account.email || account.userPrincipalName || "");
    } catch (accountErr) {
      console.warn("Aurinko account lookup skipped", accountErr);
    }

    try {
      await withTimeout(
        adminWriteUser(userId, {
          aurinko_access_token: token.accessToken,
          aurinko_account_id: String(token.accountId || ""),
          aurinko_service_type: serviceType,
          aurinko_email: accountEmail,
          aurinko_connected_at: new Date().toISOString()
        }),
        8000,
        "firestore_admin_aurinko_write"
      );
      console.log("Saved Aurinko tokens to users/" + userId, {
        accountId: token.accountId,
        email: accountEmail
      });
    } catch (writeErr) {
      console.error("Admin Firestore Aurinko token write failed", writeErr);
      return dashboardRedirect(req, "aurinko=error&reason=firestore_write_failed");
    }

    try {
      await startAurinkoSync(token.accessToken, "/email/sync?daysWithin=14&awaitReady=true");
      const inbox = await withTimeout(listInboxWithAccessToken(token.accessToken), 12000, "inbox_after_oauth");
      console.log("Aurinko post-OAuth inbox fetched", inbox.length, "messages");
    } catch (mailErr) {
      console.error("Aurinko post-OAuth inbox fetch failed; Email tab can retry", mailErr);
    }

    try {
      const synced = await withTimeout(
        syncCalendarForUser(userId, { accessToken: token.accessToken }),
        20000,
        "calendar_sync_after_oauth"
      );
      console.log("Aurinko post-OAuth calendar sync wrote", synced.count, "events");
    } catch (syncErr) {
      console.error("Aurinko post-OAuth calendar sync failed; user can retry from dashboard", syncErr);
    }

    return clearOauthCookies(dashboardRedirect(req, "aurinko=success"));
  } catch (err) {
    console.error("Aurinko callback unhandled error", err);
    return dashboardRedirect(req, "aurinko=error&reason=unhandled");
  }
}
