import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "../secrets";
import type { CheckoutProvider, PaymentEvent } from "./types";

/**
 * Stripe Checkout (hosted). Env: STRIPE_SECRET_KEY (sk_test_… for sandbox), STRIPE_WEBHOOK_SECRET (whsec_…).
 * Webhook endpoint: /api/readiness/webhooks/stripe — events: checkout.session.completed,
 * checkout.session.async_payment_succeeded, checkout.session.async_payment_failed, checkout.session.expired, charge.refunded.
 */
const TOLERANCE_SEC = 300;
export const stripeConfigured = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_WEBHOOK_SECRET);

/** Verifies a Stripe-Signature header (t=…,v1=…) against the raw body. Exported for tests. */
export function verifyStripeSignature(rawBody: string, header: string | null, secret: string, nowSec = Math.floor(Date.now() / 1000)) {
  if (!header) return false;
  const parts = Object.fromEntries(header.split(",").map((p) => p.split("=") as [string, string]).filter((p) => p.length === 2).map(([k, v]) => [k.trim(), v.trim()]));
  const sigs = header.split(",").filter((p) => p.trim().startsWith("v1=")).map((p) => p.trim().slice(3));
  const t = Number(parts.t);
  if (!t || Math.abs(nowSec - t) > TOLERANCE_SEC || sigs.length === 0) return false;
  const expected = createHmac("sha256", secret).update(`${t}.${rawBody}`).digest("hex");
  return sigs.some((s) => safeEqual(s, expected));
}

export const stripeProvider: CheckoutProvider = {
  name: "stripe",
  get live() { return stripeConfigured(); },
  async createSession(i) {
    const body = new URLSearchParams({
      mode: "payment",
      "line_items[0][price_data][currency]": i.currency.toLowerCase(),
      "line_items[0][price_data][unit_amount]": String(i.amountMinor),
      "line_items[0][price_data][product_data][name]": i.description,
      "line_items[0][quantity]": "1",
      customer_email: i.email,
      client_reference_id: i.caseId,
      success_url: i.successUrl,
      cancel_url: i.cancelUrl,
      "payment_intent_data[metadata][case_id]": i.caseId,
      ...Object.fromEntries(Object.entries(i.metadata).map(([k, v]) => [`metadata[${k}]`, v])),
    });
    const res = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, "Content-Type": "application/x-www-form-urlencoded", "Idempotency-Key": i.idempotencyKey },
      body, cache: "no-store",
    });
    const json = (await res.json()) as { id?: string; url?: string; error?: { message: string } };
    if (!res.ok || !json.id || !json.url) throw new Error(`Stripe: ${json.error?.message || res.status}`);
    return { provider: "stripe", sessionId: json.id, reference: json.id, url: json.url, sandbox: process.env.STRIPE_SECRET_KEY!.startsWith("sk_test_") };
  },
  verifyWebhook(rawBody, headers): PaymentEvent | { error: string } {
    if (!verifyStripeSignature(rawBody, headers.get("stripe-signature"), process.env.STRIPE_WEBHOOK_SECRET || "")) return { error: "invalid signature" };
    const evt = JSON.parse(rawBody) as { id: string; type: string; livemode: boolean; data: { object: Record<string, unknown> } };
    const o = evt.data.object as { id?: string; client_reference_id?: string; amount_total?: number; currency?: string; payment_status?: string; metadata?: Record<string, string>; payment_intent?: string };
    const base = { provider: "stripe" as const, eventId: evt.id, sandbox: !evt.livemode, sessionId: o.id, reference: o.id, caseId: o.client_reference_id || o.metadata?.case_id, amountMinor: o.amount_total, currency: o.currency?.toUpperCase() };
    switch (evt.type) {
      case "checkout.session.completed": return { ...base, type: o.payment_status === "paid" ? "paid" : "ignored" };
      case "checkout.session.async_payment_succeeded": return { ...base, type: "paid" };
      case "checkout.session.async_payment_failed": return { ...base, type: "failed" };
      case "checkout.session.expired": return { ...base, type: "expired" };
      case "charge.refunded": return { ...base, sessionId: undefined, reference: o.payment_intent, type: "refunded" };
      default: return { ...base, type: "ignored" };
    }
  },
};
