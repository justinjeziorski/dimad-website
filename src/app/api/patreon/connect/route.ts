import { NextRequest, NextResponse } from "next/server";
import {
  fetchPatreonCampaignData,
  writePatreonIntegration
} from "@/lib/integrations/patreon/oauth";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { accessToken?: string };
    const accessToken = String(body.accessToken || "").trim();
    if (!accessToken || accessToken.length < 12) {
      return NextResponse.json({ ok: false, error: "missing_access_token" }, { status: 400, headers: noStore });
    }

    const campaign = await fetchPatreonCampaignData(accessToken);
    const record = {
      accessToken,
      refreshToken: "",
      scope: "creator_access_token",
      expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toISOString(),
      campaignId: campaign.campaignId,
      campaignName: campaign.campaignName || "Patreon",
      connectedAt: new Date().toISOString()
    };
    await writePatreonIntegration(session.uid, record, session.idToken);

    return NextResponse.json(
      {
        ok: true,
        connected: true,
        campaignId: record.campaignId,
        campaignName: record.campaignName,
        metrics: campaign.metrics
      },
      { headers: noStore }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "patreon_connect_failed";
    console.error("Patreon token connect failed", session.uid, message);
    const known = [
      "invalid_patreon_credentials",
      "patreon_request_failed",
      "firestore_permission_denied",
      "firestore_write_failed",
      "missing_access_token"
    ].includes(message);
    return NextResponse.json(
      { ok: false, error: known ? message : "patreon_connect_failed" },
      { status: message === "invalid_patreon_credentials" ? 401 : 502, headers: noStore }
    );
  }
}
