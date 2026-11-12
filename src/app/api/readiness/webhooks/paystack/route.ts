import { paystackProvider } from "@/lib/readiness/payments/paystack";
import { processWebhook } from "@/lib/readiness/webhook";
import { json } from "@/lib/readiness/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.PAYSTACK_SECRET_KEY) return json({ ok: false, error: "Paystack not configured" }, 503);
  return processWebhook(req, paystackProvider);
}
