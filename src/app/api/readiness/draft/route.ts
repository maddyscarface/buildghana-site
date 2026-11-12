import { registerDraftStart } from "@/lib/readiness/draft";
import { json } from "@/lib/readiness/http";
import { clientIp, rateLimit } from "@/lib/server/guards";

export const runtime = "nodejs";

/** First save of a readiness draft → "Readiness intake started" (duplicate-safe). */
export async function POST(req: Request) {
  const ip = clientIp(req.headers);
  if (!(await rateLimit(`rr-draft:${ip}`, 10, 600))) return json({ ok: false, error: "Too many attempts" }, 429);
  let body: unknown;
  try { body = await req.json(); } catch { return json({ ok: false, error: "Invalid request" }, 400); }
  const r = await registerDraftStart(body);
  if (!r.ok) return json(r, r.status);
  return json({ ok: true, first: r.first });
}
