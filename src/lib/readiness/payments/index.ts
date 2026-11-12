import "server-only";
import { stripeProvider } from "./stripe";
import { paystackProvider } from "./paystack";
import { mockAllowed, mockProvider } from "./mock";
import type { CheckoutProvider } from "./types";

/** Returns the real provider when keys exist, else the sandbox mock (if allowed), else null. */
export function checkoutProvider(choice: "stripe" | "paystack"): CheckoutProvider | null {
  const real = choice === "stripe" ? stripeProvider : paystackProvider;
  if (process.env.PAYMENTS_FORCE_MOCK === "1" && mockAllowed()) return mockProvider(choice);
  if (real.live) return real;
  return mockAllowed() ? mockProvider(choice) : null;
}
export const currencyFor = (choice: "stripe" | "paystack") => (choice === "stripe" ? "USD" : "GHS");
export type { PaymentEvent } from "./types";
