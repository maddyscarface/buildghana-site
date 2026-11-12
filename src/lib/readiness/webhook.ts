import "server-only";
import type { CheckoutProvider } from "./payments/types";
import { handlePaymentEvent } from "./service";
import { json } from "./http";
import { clientIp } from "@/lib/server/guards";

/** Shared webhook handler: raw body → signature verification → idempotent state change. */
export async function processWebhook(req: Request, provider: CheckoutProvider) {
  const raw = await req.text();
  const evt = provider.verifyWebhook(raw, req.headers);
  if ("error" in evt) { console.warn(`[readiness] ${provider.name} webhook rejected: ${evt.error}`); return json({ ok: false, error: evt.error }, 400); }
  const r = await handlePaymentEvent(evt, { ip: clientIp(req.headers), userAgent: req.headers.get("user-agent") || "" });
  return json(r, r.ok ? 200 : 202);
}
