import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import { createCalendarEvent, syncCalendarForUser } from "@/lib/calendar-sync";
import { withTimeout } from "@/lib/with-timeout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function syncHandle(uid: string, idToken: string) {
  const result = await withTimeout(syncCalendarForUser(uid, idToken), 20000, "calendar_sync");
  console.log("Calendar sync complete for", uid, "events", result.count);
  return NextResponse.json({ ok: true, count: result.count, events: result.events });
}

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    return await syncHandle(session.uid, session.idToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync_failed";
    console.error("Calendar sync failed", session.uid, message, err);
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("not_connected") ? 401 : 500 });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const raw = await req.text();
    let body: Record<string, string> = {};
    if (raw) {
      try {
        body = JSON.parse(raw) as Record<string, string>;
      } catch {
        body = {};
      }
    }
    if (body.title || body.subject) {
      const event = await createCalendarEvent(session.uid, session.idToken, body);
      return NextResponse.json({ ok: true, event });
    }
    return await syncHandle(session.uid, session.idToken);
  } catch (err) {
    const message = err instanceof Error ? err.message : "calendar_write_failed";
    console.error("Calendar POST failed", session.uid, message, err);
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("not_connected") ? 401 : 500 });
  }
}
