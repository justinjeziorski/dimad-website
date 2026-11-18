import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import type { ManualLedgerInput, UnifiedTransaction } from "@/lib/revenue/types";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

function col(uid: string) {
  return getAdminDb().collection("users").doc(uid).collection("manual_ledger");
}

function toTransaction(uid: string, id: string, data: Record<string, unknown>): UnifiedTransaction {
  return {
    id,
    userId: uid,
    type: data.type === "EXPENSE" ? "EXPENSE" : "REVENUE",
    source: "manual",
    platformLabel: String(data.platformLabel || "Manual Entry"),
    amount: Math.abs(Number(data.amount || 0)),
    feeAmount: Number(data.feeAmount || 0) || undefined,
    currency: String(data.currency || "USD"),
    category: String(data.category || "Uncategorized"),
    isRecurring: Boolean(data.isRecurring),
    recurringInterval:
      data.recurringInterval === "weekly" || data.recurringInterval === "annual"
        ? data.recurringInterval
        : data.isRecurring
          ? "monthly"
          : undefined,
    merchantOrCustomer: String(data.merchantOrCustomer || data.title || ""),
    date: String(data.date || new Date().toISOString()),
    notes: data.notes ? String(data.notes) : undefined,
    businessPersonal: "business"
  };
}

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const snap = await col(session.uid).orderBy("date", "desc").limit(500).get();
    const entries = snap.docs.map((doc) => toTransaction(session.uid, doc.id, doc.data() as Record<string, unknown>));
    return NextResponse.json({ ok: true, entries }, { headers: noStore });
  } catch (err) {
    console.error("manual ledger GET failed", err);
    // Fallback without orderBy if index missing
    try {
      const snap = await col(session.uid).limit(500).get();
      const entries = snap.docs
        .map((doc) => toTransaction(session.uid, doc.id, doc.data() as Record<string, unknown>))
        .sort((a, b) => Date.parse(b.date) - Date.parse(a.date));
      return NextResponse.json({ ok: true, entries }, { headers: noStore });
    } catch (err2) {
      console.error("manual ledger GET fallback failed", err2);
      return NextResponse.json({ ok: false, error: "manual_ledger_read_failed", entries: [] }, { status: 500, headers: noStore });
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const body = (await req.json().catch(() => ({}))) as ManualLedgerInput;
    const amount = Math.abs(Number(body.amount || 0));
    const merchantOrCustomer = String(body.merchantOrCustomer || "").trim();
    if (!amount || !merchantOrCustomer) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400, headers: noStore });
    }
    const ref = col(session.uid).doc();
    const record = {
      type: body.type === "EXPENSE" ? "EXPENSE" : "REVENUE",
      merchantOrCustomer,
      amount,
      date: body.date || new Date().toISOString(),
      category: body.category || "Uncategorized",
      platformLabel: body.platformLabel || "Manual Entry",
      currency: body.currency || "USD",
      isRecurring: Boolean(body.isRecurring),
      recurringInterval: body.recurringInterval || null,
      notes: body.notes || "",
      feeAmount: Number(body.feeAmount || 0) || 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    await ref.set(record);
    return NextResponse.json(
      { ok: true, entry: toTransaction(session.uid, ref.id, record) },
      { headers: noStore }
    );
  } catch (err) {
    console.error("manual ledger POST failed", err);
    return NextResponse.json({ ok: false, error: "manual_ledger_write_failed" }, { status: 500, headers: noStore });
  }
}

export async function PATCH(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const body = (await req.json().catch(() => ({}))) as ManualLedgerInput & { id?: string };
    const id = String(body.id || "").trim();
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400, headers: noStore });
    const ref = col(session.uid).doc(id);
    const existing = await ref.get();
    if (!existing.exists) {
      return NextResponse.json({ ok: false, error: "not_found" }, { status: 404, headers: noStore });
    }
    const patch: Record<string, unknown> = { updatedAt: new Date().toISOString() };
    if (body.type) patch.type = body.type === "EXPENSE" ? "EXPENSE" : "REVENUE";
    if (body.merchantOrCustomer != null) patch.merchantOrCustomer = String(body.merchantOrCustomer);
    if (body.amount != null) patch.amount = Math.abs(Number(body.amount));
    if (body.date) patch.date = body.date;
    if (body.category) patch.category = body.category;
    if (body.platformLabel) patch.platformLabel = body.platformLabel;
    if (body.currency) patch.currency = body.currency;
    if (body.isRecurring != null) patch.isRecurring = Boolean(body.isRecurring);
    if (body.recurringInterval !== undefined) patch.recurringInterval = body.recurringInterval || null;
    if (body.notes !== undefined) patch.notes = body.notes || "";
    if (body.feeAmount != null) patch.feeAmount = Number(body.feeAmount) || 0;
    await ref.set(patch, { merge: true });
    const next = { ...(existing.data() || {}), ...patch };
    return NextResponse.json(
      { ok: true, entry: toTransaction(session.uid, id, next as Record<string, unknown>) },
      { headers: noStore }
    );
  } catch (err) {
    console.error("manual ledger PATCH failed", err);
    return NextResponse.json({ ok: false, error: "manual_ledger_write_failed" }, { status: 500, headers: noStore });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const id =
      req.nextUrl.searchParams.get("id") ||
      String(((await req.json().catch(() => ({}))) as { id?: string }).id || "");
    if (!id) return NextResponse.json({ ok: false, error: "missing_id" }, { status: 400, headers: noStore });
    await col(session.uid).doc(id).delete();
    return NextResponse.json({ ok: true }, { headers: noStore });
  } catch (err) {
    console.error("manual ledger DELETE failed", err);
    return NextResponse.json({ ok: false, error: "manual_ledger_write_failed" }, { status: 500, headers: noStore });
  }
}
