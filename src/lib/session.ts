import { NextRequest, NextResponse } from "next/server";
import { uidFromIdToken } from "./firebase-server";

export async function requireFirebaseUser(
  req: NextRequest
): Promise<{ uid: string; idToken: string } | { error: NextResponse }> {
  const idToken =
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    req.nextUrl.searchParams.get("id_token") ||
    req.cookies.get("dimad_fb_token")?.value ||
    "";
  if (!idToken) {
    return { error: NextResponse.json({ ok: false, error: "missing_id_token" }, { status: 401 }) };
  }
  try {
    const uid = await uidFromIdToken(idToken);
    return { uid, idToken };
  } catch (err) {
    console.error("Firebase session invalid", err);
    return { error: NextResponse.json({ ok: false, error: "invalid_session" }, { status: 401 }) };
  }
}
