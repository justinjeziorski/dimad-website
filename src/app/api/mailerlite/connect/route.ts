import { NextRequest, NextResponse } from "next/server";
import {
  deleteMailerLiteIntegration,
  verifyMailerLiteToken,
  writeMailerLiteIntegration
} from "@/lib/mailerlite";
import { requireFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { apiToken?: string };
    const apiToken = String(body.apiToken || "").trim();
    if (!apiToken || apiToken.length < 12) {
      return NextResponse.json({ ok: false, error: "missing_api_token" }, { status: 400, headers: noStore });
    }

    await verifyMailerLiteToken(apiToken);
    const record = {
      apiToken,
      connectedAt: new Date().toISOString()
    };
    await writeMailerLiteIntegration(session.uid, record, session.idToken);
    return NextResponse.json({ ok: true, connected: true }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "mailerlite_connect_failed";
    console.error("MailerLite connect failed", session.uid, message);
    const known = [
      "invalid_mailerlite_token",
      "mailerlite_request_failed",
      "firestore_permission_denied",
      "firestore_write_failed",
      "missing_api_token"
    ].includes(message);
    return NextResponse.json(
      {
        ok: false,
        error:
          message === "invalid_mailerlite_token"
            ? "Invalid MailerLite API token"
            : known
              ? message
              : "mailerlite_connect_failed"
      },
      { status: message === "invalid_mailerlite_token" ? 401 : 502, headers: noStore }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    await deleteMailerLiteIntegration(session.uid, session.idToken);
    return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "firestore_write_failed";
    console.error("MailerLite disconnect failed", session.uid, message);
    return NextResponse.json(
      { ok: false, error: message === "firestore_permission_denied" ? message : "firestore_write_failed" },
      { status: 500, headers: noStore }
    );
  }
}
