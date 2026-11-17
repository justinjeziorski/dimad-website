import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase-admin";
import { requireFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

function col(uid: string) {
  return getAdminDb().collection("users").doc(uid).collection("accountability_goals");
}

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const snap = await col(session.uid).orderBy("createdAt", "desc").limit(100).get();
    const goals = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
    return NextResponse.json({ ok: true, goals }, { headers: noStore });
  } catch (err) {
    console.error("accountability goals GET failed", err);
    try {
      const snap = await col(session.uid).limit(100).get();
      const goals = snap.docs
        .map((doc) => {
          const data = doc.data() as { createdAt?: string; [key: string]: unknown };
          return { id: doc.id, ...data };
        })
        .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));
      return NextResponse.json({ ok: true, goals }, { headers: noStore });
    } catch (err2) {
      console.error("accountability goals GET fallback failed", err2);
      return NextResponse.json({ ok: false, error: "goals_read_failed", goals: [] }, { status: 500, headers: noStore });
    }
  }
}

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const body = (await req.json().catch(() => ({}))) as {
      title?: string;
      targetValue?: number;
      deadline?: string;
      source?: string;
      categoryTitle?: string;
    };
    const title = String(body.title || "").trim();
    const targetValue = Number(body.targetValue);
    const deadline = String(body.deadline || "").trim();
    if (!title || !Number.isFinite(targetValue) || !deadline) {
      return NextResponse.json({ ok: false, error: "missing_fields" }, { status: 400, headers: noStore });
    }
    const ref = col(session.uid).doc();
    const now = new Date().toISOString();
    const record = {
      title,
      targetValue,
      deadline,
      currentValue: 0,
      status: "active",
      source: body.source || "revenue_forecast",
      categoryTitle: body.categoryTitle || null,
      createdAt: now,
      updatedAt: now
    };
    await ref.set(record);
    return NextResponse.json({ ok: true, goal: { id: ref.id, ...record } }, { headers: noStore });
  } catch (err) {
    console.error("accountability goals POST failed", err);
    return NextResponse.json({ ok: false, error: "goals_write_failed" }, { status: 500, headers: noStore });
  }
}
