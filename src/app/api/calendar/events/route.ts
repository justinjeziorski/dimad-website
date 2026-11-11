import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import { syncCalendarForUser } from "@/lib/calendar-sync";
import { withTimeout } from "@/lib/with-timeout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const result = await withTimeout(syncCalendarForUser(session.uid, session.idToken), 20000, "calendar_sync");
    console.log("Calendar sync complete for", session.uid, "events", result.count);
    return NextResponse.json({ ok: true, count: result.count, events: result.events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync_failed";
    console.error("Calendar sync failed", session.uid, message, err);
    return NextResponse.json({ ok: false, error: message }, { status: message.includes("not_connected") ? 401 : 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
