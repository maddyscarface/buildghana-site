import { getPriceSettings } from "@/lib/readiness/pricing";
import { json } from "@/lib/readiness/http";
import { stripeConfigured } from "@/lib/readiness/payments/stripe";
import { paystackConfigured } from "@/lib/readiness/payments/paystack";
import { mockAllowed } from "@/lib/readiness/payments/mock";

export const dynamic = "force-dynamic";

/** Public price + payment-mode info for the landing and checkout UI. */
export async function GET() {
  const p = await getPriceSettings();
  return json({
    usdMinor: p.usdMinor, ghsMinor: p.ghsMinor, turnaroundDays: p.turnaroundDays,
    modes: { stripe: stripeConfigured() ? "live" : mockAllowed() ? "sandbox" : "unavailable", paystack: paystackConfigured() ? "live" : mockAllowed() ? "sandbox" : "unavailable" },
  });
}
