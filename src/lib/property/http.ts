import "server-only";
import { json } from "@/lib/readiness/http";
import { resolveStaffRole } from "@/lib/readiness/secrets";
import { clientIp, rateLimit, verifyTurnstile } from "@/lib/server/guards";
import type { Role } from "./model";

export { json };

/** Same-origin, rate limit, size cap and Turnstile for public property POSTs. Returns [body, ip, ua] or a Response. */
export async function readPublicPost(req: Request, bucket: string, limit = 5, maxBytes = 48 * 1024): Promise<{ body: unknown; ip: string; ua: string } | Response> {
  const ip = clientIp(req.headers);
  const origin = req.headers.get("origin"), host = req.headers.get("host");
  if (origin && host && new URL(origin).host !== host) return json({ ok: false, error: "Invalid origin" }, 403);
  if (!(await rateLimit(`${bucket}:${ip}`, limit, 600))) return json({ ok: false, error: "Too many submissions. Please try again in a few minutes." }, 429);
  const raw = await req.text();
  if (raw.length > maxBytes) return json({ ok: false, error: "Payload too large" }, 413);
  let body: unknown;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  if (!(await verifyTurnstile((body as { turnstile_token?: string })?.turnstile_token, ip))) return json({ ok: false, error: "Spam check failed. Please refresh and try again." }, 400);
  return { body, ip, ua: req.headers.get("user-agent") || "" };
}

/** Staff auth for /api/admin/property/*. 404 when no admin token is configured (feature locked), 401 otherwise. */
export async function requireStaff(req: Request): Promise<{ role: Role } | Response> {
  if ((process.env.ADMIN_TOKEN || "").length < 16) return json({ ok: false, error: "Admin is disabled on this deployment (ADMIN_TOKEN not set)" }, 404);
  const role = resolveStaffRole(req.headers.get("authorization"));
  if (!role) {
    const ip = clientIp(req.headers);
    if (!(await rateLimit(`pp-admin-fail:${ip}`, 10, 900))) return json({ ok: false, error: "Too many attempts" }, 429);
    return json({ ok: false, error: "Unauthorised" }, 401);
  }
  return { role };
}

export const isUuid = (s: string) => /^[0-9a-f-]{36}$/i.test(s);
