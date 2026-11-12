import "server-only";
import { adminEnabled, verifyAdmin } from "./secrets";
import { json } from "./http";
import { clientIp, rateLimit } from "@/lib/server/guards";

/** Returns a Response when the request must be refused, or null when the admin is authorised. */
export async function requireAdmin(req: Request): Promise<Response | null> {
  if (!adminEnabled()) return json({ ok: false, error: "Admin is disabled on this deployment (ADMIN_TOKEN not set)" }, 404);
  const ip = clientIp(req.headers);
  if (!verifyAdmin(req.headers.get("authorization"))) {
    if (!(await rateLimit(`admin-fail-gate:${ip}`, 10, 900))) return json({ ok: false, error: "Too many attempts" }, 429);
    return json({ ok: false, error: "Unauthorised" }, 401);
  }
  return null;
}
