import "server-only";
import { createHmac } from "node:crypto";
import { safeEqual } from "../secrets";
import type { CheckoutProvider, PaymentEvent } from "./types";

/**
 * Paystack (Ghana: GHS cards + mobile money). Env: PAYSTACK_SECRET_KEY (sk_test_… for sandbox).
 * Webhook: /api/readiness/webhooks/paystack — x-paystack-signature = HMAC-SHA512(raw body, secret key).
 * Paystack amounts are in pesewas (GHS × 100).
 */
export const paystackConfigured = () => Boolean(process.env.PAYSTACK_SECRET_KEY);

export function verifyPaystackSignature(rawBody: string, header: string | null, secret: string) {
  if (!header || !secret) return false;
  return safeEqual(createHmac("sha512", secret).update(rawBody).digest("hex"), header);
}

export const paystackProvider: CheckoutProvider = {
  name: "paystack",
  get live() { return paystackConfigured(); },
  async createSession(i) {
    const reference = `bga_rr_${i.caseId.slice(0, 8)}_${i.idempotencyKey.slice(-12)}`.replace(/[^a-zA-Z0-9_.=-]/g, "");
    const res = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email: i.email, amount: i.amountMinor, currency: i.currency, reference, callback_url: i.successUrl, metadata: { case_id: i.caseId, ...i.metadata, cancel_action: i.cancelUrl } }),
      cache: "no-store",
    });
    const json = (await res.json()) as { status: boolean; message?: string; data?: { authorization_url: string; reference: string; access_code: string } };
    if (!res.ok || !json.status || !json.data) throw new Error(`Paystack: ${json.message || res.status}`);
    return { provider: "paystack", sessionId: json.data.reference, reference: json.data.reference, url: json.data.authorization_url, sandbox: process.env.PAYSTACK_SECRET_KEY!.startsWith("sk_test_") };
  },
  verifyWebhook(rawBody, headers): PaymentEvent | { error: string } {
    if (!verifyPaystackSignature(rawBody, headers.get("x-paystack-signature"), process.env.PAYSTACK_SECRET_KEY || "")) return { error: "invalid signature" };
    const evt = JSON.parse(rawBody) as { event: string; data: { id?: number; reference?: string; amount?: number; currency?: string; status?: string; domain?: string; metadata?: { case_id?: string } } };
    const d = evt.data;
    const base = { provider: "paystack" as const, eventId: `${evt.event}:${d.id ?? d.reference}`, sandbox: d.domain !== "live", sessionId: d.reference, reference: d.reference, caseId: d.metadata?.case_id, amountMinor: d.amount, currency: d.currency };
    if (evt.event === "charge.success" && d.status === "success") return { ...base, type: "paid" };
    if (evt.event === "refund.processed") return { ...base, type: "refunded" };
    if (evt.event === "charge.failed") return { ...base, type: "failed" };
    return { ...base, type: "ignored" };
  },
};
