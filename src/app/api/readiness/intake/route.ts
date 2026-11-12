import { createCase } from "@/lib/readiness/service";
import { json } from "@/lib/readiness/http";
import { clientIp, rateLimit } from "@/lib/server/guards";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  if (!(await rateLimit(`rr-intake:${ip}`, 6, 600))) return json({ ok: false, error: "Too many attempts. Please try again in a few minutes." }, 429);
  let body: unknown;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }
  const r = await createCase(body, { ip, userAgent: req.headers.get("user-agent") || "" });
  if (!r.ok) return json(r, r.status);
  return json(r);
}
