import { NextRequest, NextResponse } from "next/server";
import { fetchMailerLiteData, readMailerLiteIntegration } from "@/lib/mailerlite";
import { requireFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const record = await readMailerLiteIntegration(session.uid, session.idToken);
    console.log("MailerLite data lookup", session.uid, record ? "linked" : "none");
    if (!record) {
      return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
    }

    const data = await fetchMailerLiteData(record);
    return NextResponse.json({ ok: true, connected: true, ...data }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "mailerlite_request_failed";
    console.error("MailerLite data route failed", session.uid, message);
    const safe =
      message === "firestore_permission_denied" ||
      message === "firestore_read_failed" ||
      message === "mailerlite_request_failed" ||
      message === "invalid_mailerlite_token" ||
      message === "Invalid MailerLite API token" ||
      (message.includes(" ") && message.length < 180);

    let connected = false;
    try {
      const record = await readMailerLiteIntegration(session.uid, session.idToken);
      connected = !!record;
    } catch {
      /* ignore */
    }

    return NextResponse.json(
      {
        ok: false,
        connected,
        error: safe ? message : "mailerlite_request_failed",
        ...(connected
          ? {
              accountLabel: "MailerLite",
              campaigns: [],
              metrics: {
                subscriberCount: 0,
                avgOpenRate: 0,
                avgOpenDisplay: "0.0%",
                avgClickRate: 0,
                avgClickDisplay: "0.0%",
                latestCampaignName: "—"
              }
            }
          : {})
      },
      { status: connected ? 200 : 502, headers: noStore }
    );
  }
}
