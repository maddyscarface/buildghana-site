import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomUUID } from "node:crypto";
import { sellerSchema, buyerSchema } from "@/lib/property/schema";
import { normalizePhone, submitSeller, submitBuyer, transition, recordAuthorization, runMatching, reviewMatch, approveIntroduction, setLegalState, deleteRecordData, staffView } from "@/lib/property/service";
import { evaluateMatch, isMatchable } from "@/lib/property/matching";
import * as db from "@/lib/property/store";
import { safePropertyParams } from "@/lib/client/analytics";
import { resolveStaffRole } from "@/lib/readiness/secrets";
import { titleBand } from "@/lib/readiness/model";
import { requireStaff } from "@/lib/property/http";

const ctx = { ip: "203.0.113.9", userAgent: "vitest" };
const started = () => Date.now() - 60_000;
const contact = (o: Record<string, unknown> = {}) => ({
  first_name: "Ama", last_name: "Mensah", email: `ama+${randomUUID().slice(0, 6)}@example.com`, phone: "024 123 4567",
  preferred_contact: "whatsapp", residence_country: "GH", language: "en", consent_contact: true, consent_marketing: false, ads_consent: false,
  attribution: {}, form_started_at: started(), company_website: "", ...o,
});
const seller = (o: Record<string, unknown> = {}) => ({
  submission_id: randomUUID(), ...contact(), seller_role: "owner", region: "Greater Accra", district: "Ga East", town: "Dome",
  ghana_post_gps: "GA-183-8164", location_notes: "Behind the blue church", size_value: 1, size_unit: "plots", property_kind: "land", property_use: "residential",
  occupancy: "vacant", asking_price: 40000, currency: "USD", negotiability: "negotiable", title_self_report: "indenture_unregistered",
  planning_status: "site_plan", encumbrance: "none_known", document_inventory: ["indenture", "site_plan"], inspection: "anytime", representation: "nonexclusive", ...o,
});
const buyer = (o: Record<string, unknown> = {}) => ({
  submission_id: randomUUID(), ...contact({ residence_country: "US", phone: "+1 617 555 0100", email: `kofi+${randomUUID().slice(0, 6)}@example.com`, first_name: "Kofi" }),
  buyer_role: "individual", eligibility: "ghanaian_citizen", regions: ["Greater Accra"], property_kinds: ["land"], property_use: "residential",
  size_min: 0.5, size_max: 2, size_unit: "plots", budget_min: 20000, budget_max: 50000, currency: "USD", timeline: "3_6", intended_use: "own_home",
  tenure: "leasehold_ok", site_visit: "representative", counsel: "have_counsel", ...o,
});

beforeEach(() => { delete process.env.VERCEL_ENV; process.env.ADMIN_TOKEN = "admin-token-0123456789"; });

describe("property forms validation (local + international)", () => {
  it("accepts Ghana local, +233, US and UK phone formats", () => {
    for (const phone of ["024 123 4567", "+233 24 123 4567", "+1 617 555 0100", "+44 7700 900123"]) expect(sellerSchema.safeParse(seller({ phone })).success).toBe(true);
    expect(sellerSchema.safeParse(seller({ phone: "abc" })).success).toBe(false);
  });
  it("normalises Ghana local numbers to +233", () => {
    expect(normalizePhone("024 123 4567", "GH")).toBe("+233241234567");
    expect(normalizePhone("+1 617 555 0100", "US")).toMatch(/^\+1/);
  });
  it("requires consent, currency with a price, and encumbrance notes when disclosed", () => {
    expect(sellerSchema.safeParse(seller({ consent_contact: false })).success).toBe(false);
    expect(sellerSchema.safeParse(seller({ currency: "" })).success).toBe(false);
    expect(sellerSchema.safeParse(seller({ encumbrance: "yes" })).success).toBe(false);
    expect(sellerSchema.safeParse(seller({ ghana_post_gps: "not-a-code" })).success).toBe(false);
  });
  it("buyer budget min must not exceed max; GHS budgets allowed", () => {
    expect(buyerSchema.safeParse(buyer({ budget_min: 90000 })).success).toBe(false);
    expect(buyerSchema.safeParse(buyer({ currency: "GHS", budget_max: 600000, budget_min: 100000 })).success).toBe(true);
    // optional numbers left blank arrive as null from the client
    expect(buyerSchema.safeParse(buyer({ budget_min: null, size_min: null, size_max: null })).success).toBe(true);
    expect(sellerSchema.safeParse(seller({ asking_price: null, currency: "", size_value: null })).success).toBe(true);
  });
});

describe("submission handling", () => {
  it("is idempotent on retry (same submission id → one record)", async () => {
    const body = seller();
    const a = await submitSeller(body, ctx); const b = await submitSeller(body, ctx);
    expect(a.ok && b.ok).toBe(true);
    if (a.ok && b.ok) { expect(b.id).toBe(a.id); expect(b.duplicate).toBe(true); }
  });
  it("links a resubmission of the same parcel by the same owner as a duplicate (not matchable)", async () => {
    const email = `dup+${randomUUID().slice(0, 6)}@example.com`; const town = `Town${randomUUID().slice(0, 4)}`;
    const a = await submitSeller(seller({ email, town }), ctx); const b = await submitSeller(seller({ email, town }), ctx);
    if (!a.ok || !b.ok) throw new Error("submit failed");
    const rb = await db.getSeller(b.id);
    expect(rb?.dedupe.duplicateOf).toBe(a.id);
    expect(isMatchable(rb!)).toBe(false);
  });
  it("honeypot and too-fast submissions are silently dropped", async () => {
    const hp = await submitSeller(seller({ company_website: "spam.example" }), ctx);
    const fast = await submitSeller(seller({ form_started_at: Date.now() }), ctx);
    for (const r of [hp, fast]) { expect(r.ok).toBe(true); if (r.ok) expect(await db.getSeller(r.id)).toBeNull(); }
  });
  it("refuses private property data in production without durable storage", async () => {
    process.env.VERCEL_ENV = "production"; process.env.LEAD_ALLOW_MEMORY_STORE = "1";
    const r = await submitSeller(seller(), ctx);
    expect(r.ok).toBe(false); if (!r.ok) expect(r.status).toBe(503);
    delete process.env.LEAD_ALLOW_MEMORY_STORE;
  });
});

describe("matching and introduction gates", () => {
  it("withdrawn sellers are never matchable and withdrawal revokes authorisation", async () => {
    const s = await submitSeller(seller({ town: `W${randomUUID().slice(0, 4)}` }), ctx); if (!s.ok) throw new Error();
    await recordAuthorization(s.id, "admin", { shareDetailsWithMatchedBuyers: true, shareContactAfterApproval: false, publicListing: false, factualReviewDone: false, imagePermission: false, searchIndexConsent: false, evidence: "Signed form 13 Nov" });
    const r = (await db.getSeller(s.id))!;
    expect((await transition(r, "withdrawn", "admin")).ok).toBe(true);
    expect(isMatchable((await db.getSeller(s.id))!)).toBe(false);
    expect((await db.currentAuthorization(s.id))?.revokedAt).toBeTruthy();
    expect((await runMatching("seller", s.id, "admin")).ok).toBe(false);
  });

  it("hard filters: region, type, budget > 110%", async () => {
    const s = await submitSeller(seller({ town: `F${randomUUID().slice(0, 4)}` }), ctx); const b = await submitBuyer(buyer(), ctx);
    if (!s.ok || !b.ok) throw new Error();
    const p = (await db.getSeller(s.id))!; const q = (await db.getBuyer(b.id))!;
    expect(evaluateMatch(p, q, null).eligible).toBe(true);
    expect(evaluateMatch({ ...p, parcel: { ...p.parcel, region: "Volta" } }, q, null).eligible).toBe(false);
    expect(evaluateMatch({ ...p, pricing: { ...p.pricing, askingMinor: 6_000_000 } }, q, null).eligible).toBe(false);
    expect(evaluateMatch(p, q, null).blockers.join()).toMatch(/Counsel review not complete/);
  });

  it("introduction requires admin, review, seller authorisation and seller approval; counsel flag blocks", async () => {
    const s = await submitSeller(seller({ town: `I${randomUUID().slice(0, 4)}`, region: "Oti" }), ctx); const b = await submitBuyer(buyer({ regions: ["Oti"] }), ctx);
    if (!s.ok || !b.ok) throw new Error();
    const run = await runMatching("seller", s.id, "admin"); expect(run.ok).toBe(true);
    const m = (await db.listMatches()).find((x) => x.propertyId === s.id && x.buyerId === b.id)!;
    expect(m.status).toBe("suggested");
    expect((await approveIntroduction(m.id, "admin")).ok).toBe(false); // not reviewed
    expect((await reviewMatch(m.id, "reviewed", "reviewer")).ok).toBe(true);
    expect((await approveIntroduction(m.id, "reviewer")).ok).toBe(false); // wrong role
    const noAuth = await approveIntroduction(m.id, "admin"); expect(noAuth.ok).toBe(false); expect(noAuth.ok ? "" : noAuth.error).toMatch(/authorisation/);
    // seller can't be approved for introduction without authorisation
    let sr = (await db.getSeller(s.id))!;
    for (const to of ["contact_verified", "reviewed"] as const) { expect((await transition(sr, to, "admin")).ok).toBe(true); sr = (await db.getSeller(s.id))!; }
    expect((await transition(sr, "approved_for_introduction", "admin")).ok).toBe(false);
    expect((await recordAuthorization(s.id, "reviewer", { shareDetailsWithMatchedBuyers: true, shareContactAfterApproval: true, publicListing: false, factualReviewDone: false, imagePermission: false, searchIndexConsent: false, evidence: "Signed form" })).ok).toBe(false);
    await recordAuthorization(s.id, "admin", { shareDetailsWithMatchedBuyers: true, shareContactAfterApproval: true, publicListing: false, factualReviewDone: false, imagePermission: false, searchIndexConsent: false, evidence: "Signed form 13 Nov" });
    sr = (await db.getSeller(s.id))!; expect((await transition(sr, "approved_for_introduction", "admin")).ok).toBe(true);
    let br = (await db.getBuyer(b.id))!; for (const to of ["contact_verified", "reviewed"] as const) { await transition(br, to, "admin"); br = (await db.getBuyer(b.id))!; }
    // counsel flag blocks
    sr = (await db.getSeller(s.id))!; await setLegalState(sr, "counsel_flagged", "legal_reviewer");
    expect((await approveIntroduction(m.id, "admin")).ok).toBe(false);
    sr = (await db.getSeller(s.id))!; await setLegalState(sr, "counsel_cleared_with_qualifications", "legal_reviewer");
    const ok = await approveIntroduction(m.id, "admin"); expect(ok.ok).toBe(true);
    expect((await db.getMatch(m.id))?.status).toBe("introduction_approved");
    expect((await db.getSeller(s.id))?.status).toBe("introduction_authorized");
  });
});

describe("privacy", () => {
  it("public listing needs factual review + image permission; index consent only with public listing", async () => {
    const s = await submitSeller(seller({ town: `P${randomUUID().slice(0, 4)}` }), ctx); if (!s.ok) throw new Error();
    await recordAuthorization(s.id, "admin", { shareDetailsWithMatchedBuyers: true, shareContactAfterApproval: false, publicListing: true, factualReviewDone: false, imagePermission: true, searchIndexConsent: true, evidence: "Signed form" });
    const a = await db.currentAuthorization(s.id);
    expect(a?.publicListing).toBe(false); expect(a?.searchIndexConsent).toBe(false);
  });
  it("public listings projection never contains GPS, directions, contact or price", async () => {
    vi.stubEnv("NEXT_PUBLIC_PROPERTY_OPPORTUNITIES_MODE", "listings");
    const s = await submitSeller(seller({ town: `L${randomUUID().slice(0, 4)}` }), ctx); if (!s.ok) throw new Error();
    await recordAuthorization(s.id, "admin", { shareDetailsWithMatchedBuyers: true, shareContactAfterApproval: false, publicListing: true, factualReviewDone: true, imagePermission: true, searchIndexConsent: false, evidence: "Signed form" });
    const { publicListings } = await import("@/lib/property/public");
    const list = await publicListings(); const json = JSON.stringify(list);
    expect(list.some((l) => l.reference.startsWith("S-"))).toBe(true);
    for (const bad of ["GA-183-8164", "blue church", "example.com", "+233", "40000", "Dome", "Ama"]) expect(json).not.toContain(bad);
    vi.unstubAllEnvs();
  });
  it("reviewers never see exact location; legal reviewers never see contact details", async () => {
    const s = await submitSeller(seller({ town: `R${randomUUID().slice(0, 4)}` }), ctx); if (!s.ok) throw new Error();
    const rec = (await db.getSeller(s.id))!;
    const v = JSON.stringify(staffView(rec, "reviewer"));
    expect(v).not.toContain("GA-183-8164"); expect(v).not.toContain("blue church");
    const l = JSON.stringify(staffView(rec, "legal_reviewer"));
    expect(l).not.toContain("example.com"); expect(l).not.toContain("+233241234567");
  });
  it("data deletion scrubs personal and location data and blocks matching", async () => {
    const s = await submitSeller(seller({ town: `D${randomUUID().slice(0, 4)}` }), ctx); if (!s.ok) throw new Error();
    expect((await deleteRecordData("seller", s.id, "reviewer", "x")).ok).toBe(false);
    expect((await deleteRecordData("seller", s.id, "admin", "request")).ok).toBe(true);
    const r = JSON.stringify(await db.getSeller(s.id));
    for (const bad of ["GA-183-8164", "blue church", "Ama", "+233241234567"]) expect(r).not.toContain(bad);
  });
  it("analytics params drop location, contact, price and document keys", () => {
    const out = safePropertyParams({ form: "seller", step: 2, region: "Greater Accra", ghana_post_gps: "GA-1", email: "a@b.c", phone: "1", asking_price: 5, documents: "x", location_notes: "y" });
    expect(out).toEqual({ form: "seller", step: 2, region: "Greater Accra" });
    for (const k of ["ghana_post_gps", "email", "phone", "asking_price", "documents", "location_notes"]) expect(out).not.toHaveProperty(k);
  });
});

describe("admin access", () => {
  it("404 when ADMIN_TOKEN is not configured, 401 for wrong token, roles resolve", async () => {
    delete process.env.ADMIN_TOKEN;
    let r = await requireStaff(new Request("http://x/api/admin/property"));
    expect(r instanceof Response && r.status).toBe(404);
    process.env.ADMIN_TOKEN = "admin-token-0123456789"; process.env.PROPERTY_REVIEWER_TOKEN = "reviewer-token-0123456789";
    r = await requireStaff(new Request("http://x/api/admin/property", { headers: { Authorization: "Bearer wrong-token-xxxxxxxxx" } }));
    expect(r instanceof Response && r.status).toBe(401);
    expect(resolveStaffRole("Bearer admin-token-0123456789")).toBe("admin");
    expect(resolveStaffRole("Bearer reviewer-token-0123456789")).toBe("reviewer");
  });
});

describe("readiness title bands", () => {
  it("differentiates pending / verified by counsel / flagged", () => {
    expect(titleBand("unverified")).toBe("pending");
    expect(titleBand("in_progress")).toBe("pending");
    expect(titleBand("adverse_findings")).toBe("flagged");
    expect(titleBand("not_commissioned")).toBe("not_commissioned");
    expect(titleBand("verified_with_qualifications")).toBe("verified_by_counsel");
  });
});
