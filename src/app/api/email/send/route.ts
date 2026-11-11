import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import { sendEmailMessage } from "@/lib/email-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const body = await req.json();
    const to = String(body.to || "").trim();
    const subject = String(body.subject || "").trim();
    const text = String(body.body || "").trim();
    if (!to || !subject) {
      return NextResponse.json({ ok: false, error: "Add a recipient and subject before sending." }, { status: 400 });
    }
    const sent = await sendEmailMessage(session.uid, session.idToken, { to, subject, body: text });
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "email_send_failed";
    console.error("Email send failed", session.uid, message, err);
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("not_connected") ? 401 : 500 });
  }
}
