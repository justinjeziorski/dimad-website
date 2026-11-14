import { NextRequest, NextResponse } from "next/server";
import { requireFirebaseUser } from "@/lib/session";
import { deauthorizeStripeAccount, loadStripeMetrics, safeStripeError } from "@/lib/stripe-connect";
import { deleteStripeIntegration, readStripeIntegration, stripeAccountMacMatches } from "@/lib/stripe-store";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

function goneMessage(message: string) {
  return /not connected|invalid_client|no such user|does not have access/i.test(message);
}

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const record = await readStripeIntegration(session.uid, session.idToken);
    if (!record) return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
    if (!stripeAccountMacMatches(session.uid, record)) {
      console.error("Stripe integration mac mismatch", session.uid);
      return NextResponse.json({ ok: false, error: "reconnect_required" }, { status: 409, headers: noStore });
    }
    const metrics = await loadStripeMetrics(record.stripe_user_id, record.connectedAt, record.livemode);
    return NextResponse.json({ ok: true, connected: true, ...metrics }, { headers: noStore });
  } catch (err) {
    const error = safeStripeError(err);
    console.error("Stripe metrics failed", session.uid, error);
    return NextResponse.json({ ok: false, error }, { status: 502, headers: noStore });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const record = await readStripeIntegration(session.uid, session.idToken);
    if (record && stripeAccountMacMatches(session.uid, record)) {
      try {
        await deauthorizeStripeAccount(record.stripe_user_id);
      } catch (err) {
        const message = safeStripeError(err);
        if (!goneMessage(message)) {
          console.error("Stripe deauthorize failed", session.uid, message);
          return NextResponse.json({ ok: false, error: message }, { status: 502, headers: noStore });
        }
        console.warn("Stripe account already deauthorized", session.uid);
      }
    }
    await deleteStripeIntegration(session.uid, session.idToken);
    return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
  } catch (err) {
    const error = safeStripeError(err);
    console.error("Stripe disconnect failed", session.uid, error);
    return NextResponse.json({ ok: false, error }, { status: 500, headers: noStore });
  }
}
