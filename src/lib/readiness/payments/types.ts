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
