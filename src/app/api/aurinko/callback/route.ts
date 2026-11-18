export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** @deprecated Canonical handler is `/api/auth/aurinko/callback`. Kept so older Aurinko return URLs still complete OAuth. */
export { GET } from "@/app/api/auth/aurinko/callback/route";
