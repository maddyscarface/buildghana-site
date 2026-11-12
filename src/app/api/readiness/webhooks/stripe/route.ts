import { stripeProvider } from "@/lib/readiness/payments/stripe";
import { processWebhook } from "@/lib/readiness/webhook";
import { json } from "@/lib/readiness/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET) return json({ ok: false, error: "Stripe not configured" }, 503);
  return processWebhook(req, stripeProvider);
}
