import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import { getEmailMessage, listEmailMessages, mutateEmailMessage } from "@/lib/email-sync";

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

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const body = (await req.json()) as { id?: string; action?: string };
    const id = String(body.id || "");
    const action = String(body.action || "") as "read" | "unread" | "star" | "unstar" | "trash";
    if (!id || !["read", "unread", "star", "unstar", "trash"].includes(action)) {
      return NextResponse.json({ ok: false, error: "id and action are required." }, { status: 400 });
    }
    const result = await mutateEmailMessage(session.uid, session.idToken, { id, action });
    return NextResponse.json({ ...result, ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "email_mutate_failed";
    console.error("Email mutate failed", session.uid, message, err);
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("not_connected") ? 401 : 500 });
  }
}
