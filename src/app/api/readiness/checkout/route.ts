import { checkoutSchema } from "@/lib/readiness/schema";
import { startCheckout } from "@/lib/readiness/service";
import { clientCase, json, originOf } from "@/lib/readiness/http";
import { clientIp, rateLimit } from "@/lib/server/guards";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!(await rateLimit(`rr-checkout:${clientIp(req.headers)}`, 10, 600))) return json({ ok: false, error: "Too many attempts" }, 429);
  const parsed = checkoutSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: "Invalid request" }, 400);
  const { case_id, token, provider } = parsed.data;
  if (!(await clientCase(case_id, token))) return json({ ok: false, error: "Case not found" }, 404);
  try {
    const r = await startCheckout(case_id, provider, originOf(req), token);
    return json(r, r.ok ? 200 : r.status);
  } catch (e) {
    console.error("[readiness] checkout failed", (e as Error).message);
    return json({ ok: false, error: "We couldn't start checkout. Please try again." }, 502);
  }
}
