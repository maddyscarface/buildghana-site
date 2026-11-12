import { describe, it, expect, beforeAll, vi } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import { canTransition, canTitleTransition, titleStatement, transitions } from "@/lib/readiness/model";
import { verifyStripeSignature } from "@/lib/readiness/payments/stripe";
import { verifyPaystackSignature } from "@/lib/readiness/payments/paystack";
import { presign } from "@/lib/readiness/storage/s3";
import { sniffMatches, createCase, startCheckout, handlePaymentEvent, requestUpload, confirmUpload, adminAct, acknowledgeReport } from "@/lib/readiness/service";
import { getCase, listRevenue } from "@/lib/readiness/store";
import { rrStageFor, opportunityStatusFor } from "@/config/ghl-pipelines";
import { syncCaseToGhl } from "@/lib/readiness/crm";
import { documentStore } from "@/lib/readiness/storage";
import { docKeys } from "@/config/readiness";
import { renderReportPdf } from "@/lib/readiness/report";

describe("case status model", () => {
  const base = { status: "awaiting_payment" as const, paymentStatus: "unpaid" as const, titleStatus: "unverified" as const };
  const visit = { completedAt: "2026-11-01T10:00:00Z", completedBy: "K. Owusu", checklist: { access: "a", boundaries: "b", slope_drainage: "c", neighbours: "d", utilities: "e" } };
  it("blocks work stages until payment is confirmed", () => {
    expect(canTransition(base, "scheduling").ok).toBe(false);
    expect(canTransition({ ...base, status: "paid", paymentStatus: "unpaid" }, "scheduling").ok).toBe(false);
    expect(canTransition({ ...base, status: "paid", paymentStatus: "paid" }, "scheduling").ok).toBe(true);
  });
  it("refuses undefined transitions", () => {
    expect(canTransition(base, "delivered").ok).toBe(false);
  });
  it("only a documented visit can be marked site_visit_completed", () => {
    const c = { status: "scheduling" as const, paymentStatus: "paid" as const, titleStatus: "unverified" as const };
    expect(canTransition(c, "site_visit_completed").ok).toBe(false);
    expect(canTransition({ ...c, siteVisit: { checklist: { access: "ok" }, completedAt: visit.completedAt, completedBy: "X" } }, "site_visit_completed").ok).toBe(false);
    expect(canTransition({ ...c, siteVisit: visit }, "site_visit_completed").ok).toBe(true);
  });
  it("internal QA needs site visit, a title outcome and a recommendation; delivery needs human approval", () => {
    const rec = { decision: "proceed" as const, rationale: "ok because", draftedAt: "x" };
    const c = { status: "report_drafting" as const, paymentStatus: "paid" as const, titleStatus: "in_progress" as const, siteVisit: visit, recommendation: rec };
    expect(canTransition(c, "internal_qa").ok).toBe(false);
    expect(canTransition({ ...c, titleStatus: "adverse_findings" }, "internal_qa").ok).toBe(true);
    expect(canTransition({ ...c, titleStatus: "not_commissioned", siteVisit: { checklist: {} } }, "internal_qa").ok).toBe(false);
    const qa = { ...c, status: "internal_qa" as const, titleStatus: "not_commissioned" as const };
    expect(canTransition(qa, "delivered").ok).toBe(false);
    expect(canTransition({ ...qa, recommendation: { ...rec, approvedBy: "QA Lead", approvedAt: "y" } }, "delivered").ok).toBe(true);
  });
  it("every transition target is a known status", () => {
    const all = Object.keys(transitions);
    for (const targets of Object.values(transitions)) for (const t of targets) expect(all).toContain(t);
  });
  it("counsel outcomes require firm, lawyer and reference", () => {
    expect(canTitleTransition("unverified", "in_progress", {}).ok).toBe(false);
    expect(canTitleTransition("unverified", "in_progress", { firm: "X & Co" }).ok).toBe(true);
    expect(canTitleTransition("in_progress", "verified_with_qualifications", { firm: "X" }).ok).toBe(false);
    expect(canTitleTransition("in_progress", "verified_with_qualifications", { firm: "X & Co", lawyer: "A. Mensah", reference: "REF-1" }).ok).toBe(true);
    expect(canTitleTransition("unverified", "verified_with_qualifications", { firm: "X & Co", lawyer: "A. Mensah", reference: "REF-1" }).ok).toBe(false);
  });
  it("title statement never claims verification without counsel", () => {
    expect(titleStatement({ titleStatus: "in_progress" })).toMatch(/Nothing in this draft is a title opinion/);
    expect(titleStatement({ titleStatus: "unverified" })).toMatch(/Uploading documents does not verify title/);
    expect(titleStatement({ titleStatus: "unable_to_determine", counsel: { firm: "F", lawyer: "L", reference: "R" } })).toMatch(/Do not treat the land as verified/);
  });
});

describe("webhook signatures", () => {
  const body = JSON.stringify({ id: "evt_1", type: "checkout.session.completed" });
  it("accepts a valid Stripe signature and rejects tampering/staleness", () => {
    const t = 1_700_000_000;
    const v1 = createHmac("sha256", "whsec_test").update(`${t}.${body}`).digest("hex");
    expect(verifyStripeSignature(body, `t=${t},v1=${v1}`, "whsec_test", t + 10)).toBe(true);
    expect(verifyStripeSignature(body + " ", `t=${t},v1=${v1}`, "whsec_test", t + 10)).toBe(false);
    expect(verifyStripeSignature(body, `t=${t},v1=${v1}`, "whsec_test", t + 10_000)).toBe(false);
    expect(verifyStripeSignature(body, null, "whsec_test", t)).toBe(false);
  });
  it("accepts a valid Paystack signature and rejects others", () => {
    const sig = createHmac("sha512", "sk_test").update(body).digest("hex");
    expect(verifyPaystackSignature(body, sig, "sk_test")).toBe(true);
    expect(verifyPaystackSignature(body, sig, "sk_other")).toBe(false);
    expect(verifyPaystackSignature(body, null, "sk_test")).toBe(false);
  });
});

describe("S3/R2 presign", () => {
  it("produces a SigV4 URL with expiry and signature", () => {
    const url = presign({ method: "PUT", key: "cases/abc/doc 1.pdf", ttlSec: 600, now: new Date("2026-01-02T03:04:05Z") },
      { bucket: "bga-docs", region: "auto", endpoint: "https://acct.r2.cloudflarestorage.com", keyId: "AKID", secret: "SECRET" } as never);
    const u = new URL(url);
    expect(u.pathname).toBe("/bga-docs/cases/abc/doc%201.pdf");
    expect(u.searchParams.get("X-Amz-Algorithm")).toBe("AWS4-HMAC-SHA256");
    expect(u.searchParams.get("X-Amz-Credential")).toBe("AKID/20260102/auto/s3/aws4_request");
    expect(u.searchParams.get("X-Amz-Date")).toBe("20260102T030405Z");
    expect(u.searchParams.get("X-Amz-Expires")).toBe("600");
    expect(u.searchParams.get("X-Amz-Signature")).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("production guard", () => {
  it("refuses intake on production without secrets + durable storage", async () => {
    const prev = process.env.VERCEL_ENV; process.env.VERCEL_ENV = "production";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const r = await createCase({}, { ip: "1.1.1.1", userAgent: "t" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(503);
    process.env.VERCEL_ENV = prev;
  });
});

describe("file type sniffing", () => {
  it("matches magic bytes to declared type", () => {
    expect(sniffMatches(new Uint8Array(Buffer.from("%PDF-1.7 ...")), "application/pdf")).toBe(true);
    expect(sniffMatches(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]), "image/jpeg")).toBe(true);
    expect(sniffMatches(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBe(true);
    expect(sniffMatches(new Uint8Array(Buffer.from("MZ\x90\x00")), "application/pdf")).toBe(false);
  });
});

describe("GHL stage mapping & no-op", () => {
  it("maps case states to the spec pipeline", () => {
    expect(rrStageFor({ status: "awaiting_payment" })).toBe("payment_pending");
    expect(rrStageFor({ status: "paid" })).toBe("paid_review");
    expect(rrStageFor({ status: "needs_more_documents" })).toBe("documents_incomplete");
    expect(rrStageFor({ status: "scheduling", siteScheduled: true })).toBe("site_visit_scheduled");
    expect(rrStageFor({ status: "legal_title_check_pending" })).toBe("legal_title_check");
    expect(rrStageFor({ status: "delivered" })).toBe("report_delivered");
    expect(rrStageFor({ status: "delivered", engagement: "won" })).toBe("won");
    expect(opportunityStatusFor("report_delivered")).toBe("open");
    expect(opportunityStatusFor("won")).toBe("won");
  });
});

describe("readiness flow (sandbox)", () => {
  beforeAll(() => {
    delete process.env.STRIPE_SECRET_KEY; delete process.env.PAYSTACK_SECRET_KEY; delete process.env.GHL_API_KEY; delete process.env.GHL_PRIVATE_TOKEN;
    process.env.DOCS_LOCAL_DIR = `/tmp/bga-test-${randomUUID()}`;
  });
  const intake = () => ({
    submission_id: randomUUID(), form_started_at: Date.now() - 60_000, company_website: "",
    first_name: "Ama", last_name: "Test", email: "ama@example.com", phone: "+1 617 555 0100", whatsapp_same: true,
    current_country: "US", preferred_contact: "whatsapp", time_zone: "America/New_York",
    ghana_region: "Greater Accra", district: "Tema Metropolitan", locality: "Community 25", gps: "GT-123-4567", map_lat: 5.7, map_lng: -0.03,
    plot_number: "12", land_area: "1", area_unit: "plots", access: "road", land_controller: "me", acquired: "yes",
    site_contact_name: "Kofi", site_contact_phone: "+233 24 000 0000", site_contact_relationship: "brother",
    intended_use: "single_family", floor_area: "250 m2", units: "1", floors: "2", finish: "standard", description: "4-bed",
    budget_band: "100k_200k", budget_currency: "USD", funds: "available", land_included: false, target_start: "2027-03", design_status: "concept", add_ons: ["title_verification"],
    inventory: Object.fromEntries(docKeys.map((k, i) => [k, i % 3 === 0 ? "available" : i % 3 === 1 ? "missing" : "uncertain"])),
    consent_authority: true, consent_privacy: true, consent_scope: true, consent_site_contact: true,
    consent_marketing: false, ads_consent: false, attribution: { utm_source: "google", gclid: "abc" },
  });

  it("rejects bots and incomplete inventories", async () => {
    const bot = await createCase({ ...intake(), company_website: "spam" }, { ip: "1.1.1.1", userAgent: "t" });
    expect(bot.ok).toBe(false);
    const partial = await createCase({ ...intake(), inventory: { indenture: "available" } }, { ip: "1.1.1.1", userAgent: "t" });
    expect(partial.ok).toBe(false);
    const noConsent = await createCase({ ...intake(), consent_scope: false }, { ip: "1.1.1.1", userAgent: "t" });
    expect(noConsent.ok).toBe(false);
    const siteNoConsent = await createCase({ ...intake(), consent_site_contact: false }, { ip: "1.1.1.1", userAgent: "t" });
    expect(siteNoConsent.ok).toBe(false);
  });

  it("intake → sandbox checkout → idempotent payment → upload → gated report", async () => {
    const data = intake();
    const a = await createCase(data, { ip: "1.1.1.1", userAgent: "t" });
    expect(a.ok).toBe(true);
    if (!a.ok) return;
    const again = await createCase(data, { ip: "1.1.1.1", userAgent: "t" });
    expect(again.ok && again.duplicate && again.caseId === a.caseId).toBe(true);

    const co = await startCheckout(a.caseId, "stripe", "http://localhost", a.token);
    expect(co.ok).toBe(true);
    const c1 = (await getCase(a.caseId))!;
    expect(c1.sandbox).toBe(true);
    const ev = { provider: "mock" as const, eventId: "evt_test_1", type: "paid" as const, sessionId: c1.payment!.sessionId!, caseId: a.caseId, amountMinor: c1.payment!.amountMinor, currency: c1.payment!.currency, sandbox: false /* mock provider must still be treated as sandbox */ };
    const p1 = await handlePaymentEvent(ev);
    const p2 = await handlePaymentEvent(ev);
    expect(p1.ok).toBe(true);
    expect(p2.ok).toBe(true);
    const revenue = (await listRevenue()).filter((r) => r.caseId === a.caseId);
    expect(revenue).toHaveLength(1);
    expect(revenue[0].sandbox).toBe(true);
    expect(revenue[0].stream).toBe("readiness_review");

    const wrongAmount = await handlePaymentEvent({ ...ev, eventId: "evt_test_2", amountMinor: 1 });
    expect((await getCase(a.caseId))!.paymentStatus).toBe("paid");
    void wrongAmount;

    let c = (await getCase(a.caseId))!;
    expect(c.status).toBe("paid");
    expect(c.caseNumber).toMatch(/^BGR-\d{4}-[0-9A-F]{6}$/);
    const pdf = new Uint8Array(Buffer.from("%PDF-1.4\n%%EOF"));
    const up = await requestUpload(c, { docKey: "indenture", filename: "indenture.pdf", contentType: "application/pdf", size: pdf.length }, "client");
    expect(up.ok).toBe(true);
    if (!up.ok) return;
    const store = documentStore();
    const key = (await getCase(a.caseId))!.documents.find((d) => d.id === up.docId)!.storageKey;
    await store.put(key, pdf, "application/pdf");
    c = (await getCase(a.caseId))!;
    const conf = await confirmUpload(c, up.docId, "client");
    expect(conf.ok).toBe(true);
    expect((await getCase(a.caseId))!.titleStatus).toBe("unverified"); // upload ≠ verified title

    const exe = await requestUpload(c, { docKey: "other", filename: "x.exe", contentType: "application/octet-stream", size: 10 }, "client");
    expect(exe.ok).toBe(false);

    // Operations: schedule → documented visit → review → counsel → report gating
    expect((await adminAct(a.caseId, { type: "site_schedule", scheduledFor: new Date(Date.now() + 86400e3).toISOString(), inspector: "K. Owusu" })).ok).toBe(true);
    expect((await getCase(a.caseId))!.status).toBe("scheduling");
    expect((await adminAct(a.caseId, { type: "status", to: "site_visit_completed" })).ok).toBe(false);
    expect((await adminAct(a.caseId, { type: "site_record", completedAt: new Date(Date.now() + 86400e3).toISOString(), completedBy: "K", checklist: { access: "x" } })).ok).toBe(false);
    expect((await adminAct(a.caseId, { type: "site_record", completedAt: new Date().toISOString(), completedBy: "K. Owusu", checklist: { access: "Road", boundaries: "4 pillars", slope_drainage: "Gentle", neighbours: "Residential", utilities: "ECG pole 30m" } })).ok).toBe(true);
    expect((await adminAct(a.caseId, { type: "status", to: "site_visit_completed" })).ok).toBe(true);
    await adminAct(a.caseId, { type: "status", to: "documents_under_review" });
    await adminAct(a.caseId, { type: "permit_upsert", item: { item: "Building permit", authority: "Tema Metropolitan Assembly", status: "required", lastChecked: "2026-11-12" } });
    expect((await adminAct(a.caseId, { type: "cost", ghs: { low: 1, base: 2, high: 3 }, assumptions: "x", confidence: "low" })).ok).toBe(false); // no FX set
    await adminAct(a.caseId, { type: "status", to: "report_drafting" });
    await adminAct(a.caseId, { type: "recommendation", decision: "proceed_after_conditions", rationale: "Title search outstanding." });
    expect((await adminAct(a.caseId, { type: "status", to: "internal_qa" })).ok).toBe(false); // title not settled
    expect((await adminAct(a.caseId, { type: "title", to: "in_progress", counsel: { firm: "Counsel & Co" } })).ok).toBe(true);
    expect((await adminAct(a.caseId, { type: "title", to: "adverse_findings", counsel: { firm: "Counsel & Co" } })).ok).toBe(false);
    expect((await adminAct(a.caseId, { type: "title", to: "adverse_findings", counsel: { lawyer: "A. Mensah", reference: "CC/1" } })).ok).toBe(true);
    expect((await adminAct(a.caseId, { type: "status", to: "internal_qa" })).ok).toBe(true);
    expect((await adminAct(a.caseId, { type: "deliver" })).ok).toBe(false); // not approved
    expect((await adminAct(a.caseId, { type: "approve", reviewer: "QA Lead" })).ok).toBe(true);
    const info = vi.spyOn(console, "info").mockImplementation(() => {});
    const del = await adminAct(a.caseId, { type: "deliver" });
    info.mockRestore();
    expect(del.ok).toBe(true);
    c = (await getCase(a.caseId))!;
    expect(c.status).toBe("delivered");
    expect(c.reports.at(-1)).toMatchObject({ final: true, version: 1 });
    expect((await acknowledgeReport(c)).ok).toBe(true);

    const bytes = await renderReportPdf(c, { final: true, version: 1 });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");

    // Refund reverses revenue in the stream
    expect((await adminAct(a.caseId, { type: "refund_mark", note: "re_123 goodwill" })).ok).toBe(true);
    const net = (await listRevenue()).filter((r) => r.caseId === a.caseId).reduce((t, r) => t + r.amountMinor, 0);
    expect(net).toBe(0);
  });

  it("failed payment keeps the case payable", async () => {
    const a = await createCase(intake(), { ip: "1.1.1.1", userAgent: "t" });
    if (!a.ok) throw new Error("intake failed");
    await startCheckout(a.caseId, "paystack", "http://localhost", a.token);
    const c = (await getCase(a.caseId))!;
    await handlePaymentEvent({ provider: "mock", eventId: `evt_fail_${a.caseId}`, type: "failed", sessionId: c.payment!.sessionId!, caseId: a.caseId, sandbox: true });
    expect((await getCase(a.caseId))!.status).toBe("payment_failed");
    expect((await startCheckout(a.caseId, "paystack", "http://localhost", a.token)).ok).toBe(true);
  });

  it("GHL sync is a logged no-op without credentials", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const c = { id: randomUUID(), caseNumber: "BGR-T", status: "paid", paymentStatus: "paid", titleStatus: "unverified", consents: {}, inventory: {}, parcel: { region: "Ashanti", acquired: "yes" }, project: { use: "single_family", budgetBand: "50k_100k", budgetCurrency: "USD", funds: "available", designStatus: "none" }, siteVisit: { checklist: {} }, contact: { email: "x@example.com", firstName: "X", lastName: "Y", phone: "+1 555 555 5555" } } as never;
    const r = await syncCaseToGhl(c);
    expect(r.status).toBe("skipped");
    spy.mockRestore();
  });
});
