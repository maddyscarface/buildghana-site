#!/usr/bin/env node
/**
 * End-to-end sandbox smoke test for the Ghana Build Readiness Review.
 * Usage: node scripts/smoke-readiness.mjs https://buildghana-staging.vercel.app
 * Requires mock payments to be available (non-production deployment, no live keys).
 * Note: on Vercel without Upstash, case state is per-instance memory; a cold start between
 * steps can lose the case. The script reports that clearly rather than hiding it.
 */
import { randomUUID } from "node:crypto";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const jar = { ua: "bga-smoke/1.0" };
const log = (step, ok, extra = "") => console.log(`${ok ? "PASS" : "FAIL"}  ${step}${extra ? "  " + extra : ""}`);
async function call(path, init = {}) {
  const r = await fetch(base + path, { ...init, headers: { "content-type": "application/json", "user-agent": jar.ua, ...(init.headers || {}) } });
  const text = await r.text();
  let j; try { j = JSON.parse(text); } catch { j = { raw: text.slice(0, 200) }; }
  return { status: r.status, j };
}

const docKeys = ["indenture", "title_certificate", "site_plan", "cadastral_plan", "allocation_letter", "search_report", "permits", "drawings", "other"];
const intake = {
  submission_id: randomUUID(),
  form_started_at: Date.now() - 60_000,
  company_website: "",
  first_name: "Sandbox", last_name: "Tester", email: `sandbox+${Date.now()}@example.com`, phone: "+1 617 555 0100",
  whatsapp_same: true, current_country: "US", preferred_contact: "email", time_zone: "America/New_York",
  ghana_region: "Greater Accra", district: "Adentan Municipal", locality: "Oyibi", gps: "GZ-123-4567", map_lat: 5.79, map_lng: -0.12,
  plot_number: "7", land_area: "100x70", area_unit: "sq_ft", access: "road", land_controller: "me", acquired: "yes",
  site_contact_name: "", site_contact_phone: "", site_contact_relationship: "",
  intended_use: "single_family", use_other: "", floor_area: "250 m2", units: "1", floors: "2", finish: "standard", description: "Smoke test — please ignore.",
  budget_band: "100k_200k", budget_currency: "USD", funds: "available", land_included: false, target_start: "2027-03", design_status: "concept", add_ons: ["title_verification"],
  concerns: "",
  inventory: Object.fromEntries(docKeys.map((k, i) => [k, i % 3 === 0 ? "available" : i % 3 === 1 ? "missing" : "uncertain"])),
  consent_authority: true, consent_privacy: true, consent_scope: true, consent_marketing: false, consent_site_contact: false, ads_consent: false,
  attribution: { utm_source: "smoke", utm_medium: "test" }, page_url: `${base}/ghana-build-readiness-review/start`,
};

let failed = 0;
const must = (step, cond, extra) => { log(step, cond, extra); if (!cond) { failed++; } return cond; };

const price = await call("/api/readiness/price");
must("price endpoint", price.status === 200, JSON.stringify(price.j));

const noConsent = await call("/api/readiness/intake", { method: "POST", body: JSON.stringify({ ...intake, submission_id: randomUUID(), consent_scope: false }) });
must("intake refused without scope consent", noConsent.status === 422, `${noConsent.status}`);

const a = await call("/api/readiness/intake", { method: "POST", body: JSON.stringify(intake) });
if (!must("intake submitted", a.status === 200 && a.j.ok, `${a.status} ${JSON.stringify(a.j).slice(0, 160)}`)) process.exit(1);
const { caseId, token } = a.j;

const dup = await call("/api/readiness/intake", { method: "POST", body: JSON.stringify(intake) });
must("intake idempotent on resubmit", dup.status === 200 && dup.j.caseId === caseId && dup.j.duplicate === true, `${dup.status}`);

const v = await call(`/api/readiness/case/${caseId}?t=${token}`);
must("case readable with token", v.status === 200 && v.j.case?.status === "awaiting_payment", v.j.case?.status);
const bad = await call(`/api/readiness/case/${caseId}?t=wrongtoken123`);
must("case hidden without valid token", bad.status === 404);

const early = await call(`/api/readiness/case/${caseId}/uploads`, { method: "POST", body: JSON.stringify({ token, doc_key: "indenture", filename: "a.pdf", content_type: "application/pdf", size: 1000 }) });
must("upload URL available from intake (missing docs can follow)", early.status === 200 && early.j.ok, `${early.status}`);
const noTok = await call(`/api/readiness/case/${caseId}/uploads`, { method: "POST", body: JSON.stringify({ token: "nope-nope-nope", doc_key: "indenture", filename: "a.pdf", content_type: "application/pdf", size: 1000 }) });
must("upload refused without case token", noTok.status === 404 || noTok.status === 400, `${noTok.status}`);
const adminNoAuth = await call("/api/admin/readiness");
must("admin API refuses anonymous requests", adminNoAuth.status === 401 || adminNoAuth.status === 404, `${adminNoAuth.status}`);

const co = await call("/api/readiness/checkout", { method: "POST", body: JSON.stringify({ case_id: caseId, token, provider: "paystack" }) });
if (!must("checkout started (sandbox)", co.status === 200 && co.j.ok && co.j.sandbox === true, `${co.status} ${JSON.stringify(co.j).slice(0, 200)}`)) process.exit(1);
const session = new URL(co.j.url, base).searchParams.get("session");

const forged = await call("/api/readiness/webhooks/paystack", { method: "POST", body: JSON.stringify({ event: "charge.success", data: { reference: session } }), headers: { "x-paystack-signature": "deadbeef" } });
must("forged webhook rejected", forged.status === 400 || forged.status === 401 || forged.status === 503, `${forged.status}`);

const pay = await call("/api/readiness/sandbox/complete", { method: "POST", body: JSON.stringify({ session, outcome: "paid" }) });
must("sandbox payment processed via signed webhook", pay.status === 200 && pay.j.ok !== false, `${pay.status} ${JSON.stringify(pay.j).slice(0, 160)}`);

const v2 = await call(`/api/readiness/case/${caseId}?t=${token}`);
must("case paid", v2.j.case?.paymentStatus === "paid" && v2.j.case?.status === "paid", `${v2.j.case?.paymentStatus}/${v2.j.case?.status}`);

// Minimal valid PDF bytes
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const up = await call(`/api/readiness/case/${caseId}/uploads`, { method: "POST", body: JSON.stringify({ token, doc_key: "indenture", filename: "indenture.pdf", content_type: "application/pdf", size: pdf.length }) });
if (must("upload URL signed", up.status === 200 && up.j.ok, `${up.status} ${JSON.stringify(up.j).slice(0, 160)}`)) {
  const put = await fetch(new URL(up.j.upload.url, base), { method: "PUT", body: pdf, headers: up.j.upload.headers });
  must("file PUT to signed URL", put.ok, `${put.status}`);
  const conf = await call(`/api/readiness/case/${caseId}/uploads/${up.j.docId}`, { method: "POST", body: JSON.stringify({ token }) });
  must("upload confirmed (type sniffed)", conf.status === 200 && conf.j.ok, `${conf.status} ${JSON.stringify(conf.j).slice(0, 120)}`);
  const getUrl = new URL(up.j.upload.url, base); getUrl.searchParams.delete("sig");
  const leak = await fetch(getUrl.toString().replace(/\?.*$/, "?key=" + encodeURIComponent(getUrl.searchParams.get("key") || "")));
  must("private file not readable without a valid signature", leak.status === 403 || leak.status === 404, `${leak.status}`);
  const badUp = await call(`/api/readiness/case/${caseId}/uploads`, { method: "POST", body: JSON.stringify({ token, doc_key: "other", filename: "x.exe", content_type: "application/x-msdownload", size: 100 }) });
  must("disallowed file type refused", badUp.status === 415, `${badUp.status}`);
}

const replay = await call("/api/readiness/sandbox/complete", { method: "POST", body: JSON.stringify({ session, outcome: "paid" }) });
must("repeat payment does not double-count", replay.status === 200 || replay.status === 409, `${replay.status} ${JSON.stringify(replay.j).slice(0, 120)}`);

const v3 = await call(`/api/readiness/case/${caseId}?t=${token}`);
must("case state after payment + upload", v3.j.case?.status === "paid" && v3.j.case?.inventory?.indenture === "available", `${v3.j.case?.status}, docs=${v3.j.case?.documents?.length}`);
const early_report = await fetch(`${base}/api/readiness/case/${caseId}/report?t=${token}`);
must("report not downloadable before delivery", early_report.status === 409, `${early_report.status}`);

// Optional: full operations pass (needs ADMIN_TOKEN on the target and SMOKE_ADMIN_TOKEN locally)
const adminTok = process.env.SMOKE_ADMIN_TOKEN;
if (adminTok) {
  const A = (path, init = {}) => call(path, { ...init, headers: { authorization: `Bearer ${adminTok}` } });
  const act = (body) => A(`/api/admin/readiness/${caseId}`, { method: "PATCH", body: JSON.stringify(body) });
  const s1 = await A("/api/admin/settings", { method: "PUT", body: JSON.stringify({ fx: { usdToGhs: 15.5, source: "Smoke test rate (not real)", date: "2026-11-12" } }) });
  must("admin: FX set", s1.status === 200, `${s1.status}`);
  must("admin: schedule visit", (await act({ type: "site_schedule", scheduledFor: new Date(Date.now() + 864e5).toISOString(), inspector: "Smoke Inspector" })).status === 200);
  must("admin: visit can't be completed undocumented", (await act({ type: "status", to: "site_visit_completed" })).status === 409);
  must("admin: record visit", (await act({ type: "site_record", completedAt: new Date().toISOString(), completedBy: "Smoke Inspector", checklist: { access: "Road", boundaries: "Pillars seen", slope_drainage: "Flat", neighbours: "Homes", utilities: "Power nearby" } })).status === 200);
  must("admin: → site_visit_completed", (await act({ type: "status", to: "site_visit_completed" })).status === 200);
  must("admin: → documents_under_review", (await act({ type: "status", to: "documents_under_review" })).status === 200);
  must("admin: permit item", (await act({ type: "permit_upsert", item: { item: "Building permit", authority: "Adentan Municipal Assembly", status: "required", lastChecked: "2026-11-12" } })).status === 200);
  must("admin: cost range", (await act({ type: "cost", ghs: { low: 1500000, base: 1900000, high: 2400000 }, assumptions: "Smoke test numbers — not real.", confidence: "low" })).status === 200);
  must("admin: → report_drafting", (await act({ type: "status", to: "report_drafting" })).status === 200);
  must("admin: recommendation", (await act({ type: "recommendation", decision: "proceed_after_conditions", rationale: "Smoke test recommendation." })).status === 200);
  must("admin: QA blocked until title settled", (await act({ type: "status", to: "internal_qa" })).status === 409);
  must("admin: title not commissioned", (await act({ type: "title", to: "not_commissioned" })).status === 200);
  must("admin: → internal_qa", (await act({ type: "status", to: "internal_qa" })).status === 200);
  must("admin: delivery blocked until approved", (await act({ type: "deliver" })).status === 409);
  must("admin: approve", (await act({ type: "approve", reviewer: "Smoke QA" })).status === 200);
  must("admin: deliver", (await act({ type: "deliver" })).status === 200);
  const rep = await fetch(`${base}/api/readiness/case/${caseId}/report?t=${token}`);
  const head = Buffer.from(await rep.arrayBuffer()).subarray(0, 5).toString();
  must("client downloads final PDF", rep.status === 200 && head === "%PDF-", `${rep.status} ${head}`);
  const ack = await call(`/api/readiness/case/${caseId}`, { method: "POST", body: JSON.stringify({ token, action: "acknowledge" }) });
  must("client acknowledges report", ack.status === 200 && ack.j.ok, `${ack.status}`);
  const repNoTok = await fetch(`${base}/api/readiness/case/${caseId}/report?t=bad-token-123`);
  must("report hidden without token", repNoTok.status === 404, `${repNoTok.status}`);
}
console.log(`\nCase page: ${base}/ghana-build-readiness-review/case/${caseId}?t=${token}`);
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
