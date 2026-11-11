import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import { listEmailFolders } from "@/lib/email-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const folders = await listEmailFolders(session.uid, session.idToken);
    return NextResponse.json({ ok: true, folders });
  } catch (err) {
    const message = err instanceof Error ? err.message : "email_folders_failed";
    console.error("Email folders failed", session.uid, message, err);
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("not_connected") ? 401 : 500 });
  }
}
