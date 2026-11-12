import "server-only";
import { NextResponse } from "next/server";
import { verifyCaseToken } from "./secrets";
import { getCase } from "./store";

export const noStore = { "Cache-Control": "no-store", "X-Robots-Tag": "noindex, nofollow" };
export const json = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: noStore });

/** Loads a case for a client request, enforcing the capability token. 404 on any mismatch (no oracle). */
export async function clientCase(id: string, token: string | null | undefined) {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !verifyCaseToken(id, token)) return null;
  return getCase(id);
}

export function originOf(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  const u = new URL(req.url);
  const fwdHost = req.headers.get("x-forwarded-host");
  const proto = req.headers.get("x-forwarded-proto") || u.protocol.replace(":", "");
  // Prefer the actual request host so staging/preview URLs round-trip; fall back to configured site URL.
  return fwdHost ? `${proto}://${fwdHost}` : (u.host ? `${u.protocol}//${u.host}` : (env || "")).replace(/\/$/, "");
}
