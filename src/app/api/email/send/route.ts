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
    const subject = String(body.subject || "").trim() || "(No Subject)";
    const text = String(body.body || "");
    const cc = String(body.cc || "").trim();
    const bcc = String(body.bcc || "").trim();
    const threadId = String(body.threadId || "").trim();
    if (!to) {
      return NextResponse.json({ ok: false, error: "Add a recipient before sending." }, { status: 400 });
    }
    const sent = await sendEmailMessage(session.uid, session.idToken, {
      to,
      subject,
      body: text,
      cc,
      bcc,
      threadId
    });
    return NextResponse.json({ ok: true, sent });
  } catch (err) {
    const message = err instanceof Error ? err.message : "email_send_failed";
    console.error("Email send failed", session.uid, message, err);
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("not_connected") ? 401 : 500 });
  }
}
