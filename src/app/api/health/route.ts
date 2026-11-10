import { NextResponse } from "next/server";
import { kvConfigured } from "@/lib/server/kv";
import { ghlConfigured } from "@/lib/server/ghl";
import { capiConfigured } from "@/lib/server/meta-capi";
import { ga4Configured } from "@/lib/server/ga4-mp";

export const dynamic = "force-dynamic";

/**
 * Reports which integrations have credentials present. "configured" ≠ "working":
 * use the QA checklist (docs/13) to verify each one end-to-end.
 */
export function GET() {
  return NextResponse.json({
    ok: true,
    configured: {
      storage_upstash: kvConfigured,
      ghl: ghlConfigured,
      ghl_pipeline: Boolean(process.env.GHL_PIPELINE_ID && process.env.GHL_STAGE_NEW_LEAD),
      meta_capi: capiConfigured,
      ga4_measurement_protocol: ga4Configured,
      gtm: Boolean(process.env.NEXT_PUBLIC_GTM_ID),
      turnstile: Boolean(process.env.TURNSTILE_SECRET_KEY),
      crm_webhook_secret: Boolean(process.env.CRM_WEBHOOK_SECRET),
      booking_url: Boolean(process.env.NEXT_PUBLIC_GHL_BOOKING_URL),
    },
    note: "Credentials present does not mean the integration is verified. See docs/13-qa-checklist.md.",
  });
}
