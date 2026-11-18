import { NextRequest, NextResponse } from "next/server";
import {
  clearPatreonOauthCookies,
  exchangePatreonCode,
  fetchPatreonCampaignData,
  patreonAppBase,
  patreonStatesMatch,
  writePatreonIntegration
} from "@/lib/integrations/patreon/oauth";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function finish(query: string) {
  const dest = new URL("/dashboard/index.html", patreonAppBase());
  const params = new URLSearchParams(query);
  params.forEach((value, key) => dest.searchParams.set(key, value));
  const status = params.get("patreon") || "";
  const reason = params.get("reason") || "";
  const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Patreon</title></head>
<body style="margin:0;background:#070A0F;color:#e2e8f0;font:14px/1.4 system-ui,sans-serif;display:grid;place-items:center;min-height:100vh">
<p>${status === "connected" ? "Patreon connected. Returning to DIMAD…" : "Patreon connection finished."}</p>
<script>
(function () {
  var payload = { type: "dimad-patreon-oauth-done", status: ${JSON.stringify(status)}, reason: ${JSON.stringify(reason)} };
  var dest = ${JSON.stringify(dest.toString())};
  try {
    if (window.opener && !window.opener.closed) {
      window.opener.postMessage(payload, window.location.origin);
      window.close();
      setTimeout(function () { window.location.replace(dest); }, 400);
      return;
    }
  } catch (err) {}
  window.location.replace(dest);
})();
</script>
</body></html>`;
  const res = new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" }
  });
  return clearPatreonOauthCookies(res);
}

export async function GET(req: NextRequest) {
  const cookieState = req.cookies.get("patreon_oauth_state")?.value || "";
  const uid = req.cookies.get("patreon_oauth_uid")?.value || "";
  const idToken = req.cookies.get("patreon_fb_token")?.value || "";
  const returnedState = req.nextUrl.searchParams.get("state") || "";
  const code = req.nextUrl.searchParams.get("code") || "";

  if (!uid || !cookieState || !/^[A-Za-z0-9_-]{16,128}$/.test(uid)) {
    console.error("Patreon callback missing oauth session");
    return finish("patreon=error&reason=login_required");
  }
  if (!patreonStatesMatch(cookieState, returnedState)) {
    console.error("Patreon callback state mismatch");
    return finish("patreon=error&reason=csrf");
  }

  const oauthError = req.nextUrl.searchParams.get("error");
  if (oauthError) {
    console.error("Patreon OAuth denied", oauthError);
    return finish("patreon=error&reason=denied");
  }

  if (!code || code.length > 512) {
    console.error("Patreon callback missing code");
    return finish("patreon=error&reason=missing_code");
  }

  try {
    const token = await exchangePatreonCode(code);
    let campaignId = "";
    let campaignName = "Patreon";
    try {
      const campaign = await fetchPatreonCampaignData(token.accessToken);
      campaignId = campaign.campaignId;
      campaignName = campaign.campaignName || campaignName;
    } catch (err) {
      console.warn("Patreon campaign preview skipped", err instanceof Error ? err.message : err);
    }

    await writePatreonIntegration(
      uid,
      {
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        scope: token.scope,
        expiresAt: token.expiresAt,
        campaignId,
        campaignName,
        connectedAt: new Date().toISOString()
      },
      idToken || undefined
    );
    const res = finish("patreon=connected");
    if (idToken) {
      res.cookies.set("dimad_fb_token", idToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 3300
      });
    }
    return res;
  } catch (err) {
    const reason = err instanceof Error ? err.message : "token_exchange_failed";
    console.error("Patreon callback failed", reason);
    const known = [
      "token_exchange_failed",
      "missing_client_id",
      "missing_client_secret",
      "invalid_patreon_credentials",
      "patreon_request_failed",
      "firestore_permission_denied",
      "firestore_write_failed"
    ].includes(reason);
    return finish(`patreon=error&reason=${encodeURIComponent(known ? reason : "token_exchange_failed")}`);
  }
}
