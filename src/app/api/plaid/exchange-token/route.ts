import { NextRequest, NextResponse } from "next/server";
import { exchangePlaidPublicToken, writePlaidIntegration } from "@/lib/plaid";
import { requireFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const body = (await req.json().catch(() => ({}))) as {
      public_token?: string;
      metadata?: { institution?: { name?: string; institution_id?: string } };
    };
    const publicToken = String(body.public_token || "").trim();
    if (!publicToken) {
      return NextResponse.json({ ok: false, error: "missing_public_token" }, { status: 400, headers: noStore });
    }

    const exchanged = await exchangePlaidPublicToken(publicToken);
    await writePlaidIntegration(
      session.uid,
      {
        accessToken: exchanged.accessToken,
        itemId: exchanged.itemId,
        institutionName: String(body.metadata?.institution?.name || "Linked bank"),
        connectedAt: new Date().toISOString(),
        cursor: ""
      },
      session.idToken
    );

    return NextResponse.json({ success: true, ok: true }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "plaid_exchange_failed";
    console.error("Plaid exchange-token failed", session.uid, message);
    const safe =
      message === "plaid_exchange_failed" ||
      message === "firestore_permission_denied" ||
      message === "firestore_write_failed" ||
      message === "missing_plaid_client_id" ||
      message === "missing_plaid_secret";
    return NextResponse.json(
      { ok: false, success: false, error: safe ? message : "plaid_exchange_failed" },
      { status: 500, headers: noStore }
    );
  }
}
