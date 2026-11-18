import { NextRequest, NextResponse } from "next/server";
import {
  deletePatreonIntegration,
  ensurePatreonAccessToken,
  fetchPatreonCampaignData,
  readPatreonIntegration,
  writePatreonIntegration
} from "@/lib/integrations/patreon/oauth";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    let record = await readPatreonIntegration(session.uid, session.idToken);
    console.log("Patreon data lookup", session.uid, record ? record.campaignId || "linked" : "none");
    if (!record) {
      return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
    }

    record = await ensurePatreonAccessToken(session.uid, record, session.idToken);
    const data = await fetchPatreonCampaignData(record.accessToken);
    const campaignName = data.campaignName || record.campaignName || "Patreon";
    const campaignId = data.campaignId || record.campaignId;

    if (
      campaignId !== record.campaignId ||
      campaignName !== record.campaignName
    ) {
      const next = { ...record, campaignId, campaignName };
      try {
        await writePatreonIntegration(session.uid, next, session.idToken);
      } catch {
        /* non-fatal mirror */
      }
      record = next;
    }

    return NextResponse.json(
      {
        ok: true,
        connected: true,
        ...data,
        campaignId,
        campaignName,
        connectedAt: record.connectedAt
      },
      { headers: noStore }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "patreon_request_failed";
    console.error("Patreon data route failed", session.uid, message);
    const safe =
      message === "firestore_permission_denied" ||
      message === "firestore_read_failed" ||
      message === "patreon_request_failed" ||
      message === "invalid_patreon_credentials" ||
      (message.includes(" ") && message.length < 180);

    let campaignId = "";
    let campaignName = "";
    try {
      const record = await readPatreonIntegration(session.uid, session.idToken);
      campaignId = record?.campaignId || "";
      campaignName = record?.campaignName || "";
    } catch {
      /* ignore */
    }

    return NextResponse.json(
      {
        ok: false,
        connected: !!(campaignId || campaignName),
        error: safe ? message : "patreon_request_failed",
        ...(campaignId || campaignName
          ? {
              campaignId,
              campaignName: campaignName || "Patreon",
              tiers: [],
              metrics: {
                patronCount: 0,
                mrrCents: 0,
                mrrDisplay: "0.00 USD",
                tierCount: 0
              }
            }
          : {})
      },
      { status: campaignId || campaignName ? 200 : 502, headers: noStore }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    await deletePatreonIntegration(session.uid, session.idToken);
    return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "firestore_write_failed";
    console.error("Patreon disconnect failed", session.uid, message);
    return NextResponse.json(
      { ok: false, error: message === "firestore_permission_denied" ? message : "firestore_write_failed" },
      { status: 500, headers: noStore }
    );
  }
}
