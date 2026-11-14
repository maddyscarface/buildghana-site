import { z } from "zod";

/**
 * Audience recipe manager — schema + compliance validation (pure; unit-tested).
 * BuildGhana rules (01_BUILDGHANA_PHASE4 §2): US-based prospects only; no Ghana coverage claims; no ethnicity,
 * ancestry, nationality, diaspora/expat or other sensitive-trait targeting; no financial-eligibility modelling;
 * never auto-enrol identified people into SMS/email. Topic ids must come from catalog discovery (never invented).
 */
export const US_STATES = ["ak","al","ar","az","ca","co","ct","de","fl","ga","hi","ia","id","il","in","ks","ky","la","ma","md","me","mi","mn","mo","ms","mt","nc","nd","ne","nh","nj","nm","nv","ny","oh","ok","or","pa","ri","sc","sd","tn","tx","ut","va","vt","wa","wi","wv","wy"] as const;
export const destinations = ["admin_review_only", "ghl_buildghana_subaccount", "ads_customer_list"] as const;
export const recipeStatuses = ["draft", "submitted", "approved", "paused", "retired"] as const;
export const personas = ["us_overseas_property_researcher", "us_property_investor_developer", "us_real_estate_professional"] as const;

export const PROHIBITED_FIELD = /(ethnic|race|racial|religio|national|ancestr|origin|language|politic|donor|financial|credit|net_worth|income|gender|age_range|age\b|married|children|health|sexual)/i;
export const PROHIBITED_TERMS = /(ghanaian|diaspora|african|black|ethnic|heritage|ancestr|expat|immigrant|nationality|tribe|akan|ashanti|ewe\b|ga-adangbe|fante|religio|church|mosque)/i;
export const PROHIBITED_BUNDLES = ["financial", "donor", "political"];

export const topicRefSchema = z.object({
  kind: z.enum(["b2b", "b2c"]), id: z.union([z.string().min(1).max(64), z.number().int()]), name: z.string().min(1).max(160),
  confirmedAt: z.string().optional(), synthetic: z.boolean().default(false),
});
export const filterSchema = z.object({
  api: z.enum(["main", "intent_consumer", "intent_business"]),
  field: z.string().min(1).max(80), operator: z.string().min(1).max(20), value: z.unknown(),
  /** documented = listed in public main-API docs; discovered = returned by /intent/feeds/filters/{consumer|business}/fields for this org. */
  verification: z.enum(["documented", "discovered", "unverified"]).default("unverified"),
});

export const recipeInputSchema = z.object({
  name: z.string().trim().min(3).max(100),
  persona: z.enum(personas),
  kind: z.enum(["b2c", "b2b"]),
  api: z.enum(["main_audience", "intent_feed"]),
  market: z.literal("US"),
  states: z.array(z.preprocess((v) => (typeof v === "string" ? v.trim().toLowerCase() : v), z.enum(US_STATES))).max(51).default([]),
  topics: z.array(topicRefSchema).max(5).default([]),
  feedId: z.string().uuid().optional(),
  lookbackDays: z.number().int().min(1).max(14).default(14),
  filters: z.array(filterSchema).max(12).default([]),
  enrichmentBundles: z.array(z.string().max(40)).max(6).default([]),
  maxRecords: z.number().int().min(1).max(1_000_000),
  purpose: z.string().trim().min(10).max(400),
  legalBasis: z.string().trim().min(5).max(300),
  destinations: z.array(z.enum(destinations)).min(1).default(["admin_review_only"]),
  cta: z.string().trim().max(200).optional(),
  notes: z.string().max(1000).optional(),
});
export type RecipeInput = z.infer<typeof recipeInputSchema>;
export type Approval = { by: string; at: string; maxRecords?: number };
export type Recipe = RecipeInput & {
  id: string; brand: string; status: (typeof recipeStatuses)[number]; owner: string; createdAt: string; updatedAt: string;
  estimatedCredits: number; lastRunAt?: string; exportApproval?: Approval; crmSyncApproval?: Approval; synthetic: boolean; version: number;
};

/** Returns a list of compliance problems (empty = OK). */
/** Hard violations: a recipe with any of these is refused outright (not even saved as a draft). */
export function targetingViolations(r: RecipeInput): string[] {
  const issues: string[] = [];
  if (r.market !== "US") issues.push("DataMoon recipes are US-only for BuildGhana (no Ghana coverage is established).");
  for (const f of r.filters) if (PROHIBITED_FIELD.test(f.field)) issues.push(`Filter field "${f.field}" targets a sensitive or financial-eligibility trait and is not allowed.`);
  const text = [r.name, r.purpose, r.legalBasis, r.cta ?? "", r.notes ?? "", ...r.topics.map((t) => t.name), ...r.filters.map((f) => JSON.stringify(f.value ?? ""))].join(" ");
  if (PROHIBITED_TERMS.test(text)) issues.push("Recipe text or topics reference ethnicity, ancestry, nationality, diaspora/expat status or religion. Use non-sensitive property/investment/travel interest topics only.");
  for (const b of r.enrichmentBundles) if (PROHIBITED_BUNDLES.includes(b.replace(/-/g, "_"))) issues.push(`Enrichment bundle "${b}" is not permitted for this brand.`);
  return issues;
}

export function complianceIssues(r: RecipeInput): string[] {
  const issues: string[] = targetingViolations(r);
  if (r.kind === "b2c" || r.kind === "b2b") { if (r.api === "main_audience" && r.topics.length === 0) issues.push("Main-API b2b/b2c audiences require at least one topic id from catalog discovery."); }
  if (r.api === "intent_feed" && !r.feedId) issues.push("Intent recipes need a feed id from GET /intent/feeds.");
  if (r.destinations.includes("ads_customer_list")) issues.push("Ads customer-list upload is blocked until the owner selects a platform and vendor terms permit it.");
  if (/sms|whatsapp|text message|cold email|auto.?enrol/i.test(`${r.purpose} ${r.cta ?? ""}`)) issues.push("Recipes may not plan unsolicited SMS/WhatsApp/email outreach.");
  if (r.topics.some((t) => !t.synthetic && !t.confirmedAt)) issues.push("Every live topic needs a confirmedAt timestamp from catalog discovery.");
  return issues;
}

/** Rough credit estimate: one record credit per exported row (intent docs: export creation reserves records). */
export const estimateCredits = (r: Pick<RecipeInput, "maxRecords">) => r.maxRecords;

/** Approval-time checks beyond compliance (owner-only action). */
export function approvalIssues(r: Recipe, cfg: { recordCeiling: number }, kind: "export" | "crm_sync"): string[] {
  const issues = complianceIssues(r);
  if (r.status !== "approved" && kind === "crm_sync" && !r.exportApproval) issues.push("Approve the export first.");
  if (kind === "export") {
    // Synthetic recipes never bill (fixtures only), so the owner ceiling is enforced for live recipes only.
    if (r.synthetic) { /* no billable export */ }
    else if (cfg.recordCeiling <= 0) issues.push("DATAMOON_RECORD_CEILING is 0 — set an owner-approved record ceiling before approving exports.");
    else if (r.maxRecords > cfg.recordCeiling) issues.push(`maxRecords ${r.maxRecords} exceeds the record ceiling ${cfg.recordCeiling}.`);
  }
  if (kind === "crm_sync" && !r.destinations.includes("ghl_buildghana_subaccount")) issues.push("Recipe destinations do not include the BuildGhana GHL sub-account.");
  return issues;
}
