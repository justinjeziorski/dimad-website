import { readFile, stat } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".map": "application/json"
};

function safeJoin(rel: string) {
  const root = path.resolve(process.cwd());
  const full = path.resolve(root, rel);
  if (!full.startsWith(root + path.sep) && full !== root) return null;
  return full;
}

async function fileResponse(rel: string) {
  const full = safeJoin(rel);
  if (!full) return new NextResponse("Forbidden", { status: 403 });
  try {
    let target = full;
    const st = await stat(full);
    if (st.isDirectory()) target = path.join(full, "index.html");
    const buf = await readFile(target);
    const ext = path.extname(target).toLowerCase();
    return new NextResponse(buf, {
      status: 200,
      headers: { "Content-Type": MIME[ext] || "application/octet-stream" }
    });
  } catch {
    return null;
  }
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ slug?: string[] }> }
) {
  const { slug = [] } = await context.params;
  const rel = slug.join("/");

  if (rel === "dashboard" || rel === "dashboard/index.html") {
    const dash = await fileResponse("dashboard/index.html");
    if (dash) return dash;
  }

  const direct = await fileResponse(rel || "index.html");
  if (direct) return direct;

  if (rel.startsWith("dashboard/")) {
    const nested = await fileResponse(rel.slice("dashboard/".length));
    if (nested) return nested;
  }

  return new NextResponse("Not found", { status: 404 });
}
