import { sessionCookieHeader } from "@/lib/transparency/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  return new Response(null, { status: 303, headers: { Location: "/portal/login", "Set-Cookie": sessionCookieHeader(req, "", 0), "Cache-Control": "no-store" } });
}
