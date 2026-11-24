import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { manifest, manifestSchema, manifestViolations, integrationStatuses } from "@/config/manifest";
import { isUntrackedPath, redactPath, safePagePath, safeSearch, SAFE_LOCATION_JS } from "@/lib/client/safe-path";
import { checkoutProvider } from "@/lib/readiness/payments";
import { paymentsLiveEnabled } from "@/lib/readiness/payments/types";
import { leadSchema } from "@/lib/lead/schema";
import { intakeSchema } from "@/lib/readiness/schema";
import { ownerProfiles } from "@/lib/lead/options";
import { buildCustomFields } from "@/lib/server/ghl";
import { audiences } from "@/content/home";
import { audienceSections, audienceFaqs } from "@/content/audiences";
import { routeInventory } from "@/content/seo-routes";
import { docKeys } from "@/config/readiness";
import { services } from "@/content/services";

const ROOT = path.resolve(__dirname, "..");
const MANIFEST_JSON = path.join(ROOT, "docs/blueprint/business.manifest.json");

describe("blueprint v1 — business manifest (§02)", () => {
  it("is schema-valid and has no invariant violations with default env", () => {
    expect(manifestSchema.safeParse(manifest).success).toBe(true);
    expect(manifestViolations(manifest, {})).toEqual([]);
  });
  it("covers the four BuildGhana buyer types, not a U.S.-only audience", () => {
    for (const c of ["diaspora", "returning_resident", "ghana_resident", "international_investor"]) expect(manifest.customers).toContain(c);
    expect(manifest.market.countries).toEqual(["GH"]);
  });
  it("flags violations: public listings, non-US vendor audiences, unknown public facts, live payments without a fee", () => {
    const bad = structuredClone(manifest) as unknown as Record<string, any>;
    bad.features.publicListings = true; bad.marketing.audienceData.market = "GH";
    bad.facts.push({ id: "x", path: "p", value: "v", status: "unknown", sourceIds: [], observedAt: "2026-11-24", usePolicy: "public_ok" });
    const v = manifestViolations(bad as typeof manifest, { READINESS_PAYMENTS_LIVE: "true" });
    expect(v.some((s) => s.includes("public property listings"))).toBe(true);
    expect(v.some((s) => s.includes("US-only"))).toBe(true);
    expect(v.some((s) => s.includes("fact x"))).toBe(true);
    expect(v.some((s) => s.includes("payments live"))).toBe(true);
  });
  it("derives integration state from env and never calls keys alone 'connected' for payments", () => {
    const prod = integrationStatuses({ VERCEL_ENV: "production" });
    expect(prod.ghl).toBe("not_configured"); expect(prod.payments).toBe("not_configured"); expect(prod.datamoon).toBe("mock_verified");
    expect(integrationStatuses({ VERCEL_ENV: "production", STRIPE_SECRET_KEY: "sk_x" }).payments).toBe("not_configured");
    expect(integrationStatuses({ VERCEL_ENV: "production", STRIPE_SECRET_KEY: "sk_x", READINESS_PAYMENTS_LIVE: "true" }).payments).toBe("connected");
    expect(integrationStatuses({ VERCEL_ENV: "preview" }).payments).toBe("mock_verified");
  });
  it("docs/blueprint/business.manifest.json matches the typed manifest", () => {
    const json = JSON.stringify(manifest, null, 2) + "\n";
    if (process.env.WRITE_BLUEPRINT === "1") fs.writeFileSync(MANIFEST_JSON, json);
    expect(fs.readFileSync(MANIFEST_JSON, "utf8")).toBe(json);
  });
});

describe("blueprint v1 — generated SEO artifacts (§03.6, §01.7)", () => {
  const csv = (rows: (string | number | boolean)[][]) => rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n") + "\n";
  const sitemapCsv = csv([["path", "indexable", "audience", "schema", "updated", "priority"],
    ...routeInventory.map((r) => [r.path, r.indexable, r.audience, r.schema.join(" "), r.updated, r.priority]),
    ...services.map((s) => [`/${s.slug}`, true, "service page", "WebPage Service FAQPage BreadcrumbList", "2026-11-13", 0.9])]);
  // keyword-to-page map: query_theme, intent, geography, primary_page, supporting_pages, FAQ, CTA, evidence_needed, confidence. No search volumes.
  const kwCsv = csv([["query_theme", "intent", "geography", "primary_page", "supporting_pages", "faq", "cta", "evidence_needed", "confidence"],
    ...routeInventory.filter((r) => r.indexable && r.primary !== "—").map((r) => [r.primary, r.stage, "Ghana (coverage confirmed per parcel)", r.path, r.secondary.join("; "), r.schema.includes("FAQPage") ? "yes" : "no", r.cta, "Search Console impressions/queries after launch; no third-party volumes claimed", "hypothesis"])]);
  it("docs/blueprint/sitemap.csv and keyword-page-map.csv are in sync", () => {
    const files: [string, string][] = [["sitemap.csv", sitemapCsv], ["keyword-page-map.csv", kwCsv]];
    for (const [f, body] of files) {
      const fp = path.join(ROOT, "docs/blueprint", f);
      if (process.env.WRITE_BLUEPRINT === "1") fs.writeFileSync(fp, body);
      expect(fs.readFileSync(fp, "utf8")).toBe(body);
    }
  });
});

describe("blueprint v1 — privacy-filtered analytics paths (§02.5, §03.5)", () => {
  it("drops tokens and non-attribution params, keeps UTM and click ids", () => {
    expect(safeSearch("?t=SECRET&utm_source=google&gclid=abc&email=a@b.c")).toBe("?utm_source=google&gclid=abc");
    expect(safeSearch("")).toBe("");
  });
  it("redacts case ids and never tracks admin", () => {
    const id = randomUUID();
    expect(redactPath(`/ghana-build-readiness-review/case/${id}`)).toBe("/ghana-build-readiness-review/case/[id]");
    expect(safePagePath(`/ghana-build-readiness-review/case/${id}`, "?t=tok&paid=1")).toBe("/ghana-build-readiness-review/case/[id]");
    expect(safePagePath("/who-we-serve", "?utm_campaign=x")).toBe("/who-we-serve?utm_campaign=x");
    expect(isUntrackedPath("/admin/ops")).toBe(true);
    expect(isUntrackedPath("/administer")).toBe(false);
  });
  it("inline SAFE_LOCATION_JS behaves like safePagePath", () => {
    const run = (href: string) => new Function("location", "URL", `return ${SAFE_LOCATION_JS};`)(new URL(href), URL) as string;
    const id = randomUUID();
    expect(run(`https://x.test/ghana-build-readiness-review/case/${id}?t=SECRET&utm_source=g`)).toBe("https://x.test/ghana-build-readiness-review/case/[id]?utm_source=g");
    expect(run("https://x.test/property/sell?email=a%40b.c")).toBe("https://x.test/property/sell");
  });
});

describe("blueprint v1 — payments stay behind an explicit live flag", () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; });
  it("keys alone never enable live charging", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy"; process.env.STRIPE_WEBHOOK_SECRET = "whsec_dummy"; process.env.PAYSTACK_SECRET_KEY = "sk_test_dummy"; delete process.env.READINESS_PAYMENTS_LIVE;
    expect(paymentsLiveEnabled()).toBe(false);
    expect(checkoutProvider("stripe")?.name).toBe("mock"); // non-production → sandbox only
    (process.env as Record<string, string>).VERCEL_ENV = "production";
    expect(checkoutProvider("paystack")).toBeNull();
    process.env.READINESS_PAYMENTS_LIVE = "true";
    expect(checkoutProvider("stripe")?.name).toBe("stripe");
  });
});

describe("blueprint v1 — owner profile (diaspora / returning / Ghana resident / investor)", () => {
  const lead = (over: Record<string, unknown> = {}) => ({
    submission_id: randomUUID(), funnel: "general", first_name: "Ama", last_name: "Mensah", email: "ama@example.com", current_country: "GH",
    ghana_region: "Ashanti", land_status: "owned_documented", project_stage: "planning", construction_type: "single_family", budget_range: "not_sure",
    start_timeline: "not_sure", services: ["not_sure"], consent_contact: true, form_started_at: Date.now() - 60_000, ...over,
  });
  it("is optional, validated and mapped to GHL only as a label", () => {
    expect(leadSchema.safeParse(lead()).success).toBe(true);
    expect(leadSchema.safeParse(lead({ owner_profile: "" })).success).toBe(true);
    expect(leadSchema.safeParse(lead({ owner_profile: "martian" })).success).toBe(false);
    const ok = leadSchema.parse(lead({ owner_profile: "returning_resident" }));
    expect(ok.owner_profile).toBe("returning_resident");
    const prev = process.env.GHL_CUSTOM_FIELD_IDS;
    process.env.GHL_CUSTOM_FIELD_IDS = JSON.stringify({ owner_profile: "cf_owner" });
    const fields = buildCustomFields(ok, { score: 1, tier: "standard", reasons: [] } as never, "id");
    process.env.GHL_CUSTOM_FIELD_IDS = prev;
    expect(JSON.stringify(fields)).toContain("Returning");
    expect(ownerProfiles.map((o) => o.value)).toEqual(["diaspora", "returning_resident", "ghana_resident", "international_investor", "other"]);
  });
  it("readiness intake accepts it as optional", () => {
    const base = {
      submission_id: randomUUID(), form_started_at: Date.now() - 60_000, first_name: "A", last_name: "B", email: "a@example.com", phone: "+233 24 000 0000",
      current_country: "GH", preferred_contact: "email", time_zone: "Africa/Accra", ghana_region: "Central", district: "Cape Coast", locality: "Abura",
      area_unit: "plots", access: "road", land_controller: "me", acquired: "yes", intended_use: "single_family", finish: "standard",
      budget_band: "100k_200k", budget_currency: "GHS", funds: "available", design_status: "concept",
      inventory: Object.fromEntries(docKeys.map((k) => [k, "missing"])), consent_authority: true, consent_privacy: true, consent_scope: true,
    };
    expect(intakeSchema.safeParse(base).success).toBe(true);
    expect(intakeSchema.safeParse({ ...base, owner_profile: "international_investor" }).success).toBe(true);
    expect(intakeSchema.safeParse({ ...base, owner_profile: "nope" }).success).toBe(false);
  });
});

describe("blueprint v1 — audience framing and content rules (§03, §05.C)", () => {
  it("home and /who-we-serve name all four buyer types", () => {
    const titles = audiences.map((a) => a.title.toLowerCase()).join("|");
    for (const t of ["living in ghana", "diaspora", "returning", "investor"]) expect(titles).toContain(t);
    expect(audienceSections.map((a) => a.id)).toEqual(["diaspora", "returning-residents", "ghana-residents", "international-investors"]);
    expect(routeInventory.find((r) => r.path === "/who-we-serve")?.indexable).toBe(true);
  });
  it("audience copy makes no price, rating, licence or guaranteed-outcome claims", () => {
    const text = JSON.stringify([audiences, audienceSections, audienceFaqs]);
    expect(text).not.toMatch(/[$₵]\s?\d|GH₵|\bstars?\b|rated|licensed|guarantee(d)? (title|approval|ownership)/i);
  });
  it("no public copy pins replies to U.S. Eastern time", () => {
    const files = ["src/app/(site)/assessment/page.tsx", "src/app/(site)/thank-you/page.tsx", "src/components/sections/Sections.tsx"];
    for (const f of files) expect(fs.readFileSync(path.join(ROOT, f), "utf8")).not.toContain("U.S. Eastern");
  });
});
