import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ADMIN_EMAIL = "admin@dimad.co";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

type ContactBody = {
  firstName?: string;
  lastName?: string;
  email?: string;
  message?: string;
  company?: string; // honeypot
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as ContactBody;
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").trim();
    const message = String(body.message || "").trim();
    const honeypot = String(body.company || "").trim();

    if (honeypot) {
      return NextResponse.json({ ok: true });
    }

    if (!firstName || !lastName || !email || !message) {
      return NextResponse.json({ ok: false, error: "Please fill in all fields." }, { status: 400 });
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: "Enter a valid email address." }, { status: 400 });
    }
    if (message.length > 5000) {
      return NextResponse.json({ ok: false, error: "Message is too long." }, { status: 400 });
    }

    const payload = {
      name: `${firstName} ${lastName}`,
      firstName,
      lastName,
      email,
      message,
      _replyto: email,
      _subject: `Dimad Contact — ${firstName} ${lastName}`,
      _template: "table"
    };

    const upstream = await fetch(`https://formsubmit.co/ajax/${ADMIN_EMAIL}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => "");
      console.error("Contact form upstream failed", upstream.status, detail);
      return NextResponse.json(
        { ok: false, error: "Could not send your message right now. Please try again." },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Contact form failed", err);
    return NextResponse.json(
      { ok: false, error: "Could not send your message right now. Please try again." },
      { status: 500 }
    );
  }
}
