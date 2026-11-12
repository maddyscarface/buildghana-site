import { NextResponse } from "next/server";
import { intentVendor } from "@/lib/server/intent";
import { safeEqual } from "@/lib/readiness/secrets";

export const runtime = "nodejs";

/**
 * Inbound intent signals from DataMoon / AudienceLab. Disabled (404) until the vendor is enabled and
 * INTENT_WEBHOOK_SECRET is set. Signals are only logged/tagged — never used for SMS or WhatsApp.
 */
export async function POST(req: Request) {
  const v = intentVendor();
  const secret = process.env.INTENT_WEBHOOK_SECRET;
  if (!v || !secret) return NextResponse.json({ ok: false, error: "Intent integration disabled" }, { status: 404 });
  if (!safeEqual(req.headers.get("x-webhook-secret") || "", secret)) return NextResponse.json({ ok: false }, { status: 401 });
  const signals = v.parseWebhook(await req.json().catch(() => null));
  console.info(`[intent:${v.name}] received ${signals.length} signal(s)`);
  // TODO(owner): map signals to GHL tags once the vendor's field list is confirmed during onboarding.
  return NextResponse.json({ ok: true, received: signals.length });
}
