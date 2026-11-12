import "server-only";
import { randomUUID } from "node:crypto";
import { hmac, safeEqual } from "../secrets";
import type { CheckoutProvider, PaymentEvent, ProviderName } from "./types";

/**
 * Sandbox checkout used when a provider has no keys. It mimics a hosted checkout page on our own
 * domain and posts a SIGNED synthetic webhook through the exact same handler as Stripe/Paystack,
 * so status changes, idempotency, CRM sync and conversion events are all exercised.
 * Disabled on production deployments unless READINESS_ALLOW_MOCK_PAYMENTS=1.
 */
const MOCK_SECRET = () => process.env.READINESS_MOCK_WEBHOOK_SECRET || "bga-mock-webhook-secret-sandbox-only";

export const mockAllowed = () => process.env.VERCEL_ENV !== "production" || process.env.READINESS_ALLOW_MOCK_PAYMENTS === "1";

export const signMock = (body: string) => hmac(MOCK_SECRET(), body);

export function mockProvider(emulates: Exclude<ProviderName, "mock">): CheckoutProvider {
  return {
    name: "mock",
    live: false,
    async createSession(i) {
      const sessionId = `mock_${emulates}_${randomUUID()}`;
      const q = new URLSearchParams({ session: sessionId, case: i.caseId, amount: String(i.amountMinor), currency: i.currency, via: emulates, success: i.successUrl, cancel: i.cancelUrl });
      return { provider: "mock", sessionId, reference: sessionId, url: `/ghana-build-readiness-review/checkout/sandbox?${q}`, sandbox: true };
    },
    verifyWebhook(rawBody, headers): PaymentEvent | { error: string } {
      const sig = headers.get("x-mock-signature") || "";
      if (!safeEqual(signMock(rawBody), sig)) return { error: "invalid signature" };
      const e = JSON.parse(rawBody) as { id: string; type: "paid" | "failed"; session: string; case_id: string; amount: number; currency: string };
      return { provider: "mock", eventId: e.id, type: e.type, sessionId: e.session, reference: e.session, caseId: e.case_id, amountMinor: e.amount, currency: e.currency, sandbox: true };
    },
  };
}
