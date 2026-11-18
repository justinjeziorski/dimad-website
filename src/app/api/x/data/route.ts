import { NextRequest, NextResponse } from "next/server";
import {
  deleteXIntegration,
  ensureXAccessToken,
  fetchXProfileData,
  readXIntegration
} from "@/lib/integrations/x/oauth";
import { requireFirebaseUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const record = await readXIntegration(session.uid, session.idToken);
    console.log("X data lookup", session.uid, record ? record.username || record.userId || "linked" : "none");
    if (!record) {
      return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
    }

    const fresh = await ensureXAccessToken(session.uid, record, session.idToken);
    const data = await fetchXProfileData(fresh);
    return NextResponse.json({ ok: true, connected: true, ...data }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "x_request_failed";
    console.error("X data route failed", session.uid, message);
    const safe =
      message === "firestore_permission_denied" ||
      message === "firestore_read_failed" ||
      message === "x_request_failed" ||
      message === "invalid_x_credentials" ||
      message === "missing_refresh_token" ||
      message === "token_refresh_failed" ||
      (message.includes(" ") && message.length < 180);

    let userId = "";
    let username = "";
    let name = "";
    let profileImageUrl = "";
    try {
      const record = await readXIntegration(session.uid, session.idToken);
      userId = record?.userId || "";
      username = record?.username || "";
      name = record?.name || "";
      profileImageUrl = record?.profileImageUrl || "";
    } catch {
      /* ignore */
    }

    return NextResponse.json(
      {
        ok: false,
        connected: !!(userId || username),
        error: safe ? message : "x_request_failed",
        ...(userId || username
          ? {
              userId,
              username: username || "x",
              name: name || username || "X",
              profileImageUrl,
              followersCount: 0,
              followersDisplay: "—",
              followingCount: 0,
              followingDisplay: "—",
              tweetCount: 0,
              tweetDisplay: "—",
              recentTweets: []
            }
          : {})
      },
      { status: userId || username ? 200 : 502, headers: noStore }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    await deleteXIntegration(session.uid, session.idToken);
    return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "firestore_write_failed";
    console.error("X disconnect failed", session.uid, message);
    return NextResponse.json(
      { ok: false, error: message === "firestore_permission_denied" ? message : "firestore_write_failed" },
      { status: 500, headers: noStore }
    );
  }
}
