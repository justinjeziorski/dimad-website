import { NextRequest, NextResponse } from "next/server";
import {
  deleteYouTubeIntegration,
  ensureYouTubeAccessToken,
  fetchYouTubeChannelData,
  readYouTubeIntegration
} from "@/lib/youtube-oauth";
import { requireFirebaseUser } from "@/lib/session";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const noStore = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    const record = await readYouTubeIntegration(session.uid, session.idToken);
    console.log("YouTube data lookup", session.uid, record ? record.channelId || record.channelTitle || "linked" : "none");
    if (!record) {
      return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
    }

    const fresh = await ensureYouTubeAccessToken(session.uid, record, session.idToken);
    const data = await fetchYouTubeChannelData(fresh);
    return NextResponse.json({ ok: true, connected: true, ...data }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "youtube_request_failed";
    console.error("YouTube data route failed", session.uid, message);
    const safe =
      message === "firestore_permission_denied" ||
      message === "firestore_read_failed" ||
      message === "youtube_request_failed" ||
      message === "invalid_youtube_credentials" ||
      message === "missing_refresh_token" ||
      message === "token_refresh_failed" ||
      message === "youtube_channel_missing" ||
      (message.includes(" ") && message.length < 180);

    let channelId = "";
    let channelTitle = "";
    let thumbnail = "";
    try {
      const record = await readYouTubeIntegration(session.uid, session.idToken);
      channelId = record?.channelId || "";
      channelTitle = record?.channelTitle || "";
      thumbnail = record?.thumbnail || "";
    } catch {
      /* ignore */
    }

    return NextResponse.json(
      {
        ok: false,
        connected: !!(channelId || channelTitle),
        error: safe ? message : "youtube_request_failed",
        ...(channelId || channelTitle
          ? {
              channelId,
              channelTitle: channelTitle || "YouTube",
              thumbnail,
              subscriberCount: 0,
              subscriberDisplay: "—",
              viewCount: 0,
              viewDisplay: "—",
              videoCount: 0,
              videoDisplay: "—",
              recentVideos: []
            }
          : {})
      },
      { status: channelId || channelTitle ? 200 : 502, headers: noStore }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const session = await requireFirebaseUser(req);
  if ("error" in session) return session.error;

  try {
    await deleteYouTubeIntegration(session.uid, session.idToken);
    return NextResponse.json({ ok: true, connected: false }, { headers: noStore });
  } catch (err) {
    const message = err instanceof Error ? err.message : "firestore_write_failed";
    console.error("YouTube disconnect failed", session.uid, message);
    return NextResponse.json(
      { ok: false, error: message === "firestore_permission_denied" ? message : "firestore_write_failed" },
      { status: 500, headers: noStore }
    );
  }
}
