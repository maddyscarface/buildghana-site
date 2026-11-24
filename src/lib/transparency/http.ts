import "server-only";
import { tpConfig } from "./config";
import { cookieFromRequest, ipHash, userFromSessionValue } from "./auth";
import { ServiceError } from "./service";
import type { User } from "./types";

export const PRIVATE_HEADERS = { "Cache-Control": "private, no-store, max-age=0", "X-Robots-Tag": "noindex, nofollow, noarchive", "Referrer-Policy": "no-referrer" } as const;

export const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...PRIVATE_HEADERS, ...extra } });

export type Handler = (a: { req: Request; user: User; parts: string[]; ip: string }) => Promise<Response>;

/** Same-origin check for cookie-authenticated writes (CSRF), on top of SameSite=Strict. */
export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin"), host = req.headers.get("x-forwarded-host") || req.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}

export async function withUser(req: Request, parts: string[], h: Handler, opts: { allowAnon?: boolean } = {}): Promise<Response> {
  if (!tpConfig().enabled) return json({ ok: false, error: "Not available" }, 404);
  if (req.method !== "GET" && req.method !== "HEAD" && !sameOrigin(req)) return json({ ok: false, error: "Cross-site request blocked" }, 403);
  const user = await userFromSessionValue(cookieFromRequest(req));
  if (!user && !opts.allowAnon) return json({ ok: false, error: "Sign in required" }, 401);
  try {
    return await h({ req, user: user as User, parts, ip: ipHash(req) });
  } catch (e) {
    if (e instanceof ServiceError) return json({ ok: false, error: e.message }, e.status);
    console.error("[transparency] unexpected error", (e as Error).name);
    return json({ ok: false, error: "Something went wrong" }, 500);
  }
}

export async function body<T = Record<string, unknown>>(req: Request): Promise<T> {
  const len = Number(req.headers.get("content-length") || 0);
  if (len > 64 * 1024) throw new ServiceError(413, "Request too large");
  try { return (await req.json()) as T; } catch { throw new ServiceError(400, "Invalid JSON"); }
}

/** Match "a/:id/b" style patterns against path parts. */
export function match(parts: string[], pattern: string): string[] | null {
  const p = pattern.split("/");
  if (p.length !== parts.length) return null;
  const out: string[] = [];
  for (let i = 0; i < p.length; i++) {
    if (p[i].startsWith(":")) { if (!/^[A-Za-z0-9_-]{1,64}$/.test(parts[i])) return null; out.push(parts[i]); }
    else if (p[i] !== parts[i]) return null;
  }
  return out;
}
