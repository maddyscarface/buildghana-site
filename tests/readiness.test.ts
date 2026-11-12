import { describe, it, expect, beforeAll, vi } from "vitest";
import { createHmac, randomUUID } from "node:crypto";
import { canTransition, canTitleTransition, titleStatement, transitions } from "@/lib/readiness/model";
import { verifyStripeSignature } from "@/lib/readiness/payments/stripe";
import { verifyPaystackSignature } from "@/lib/readiness/payments/paystack";
import { presign } from "@/lib/readiness/storage/s3";
import { sniffMatches, createCase, startCheckout, handlePaymentEvent, requestUpload, confirmUpload, adminAct } from "@/lib/readiness/service";
import { getCase, listRevenue } from "@/lib/readiness/store";
import { rrStageFor, opportunityStatusFor } from "@/config/ghl-pipelines";
import { syncCaseToGhl } from "@/lib/readiness/crm";
import { documentStore } from "@/lib/readiness/storage";
import { docKeys } from "@/config/readiness";
import { renderReportPdf } from "@/lib/readiness/report";

describe("case status model", () => {
  const base = { status: "awaiting_payment" as const, paymentStatus: "unpaid" as const, titleStatus: "not_started" as const };
  it("blocks work stages until payment is confirmed", () => {
    expect(canTransition(base, "awaiting_documents").ok).toBe(false);
    expect(canTransition({ ...base, status: "paid", paymentStatus: "unpaid" }, "awaiting_documents").ok).toBe(false);
    expect(canTransition({ ...base, status: "paid", paymentStatus: "paid" }, "awaiting_documents").ok).toBe(true);
  });
  it("refuses undefined transitions", () => {
    expect(canTransition({ ...base, status: "intake_submitted" }, "delivered").ok).toBe(false);
  });
  it("cannot finalise a report until title is settled", () => {
    const c = { status: "report_drafting" as const, paymentStatus: "paid" as const, titleStatus: "counsel_in_progress" as const };
    expect(canTransition(c, "report_ready").ok).toBe(false);
    expect(canTransition({ ...c, titleStatus: "counsel_signed_off" }, "report_ready").ok).toBe(true);
    expect(canTransition({ ...c, titleStatus: "not_in_scope" }, "report_ready").ok).toBe(true);
  });
  it("every transition target is a known status", () => {
    const all = Object.keys(transitions);
    for (const targets of Object.values(transitions)) for (const t of targets) expect(all).toContain(t);
  });
  it("counsel sign-off requires firm, lawyer and reference", () => {
    expect(canTitleTransition("counsel_findings_received", "counsel_signed_off", { firm: "X" }).ok).toBe(false);
    expect(canTitleTransition("counsel_findings_received", "counsel_signed_off", { firm: "X & Co", lawyer: "A. Mensah", reference: "REF-1" }).ok).toBe(true);
  });
  it("title statement never claims verification before counsel signs off", () => {
    expect(titleStatement({ titleStatus: "counsel_in_progress" })).toMatch(/Nothing in this draft is a title opinion/);
    expect(titleStatement({ titleStatus: "unable_to_verify" })).toMatch(/Do not treat the land as verified/);
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
  it("maps case states to pipeline stages", () => {
    expect(rrStageFor("awaiting_payment")).toBe("awaiting_payment");
    expect(rrStageFor("delivered")).toBe("delivered");
    expect(opportunityStatusFor("delivered")).toBe("won");
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
    current_country: "US", ghana_region: "Greater Accra", ghana_city: "Tema", land_size: "",
    acquisition: "family", title_status: "indenture_only", intended_use: "family_home", project_stage: "land_only",
    budget_range: "100k_200k", start_timeline: "6_12m", ground_support: [], focus: ["title"], concerns: "",
    inventory: Object.fromEntries(docKeys.map((k) => [k, "have"])), consent_terms: true, consent_data: true,
    consent_marketing: false, ads_consent: false, attribution: { utm_source: "google", gclid: "abc" },
  });

  it("rejects bots and incomplete inventories", async () => {
    const bot = await createCase({ ...intake(), company_website: "spam" }, { ip: "1.1.1.1", userAgent: "t" });
    expect(bot.ok).toBe(false);
    const partial = await createCase({ ...intake(), inventory: { indenture: "have" } }, { ip: "1.1.1.1", userAgent: "t" });
    expect(partial.ok).toBe(false);
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
    expect(c.status).toBe("awaiting_documents");
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

    const exe = await requestUpload(c, { docKey: "boq", filename: "x.exe", contentType: "application/octet-stream", size: 10 }, "client");
    expect(exe.ok).toBe(false);

    // Report can't be finalised before title is settled
    await adminAct(a.caseId, { type: "status", to: "in_review" });
    await adminAct(a.caseId, { type: "status", to: "report_drafting" });
    const blocked = await adminAct(a.caseId, { type: "status", to: "report_ready" });
    expect(blocked.ok).toBe(false);
    await adminAct(a.caseId, { type: "title", to: "not_in_scope" });
    const ready = await adminAct(a.caseId, { type: "status", to: "report_ready" });
    expect(ready.ok).toBe(true);

    const bytes = await renderReportPdf((await getCase(a.caseId))!, { final: false });
    expect(Buffer.from(bytes.slice(0, 5)).toString()).toBe("%PDF-");
  });

  it("GHL sync is a logged no-op without credentials", async () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    const c = { id: randomUUID(), status: "paid", contact: { email: "x@example.com", firstName: "X", lastName: "Y", phone: "+1 555 555 5555" } } as never;
    const r = await syncCaseToGhl(c);
    expect(r.status).toBe("skipped");
    spy.mockRestore();
  });
});
