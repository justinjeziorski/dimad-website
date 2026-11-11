import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const url = req.nextUrl.clone();
  if (url.pathname === "/") {
    url.pathname = "/index.html";
    return NextResponse.rewrite(url);
  }
  if (url.pathname === "/dashboard" || url.pathname === "/dashboard/") {
    url.pathname = "/dashboard/index.html";
    return NextResponse.rewrite(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/dashboard", "/dashboard/"]
};
