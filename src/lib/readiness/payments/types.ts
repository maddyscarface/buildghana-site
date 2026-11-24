export type ProviderName = "stripe" | "paystack" | "mock";

export type CreateSessionInput = {
  caseId: string; amountMinor: number; currency: string; email: string; description: string;
  successUrl: string; cancelUrl: string; idempotencyKey: string; metadata: Record<string, string>;
};
export type CreatedSession = { provider: ProviderName; sessionId: string; reference: string; url: string; sandbox: boolean };

/** Normalised payment event produced by a verified webhook. */
export type PaymentEvent = {
  provider: ProviderName; eventId: string; type: "paid" | "failed" | "expired" | "refunded" | "ignored";
  sessionId?: string; reference?: string; caseId?: string; amountMinor?: number; currency?: string; sandbox: boolean; raw?: string;
};

export interface CheckoutProvider {
  readonly name: ProviderName;
  readonly live: boolean; // true when real keys are configured (test or live keys)
  createSession(input: CreateSessionInput): Promise<CreatedSession>;
  verifyWebhook(rawBody: string, headers: Headers): PaymentEvent | { error: string };
}

/**
 * Blueprint v1 payment kill-switch. Live Stripe/Paystack charges need BOTH provider keys AND
 * READINESS_PAYMENTS_LIVE="true" (owner decision: fee, provider, refund terms). Pasting keys alone never
 * turns on live charging. Settlement is still only confirmed by the verified webhook, never the redirect.
 */
export const paymentsLiveEnabled = () => process.env.READINESS_PAYMENTS_LIVE === "true";
