import { NextRequest, NextResponse } from "next/server";
import { uidFromIdToken } from "@/lib/firebase-server";
import { syncCalendlyForUser } from "@/lib/calendly-sync";
import { withTimeout } from "@/lib/with-timeout";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function handle(req: NextRequest) {
  const idToken =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("id_token") ||
    "";
  if (!idToken) {
    return NextResponse.json({ error: "missing_id_token" }, { status: 401 });
  }

  let uid = "";
  try {
    uid = await uidFromIdToken(idToken);
  } catch (err) {
    console.error("Calendly sync auth failed", err);
    return NextResponse.json({ error: "invalid_session" }, { status: 401 });
  }

  try {
    const result = await withTimeout(syncCalendlyForUser(uid, idToken), 20000, "calendly_sync");
    console.log("Calendly sync complete for", uid, "events", result.count);
    return NextResponse.json({ ok: true, count: result.count, events: result.events });
  } catch (err) {
    const message = err instanceof Error ? err.message : "sync_failed";
    console.error("Calendly sync failed", uid, message, err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  return handle(req);
}

export async function POST(req: NextRequest) {
  return handle(req);
}
