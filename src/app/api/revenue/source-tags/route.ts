import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebase/admin";
import { DEFAULT_SOURCE_TAGS } from "@/lib/revenue/source-tags";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

function doc(uid: string) {
  return getAdminDb().collection("users").doc(uid).collection("settings").doc("revenue");
}

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const snap = await doc(session.uid).get();
    const tags = Array.isArray(snap.data()?.manualSourceTags)
      ? (snap.data()!.manualSourceTags as string[])
      : [];
    const merged = Array.from(new Set([...DEFAULT_SOURCE_TAGS, ...tags.map((t) => String(t).trim()).filter(Boolean)]));
    return NextResponse.json({ ok: true, tags: merged }, { headers: noStore });
  } catch (err) {
    console.error("source tags GET failed", err);
    return NextResponse.json({ ok: true, tags: DEFAULT_SOURCE_TAGS }, { headers: noStore });
  }
}

export async function POST(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;
  try {
    const body = (await req.json().catch(() => ({}))) as { tag?: string; tags?: string[] };
    const snap = await doc(session.uid).get();
    const existing = Array.isArray(snap.data()?.manualSourceTags)
      ? (snap.data()!.manualSourceTags as string[])
      : [];
    const incoming = body.tags?.length
      ? body.tags
      : body.tag
        ? [body.tag]
        : [];
    const merged = Array.from(
      new Set([...DEFAULT_SOURCE_TAGS, ...existing, ...incoming].map((t) => String(t).trim()).filter(Boolean))
    );
    await doc(session.uid).set({ manualSourceTags: merged, updatedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ ok: true, tags: merged }, { headers: noStore });
  } catch (err) {
    console.error("source tags POST failed", err);
    return NextResponse.json({ ok: false, error: "source_tags_write_failed" }, { status: 500, headers: noStore });
  }
}
