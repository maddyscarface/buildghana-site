import { NextResponse } from "next/server";
import { kvConfigured } from "@/lib/server/kv";
import { ghlConfigured } from "@/lib/server/ghl";
import { capiConfigured } from "@/lib/server/meta-capi";
import { ga4Configured } from "@/lib/server/ga4-mp";
import { stripeConfigured } from "@/lib/readiness/payments/stripe";
import { paystackConfigured } from "@/lib/readiness/payments/paystack";
import { mockAllowed } from "@/lib/readiness/payments/mock";
import { s3Configured } from "@/lib/readiness/storage/s3";
import { adminEnabled, tokenSecretConfigured, docsSecretConfigured, productionReady } from "@/lib/readiness/secrets";
import { googleAdsConfigured } from "@/lib/server/google-ads";
import { intentStatus } from "@/lib/server/intent";
import { dmStatus } from "@/lib/datamoon/config";
import { opsEnabled } from "@/lib/ops/auth";

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
      ghl_readiness_pipeline: Boolean(process.env.GHL_RR_PIPELINE_ID && process.env.GHL_RR_STAGE_IDS),
      ga4_tag: Boolean(process.env.NEXT_PUBLIC_GA4_ID),
      meta_pixel: Boolean(process.env.NEXT_PUBLIC_META_PIXEL_ID),
      google_ads_tag: Boolean(process.env.NEXT_PUBLIC_GOOGLE_ADS_ID),
      google_ads_offline_upload: googleAdsConfigured(),
    },
    readiness: {
      intake: productionReady(kvConfigured) ? "open" : "blocked_until_secrets_and_storage",
      payments: {
        stripe: stripeConfigured() && process.env.PAYMENTS_FORCE_MOCK !== "1",
        paystack: paystackConfigured() && process.env.PAYMENTS_FORCE_MOCK !== "1",
        sandbox_mock_available: mockAllowed(),
      },
      document_storage: s3Configured() ? "s3" : "local_tmp_sandbox",
      case_token_secret: tokenSecretConfigured,
      docs_signing_secret: docsSecretConfigured,
      admin: adminEnabled() ? "enabled" : "locked",
      client_email: Boolean(process.env.RESEND_API_KEY && process.env.READINESS_EMAIL_FROM) ? "resend" : "noop_log",
      base_fee_env: Boolean(process.env.BASE_REVIEW_FEE_USD || process.env.BASE_REVIEW_FEE_GHS || process.env.READINESS_PRICE_USD || process.env.READINESS_PRICE_GHS),
      fx_env: Boolean(process.env.READINESS_FX_USD_GHS),
    },
    intent: intentStatus(),
    datamoon: (({ main, intent, webhook, activation, ghlSync, label }) => ({ main, intent, webhook, activation, ghl_sync: ghlSync, label }))(dmStatus()),
    ops_admin: opsEnabled() ? "enabled" : "locked",
    outbox_worker: Boolean(process.env.CRON_SECRET),
    note: "Credentials present does not mean the integration is verified. See docs/13-qa-checklist.md.",
  });
}
