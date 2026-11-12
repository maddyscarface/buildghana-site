import { randomUUID } from "node:crypto";
import { mockAllowed, mockProvider, signMock } from "@/lib/readiness/payments/mock";
import { processWebhook } from "@/lib/readiness/webhook";
import { caseForSession, getCase } from "@/lib/readiness/store";
import { json } from "@/lib/readiness/http";

export const runtime = "nodejs";

/**
 * Sandbox checkout completion. Builds a signed synthetic webhook and runs it through the same
 * verification + idempotent handler as real providers. Unavailable on production deployments.
 */
export async function POST(req: Request) {
  if (!mockAllowed()) return json({ ok: false, error: "Sandbox payments are disabled" }, 404);
  const b = (await req.json().catch(() => ({}))) as { session?: string; outcome?: "paid" | "failed" };
  if (!b.session || !/^mock_(stripe|paystack)_[0-9a-f-]{36}$/.test(b.session)) return json({ ok: false, error: "Invalid session" }, 400);
  const caseId = await caseForSession(b.session);
  const c = caseId ? await getCase(caseId) : null;
  if (!c || c.payment?.sessionId !== b.session) return json({ ok: false, error: "Session not found (sandbox storage may have reset — start again)" }, 404);
  const body = JSON.stringify({ id: `evt_mock_${randomUUID()}`, type: b.outcome === "failed" ? "failed" : "paid", session: b.session, case_id: c.id, amount: c.payment.amountMinor, currency: c.payment.currency });
  const fake = new Request(req.url, { method: "POST", body, headers: { "content-type": "application/json", "x-mock-signature": signMock(body), "user-agent": req.headers.get("user-agent") || "", "x-forwarded-for": req.headers.get("x-forwarded-for") || "" } });
  return processWebhook(fake, mockProvider(b.session.startsWith("mock_stripe") ? "stripe" : "paystack"));
}
