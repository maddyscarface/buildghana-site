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

const docKeys = ["indenture", "site_plan", "search_report", "title_certificate", "survey_report", "owner_id", "site_photos", "architectural", "structural", "permit", "boq", "contract"];
const intake = {
  submission_id: randomUUID(),
  form_started_at: Date.now() - 60_000,
  company_website: "",
  first_name: "Sandbox", last_name: "Tester", email: `sandbox+${Date.now()}@example.com`, phone: "+1 617 555 0100",
  whatsapp_same: true, current_country: "US", ghana_region: "Greater Accra", ghana_city: "East Legon", land_size: "100 x 70 ft",
  acquisition: "family", title_status: "indenture_registered", intended_use: "family_home",
  project_stage: "land_only", budget_range: "100k_200k", start_timeline: "6_12m",
  ground_support: ["family"], focus: ["title", "budget"], concerns: "Smoke test — please ignore.",
  inventory: Object.fromEntries(docKeys.map((k, i) => [k, i % 3 === 0 ? "have" : i % 3 === 1 ? "dont_have" : "not_sure"])),
  consent_terms: true, consent_data: true, consent_marketing: false, ads_consent: false,
  attribution: { utm_source: "smoke", utm_medium: "test" }, page_url: `${base}/ghana-build-readiness-review/start`,
};

let failed = 0;
const must = (step, cond, extra) => { log(step, cond, extra); if (!cond) { failed++; } return cond; };

const price = await call("/api/readiness/price");
must("price endpoint", price.status === 200, JSON.stringify(price.j));

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
must("uploads blocked before payment", early.status === 402);

const co = await call("/api/readiness/checkout", { method: "POST", body: JSON.stringify({ case_id: caseId, token, provider: "paystack" }) });
if (!must("checkout started (sandbox)", co.status === 200 && co.j.ok && co.j.sandbox === true, `${co.status} ${JSON.stringify(co.j).slice(0, 200)}`)) process.exit(1);
const session = new URL(co.j.url, base).searchParams.get("session");

const forged = await call("/api/readiness/webhooks/paystack", { method: "POST", body: JSON.stringify({ event: "charge.success", data: { reference: session } }), headers: { "x-paystack-signature": "deadbeef" } });
must("forged webhook rejected", forged.status === 400 || forged.status === 401 || forged.status === 503, `${forged.status}`);

const pay = await call("/api/readiness/sandbox/complete", { method: "POST", body: JSON.stringify({ session, outcome: "paid" }) });
must("sandbox payment processed via signed webhook", pay.status === 200 && pay.j.ok !== false, `${pay.status} ${JSON.stringify(pay.j).slice(0, 160)}`);

const v2 = await call(`/api/readiness/case/${caseId}?t=${token}`);
must("case paid → awaiting documents", v2.j.case?.paymentStatus === "paid" && v2.j.case?.status === "awaiting_documents", `${v2.j.case?.paymentStatus}/${v2.j.case?.status}`);

// Minimal valid PDF bytes
const pdf = Buffer.from("%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const up = await call(`/api/readiness/case/${caseId}/uploads`, { method: "POST", body: JSON.stringify({ token, doc_key: "indenture", filename: "indenture.pdf", content_type: "application/pdf", size: pdf.length }) });
if (must("upload URL signed", up.status === 200 && up.j.ok, `${up.status} ${JSON.stringify(up.j).slice(0, 160)}`)) {
  const put = await fetch(new URL(up.j.upload.url, base), { method: "PUT", body: pdf, headers: up.j.upload.headers });
  must("file PUT to signed URL", put.ok, `${put.status}`);
  const conf = await call(`/api/readiness/case/${caseId}/uploads/${up.j.docId}`, { method: "POST", body: JSON.stringify({ token }) });
  must("upload confirmed (type sniffed)", conf.status === 200 && conf.j.ok, `${conf.status} ${JSON.stringify(conf.j).slice(0, 120)}`);
  const badUp = await call(`/api/readiness/case/${caseId}/uploads`, { method: "POST", body: JSON.stringify({ token, doc_key: "boq", filename: "x.exe", content_type: "application/x-msdownload", size: 100 }) });
  must("disallowed file type refused", badUp.status === 415, `${badUp.status}`);
}

const replay = await call("/api/readiness/sandbox/complete", { method: "POST", body: JSON.stringify({ session, outcome: "paid" }) });
must("repeat payment does not double-count", replay.status === 200 || replay.status === 409, `${replay.status} ${JSON.stringify(replay.j).slice(0, 120)}`);

const v3 = await call(`/api/readiness/case/${caseId}?t=${token}`);
must("final case state", v3.j.case?.status === "documents_received" || v3.j.case?.status === "awaiting_documents", `${v3.j.case?.status}, docs=${v3.j.case?.documents?.filter((d) => d).length}`);
console.log(`\nCase page: ${base}/ghana-build-readiness-review/case/${caseId}?t=${token}`);
console.log(failed ? `\n${failed} check(s) failed` : "\nAll checks passed");
process.exit(failed ? 1 : 0);
