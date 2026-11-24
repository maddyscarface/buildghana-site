/**
 * BuildGhana business manifest — Universal Business Launch OS blueprint v1.0 (§02).
 * Typed, schema-validated, reviewable configuration. Every claim-sensitive value carries a status; public
 * rendering of claims is still governed by `verified` flags in src/config/site.ts. Nothing here is a
 * secret and nothing here turns an integration on: integration state is derived from env at runtime.
 *
 * docs/blueprint/business.manifest.json is a generated copy (see tests/blueprint.test.ts).
 */
import { z } from "zod";

export const factStatus = z.enum(["owner_asserted", "source_supported", "independently_verified", "inferred", "conflicting", "unknown", "approved"]);
export const integrationStatus = z.enum(["not_configured", "mock_verified", "connected", "live_test_verified", "degraded"]);

const fact = z.object({
  id: z.string(), path: z.string(), value: z.string(), status: factStatus, sourceIds: z.array(z.string()),
  observedAt: z.string(), usePolicy: z.enum(["public_ok", "block_until_approved", "internal_only"]), note: z.string().optional(),
});

export const manifestSchema = z.object({
  schemaVersion: z.literal("1.0.0"),
  tenantId: z.string(),
  business: z.object({
    displayName: z.string(), legalName: z.string().nullable(), vertical: z.literal("construction_advisory.ghana"),
    businessModel: z.enum(["advisory_and_construction_management"]), websiteLocale: z.string(), currencies: z.array(z.enum(["GHS", "USD"])).min(1),
    factsApproval: z.enum(["pending", "approved"]),
  }),
  market: z.object({
    countries: z.array(z.string()).min(1),
    serviceAreas: z.array(z.object({ slug: z.string(), label: z.string(), country: z.string(), coverage: z.enum(["pending_owner_confirmation", "confirmed"]), office: z.boolean() })),
    mode: z.enum(["service_area_business"]), publishOnlyConfirmedAreas: z.literal(true),
  }),
  customers: z.array(z.enum(["diaspora", "returning_resident", "ghana_resident", "international_investor", "property_seller", "property_buyer"])).min(4),
  services: z.array(z.object({ id: z.string(), name: z.string(), path: z.string(), publicPage: z.boolean(), pricingVisibility: z.enum(["manual_private", "owner_set_fixed_fee"]) })),
  brand: z.object({ directionId: z.string(), approved: z.boolean(), imageryPolicy: z.literal("licensed_illustrative_labelled"), logoApproved: z.boolean() }),
  conversion: z.object({ primaryCTA: z.string(), secondaryCTA: z.string(), primaryFlow: z.string(), booking: z.enum(["optional", "off"]), publicPricePolicy: z.enum(["none", "owner_set_fee_only"]) }),
  crm: z.object({ provider: z.literal("gohighlevel"), authStatus: z.enum(["unconfigured", "configured"]), fieldMapRef: z.string() }),
  marketing: z.object({
    analyticsConsent: z.literal("required_by_applicable_law"), meta: z.literal("disabled_until_configured"), googleAds: z.literal("disabled_until_configured"),
    audienceData: z.object({ provider: z.literal("datamoon"), mode: z.literal("mock_flags_off"), market: z.literal("US_only"), ghanaDomestic: z.literal("first_party_and_local_channels_only") }),
  }),
  features: z.object({
    cms: z.boolean(), forms: z.literal(true), leadScoring: z.boolean(), walkthrough: z.literal(false), nativeAR: z.literal(false), internalEstimating: z.literal(false),
    paidAssessment: z.literal(true), payments: z.literal("disabled_until_owner_enables"), propertyMatch: z.literal(true), publicListings: z.literal(false), healthcare: z.literal(false),
  }),
  readiness: z.object({
    intake: z.array(z.enum(["location_parcel", "ownership_authorization", "private_document_upload", "intended_use", "budget", "start_date", "contact"])).length(7),
    outputs: z.array(z.enum(["site_visit_summary", "permit_checklist", "provisional_costs_ghs_usd_with_fx_source_and_date", "recommendation_proceed_conditional_pause", "counsel_led_title_tracked_separately"])).length(5),
  }),
  access: z.object({ roles: z.array(z.string()), recordIsolation: z.literal("brand_and_project") }),
  site: z.object({ stagingNoindex: z.literal(true), productionHost: z.string().nullable(), contentApproval: z.enum(["pending", "approved"]) }),
  compliance: z.object({ regulated: z.literal(true), jurisdictions: z.array(z.string()), checks: z.array(z.string()) }),
  facts: z.array(fact),
});
export type BusinessManifest = z.infer<typeof manifestSchema>;

const OBSERVED = "2026-11-24";

export const manifest: BusinessManifest = {
  schemaVersion: "1.0.0",
  tenantId: "tn_buildghana",
  business: {
    displayName: "BuildGhana Abroad", legalName: null, vertical: "construction_advisory.ghana", businessModel: "advisory_and_construction_management",
    websiteLocale: "en", currencies: ["GHS", "USD"], factsApproval: "pending",
  },
  market: {
    countries: ["GH"],
    // No town or region is asserted as served: coverage is confirmed per parcel before any fee.
    serviceAreas: [{ slug: "ghana", label: "Ghana (coverage confirmed per parcel)", country: "GH", coverage: "pending_owner_confirmation", office: false }],
    mode: "service_area_business", publishOnlyConfirmedAreas: true,
  },
  customers: ["diaspora", "returning_resident", "ghana_resident", "international_investor", "property_seller", "property_buyer"],
  services: [
    { id: "readiness_review", name: "Ghana Build Readiness Review", path: "/ghana-build-readiness-review", publicPage: true, pricingVisibility: "owner_set_fixed_fee" },
    { id: "land_feasibility", name: "Land Due Diligence & Feasibility", path: "/land-feasibility", publicPage: true, pricingVisibility: "manual_private" },
    { id: "design_coordination", name: "Architectural & Engineering Coordination", path: "/design-coordination", publicPage: true, pricingVisibility: "manual_private" },
    { id: "preconstruction", name: "Preconstruction Planning & Budgeting", path: "/preconstruction-budgeting", publicPage: true, pricingVisibility: "manual_private" },
    { id: "owners_rep", name: "Owner's Representation & Inspections", path: "/owners-representation", publicPage: true, pricingVisibility: "manual_private" },
    { id: "construction_management", name: "General Contracting & Construction Management", path: "/construction-management-ghana", publicPage: true, pricingVisibility: "manual_private" },
    { id: "project_rescue", name: "Unfinished Project Rescue", path: "/ghana-project-rescue", publicPage: true, pricingVisibility: "manual_private" },
    { id: "development", name: "Ghana Real Estate Development", path: "/ghana-property-development", publicPage: true, pricingVisibility: "manual_private" },
    { id: "property_introductions", name: "Private property introductions", path: "/property", publicPage: true, pricingVisibility: "manual_private" },
  ],
  brand: { directionId: "forest_gold_editorial_v3", approved: false, imageryPolicy: "licensed_illustrative_labelled", logoApproved: false },
  conversion: {
    primaryCTA: "Get My Ghana Build Readiness Review", secondaryCTA: "Request a Project Assessment", primaryFlow: "readiness_review_intake_v2",
    booking: "optional", publicPricePolicy: "owner_set_fee_only",
  },
  crm: { provider: "gohighlevel", authStatus: "unconfigured", fieldMapRef: "docs/07-ghl-data-mapping.md" },
  marketing: {
    analyticsConsent: "required_by_applicable_law", meta: "disabled_until_configured", googleAds: "disabled_until_configured",
    audienceData: { provider: "datamoon", mode: "mock_flags_off", market: "US_only", ghanaDomestic: "first_party_and_local_channels_only" },
  },
  features: {
    cms: false, forms: true, leadScoring: true, walkthrough: false, nativeAR: false, internalEstimating: false,
    paidAssessment: true, payments: "disabled_until_owner_enables", propertyMatch: true, publicListings: false, healthcare: false,
  },
  readiness: {
    intake: ["location_parcel", "ownership_authorization", "private_document_upload", "intended_use", "budget", "start_date", "contact"],
    outputs: ["site_visit_summary", "permit_checklist", "provisional_costs_ghs_usd_with_fx_source_and_date", "recommendation_proceed_conditional_pause", "counsel_led_title_tracked_separately"],
  },
  access: { roles: ["owner", "manager", "marketer", "estimator", "operator", "legal_reviewer", "read_only"], recordIsolation: "brand_and_project" },
  site: { stagingNoindex: true, productionHost: null, contentApproval: "pending" },
  compliance: {
    regulated: true, jurisdictions: ["GH", "US"],
    checks: ["no_unverified_licence_or_registration_claims", "title_counsel_led", "no_public_listings_without_seller_authorisation", "consumer_consent", "ghana_data_protection_act_843_review", "us_state_privacy_review", "payments_webhook_settlement_only"],
  },
  facts: [
    { id: "f_brand_name", path: "business.displayName", value: "BuildGhana Abroad", status: "owner_asserted", sourceIds: ["phase1_brief"], observedAt: OBSERVED, usePolicy: "public_ok", note: "Final trading name still to confirm (site.ts)." },
    { id: "f_legal_name", path: "business.legalName", value: "", status: "unknown", sourceIds: [], observedAt: OBSERVED, usePolicy: "block_until_approved" },
    { id: "f_coverage", path: "market.serviceAreas", value: "Ghana; per-parcel confirmation", status: "owner_asserted", sourceIds: ["phase1_brief"], observedAt: OBSERVED, usePolicy: "public_ok", note: "No named towns asserted as served." },
    { id: "f_founder", path: "about.founder", value: "Gary Acquah, Founder & Principal", status: "owner_asserted", sourceIds: ["phase1_brief"], observedAt: OBSERVED, usePolicy: "public_ok" },
    { id: "f_founder_credentials", path: "about.founder.credentials", value: "MBA Cornell; MS WPI; MA CS licence; OSHA 30", status: "owner_asserted", sourceIds: ["phase1_brief"], observedAt: OBSERVED, usePolicy: "block_until_approved", note: "Rendered only when verified=true in site.ts." },
    { id: "f_ghana_registration", path: "about.ghanaCredentials", value: "ORC registration, MWH classification, affiliations, insurance", status: "unknown", sourceIds: [], observedAt: OBSERVED, usePolicy: "block_until_approved" },
    { id: "f_readiness_fee", path: "readiness.fee", value: "", status: "unknown", sourceIds: [], observedAt: OBSERVED, usePolicy: "block_until_approved", note: "Owner sets BASE_REVIEW_FEE_USD/GHS or admin setting." },
    { id: "f_phone_address", path: "contact.phone_address", value: "", status: "unknown", sourceIds: [], observedAt: OBSERVED, usePolicy: "block_until_approved" },
    { id: "f_reviews", path: "proof.reviews", value: "none", status: "unknown", sourceIds: [], observedAt: OBSERVED, usePolicy: "block_until_approved" },
    { id: "f_portfolio", path: "proof.projects", value: "none verified", status: "unknown", sourceIds: [], observedAt: OBSERVED, usePolicy: "block_until_approved", note: "All photos are licensed illustrative stock, labelled on-image." },
    { id: "f_response_time", path: "conversion.responseTime", value: "within one business day", status: "owner_asserted", sourceIds: ["phase1_brief"], observedAt: OBSERVED, usePolicy: "public_ok" },
  ],
};

export type IntegrationKey = "ghl" | "storage" | "documents" | "payments" | "gtm" | "meta_capi" | "ga4_mp" | "datamoon" | "email";

/** Runtime integration state for /api/health and the QA report. Present credentials ≠ verified. */
export function integrationStatuses(env: Record<string, string | undefined> = process.env): Record<IntegrationKey, z.infer<typeof integrationStatus>> {
  const has = (...k: string[]) => k.every((x) => Boolean(env[x]));
  const sandbox = env.VERCEL_ENV !== "production";
  return {
    ghl: has("GHL_PRIVATE_TOKEN", "GHL_LOCATION_ID") ? "connected" : "not_configured",
    storage: has("UPSTASH_REDIS_REST_URL", "UPSTASH_REDIS_REST_TOKEN") ? "connected" : "not_configured",
    documents: has("DOCS_S3_BUCKET") ? "connected" : sandbox ? "mock_verified" : "not_configured",
    payments: env.READINESS_PAYMENTS_LIVE === "true" && (has("STRIPE_SECRET_KEY") || has("PAYSTACK_SECRET_KEY")) ? "connected" : sandbox ? "mock_verified" : "not_configured",
    gtm: has("NEXT_PUBLIC_GTM_ID") ? "connected" : "not_configured",
    meta_capi: has("META_PIXEL_ID", "META_CAPI_ACCESS_TOKEN") ? "connected" : "not_configured",
    ga4_mp: has("GA4_MEASUREMENT_ID", "GA4_API_SECRET") ? "connected" : "not_configured",
    datamoon: env.DATAMOON_ENABLED === "true" || env.DATAMOON_ENABLED === "1" ? "connected" : "mock_verified",
    email: has("RESEND_API_KEY") ? "connected" : "not_configured",
  };
}

/** Invariants from blueprint §02.1 / §05.C that must hold before G4. Returns a list of violations. */
export function manifestViolations(m: BusinessManifest, env: Record<string, string | undefined> = process.env): string[] {
  const v: string[] = [];
  const parsed = manifestSchema.safeParse(m);
  if (!parsed.success) v.push(...parsed.error.issues.map((i) => `schema:${i.path.join(".")}:${i.message}`));
  if (m.features.healthcare) v.push("healthcare must be false for this tenant");
  if (m.market.serviceAreas.some((a) => a.coverage !== "confirmed" && a.label !== "Ghana (coverage confirmed per parcel)")) v.push("unconfirmed named service area present");
  if (m.features.publicListings) v.push("public property listings are not allowed without seller authorisation + review");
  if (m.marketing.audienceData.market !== "US_only") v.push("vendor audience data must stay US-only");
  if (env.READINESS_PAYMENTS_LIVE === "true" && !(env.BASE_REVIEW_FEE_USD || env.BASE_REVIEW_FEE_GHS)) v.push("payments live without an owner-set fee env (check admin fee setting)");
  for (const f of m.facts) if (f.usePolicy === "public_ok" && (f.status === "unknown" || f.status === "conflicting")) v.push(`fact ${f.id} is public_ok but ${f.status}`);
  return v;
}
