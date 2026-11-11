import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import { getEmailMessage, listEmailMessages } from "@/lib/email-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const id = req.nextUrl.searchParams.get("id") || "";
    if (id) {
      const message = await getEmailMessage(session.uid, session.idToken, id);
      return NextResponse.json({ ok: true, message });
    }
    const folderId = req.nextUrl.searchParams.get("folderId") || "";
    const messages = await listEmailMessages(session.uid, session.idToken, folderId);
    return NextResponse.json({ ok: true, folderId, messages });
  } catch (err) {
    const message = err instanceof Error ? err.message : "email_list_failed";
    console.error("Email list failed", session.uid, message, err);
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("not_connected") ? 401 : 500 });
  }
}
