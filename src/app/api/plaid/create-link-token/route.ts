import { NextRequest, NextResponse } from "next/server";
import { createPlaidLinkToken } from "@/lib/plaid";
import { requireFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const body = (await req.json().catch(() => ({}))) as { userId?: string };
    const userId = String(body.userId || session.uid || "").trim() || session.uid;
    if (userId !== session.uid) {
      return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403, headers: noStore });
    }
    const link_token = await createPlaidLinkToken(userId);
    return NextResponse.json({ ok: true, link_token }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "plaid_link_token_failed";
    console.error("Plaid create-link-token failed", session.uid, message);
    const safe =
      message === "missing_plaid_client_id" ||
      message === "missing_plaid_secret" ||
      message === "plaid_link_token_failed";
    return NextResponse.json(
      { ok: false, error: safe ? message : "plaid_link_token_failed" },
      { status: 500, headers: noStore }
    );
  }
}
