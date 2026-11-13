/**
 * Browser e2e for property inquiries (log/mock mode — never point at a deployment wired to a real CRM).
 * seller form (4 steps + consent) → private upload → thank-you; buyer form → thank-you; staff API matching.
 * Asserts private fields never reach dataLayer, localStorage drafts, thank-you HTML or public pages.
 * Usage: ADMIN=<token> node tests/e2e-property/e2e.mjs http://localhost:PORT
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const ADMIN = process.env.ADMIN || "";
const GPS = "GA-492-7731", NOTE = "Opposite the e2e water tank";
const fail = (m) => { console.error("FAIL", m); process.exit(1); };
const ok = (m) => console.log("PASS ", m);
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
await ctx.addInitScript(() => localStorage.setItem("bga_consent", JSON.stringify({ analytics: true, ads: true, at: new Date().toISOString() })));
const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
const outbound = []; p.on("request", (r) => { if (!r.url().startsWith(base)) outbound.push(r.url() + " " + (r.postData() || "")); });
const pick = async (label) => p.getByRole("radio", { name: label, exact: true }).first().click();
const multi = async (label) => p.getByRole("checkbox", { name: label, exact: true }).first().click();
const cont = async () => { await p.getByRole("button", { name: /^Continue$/ }).click(); await p.waitForTimeout(250); const e = await p.locator(".field-error").evaluateAll((els) => els.map((x) => (x.id || "?") + ":" + x.textContent)); if (e.length) fail("validation: " + e.join(" | ")); };

// ── Seller
await p.goto(`${base}/property/sell?utm_source=e2e&utm_medium=test`, { waitUntil: "networkidle" });
await p.fill("#pp-first_name", "Efua"); await p.fill("#pp-last_name", "E2E"); await p.fill("#pp-email", `seller+${Date.now()}@example.com`);
await p.fill("#pp-phone", "024 555 0101"); await pick("WhatsApp"); await p.selectOption("#pp-residence_country", "GH"); await p.selectOption("#pp-seller_role", "owner");
await cont();
await p.selectOption("#pp-region", "Central"); await p.fill("#pp-district", "Cape Coast Metro"); await p.fill("#pp-town", `Ankaful${Date.now() % 1000}`);
await p.fill("#pp-ghana_post_gps", GPS); await p.fill("#pp-location_notes", NOTE);
await cont();
const draft = await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))));
if (draft.includes(GPS) || draft.includes(NOTE)) fail("private fields saved to localStorage draft"); ok("draft excludes GPS / directions");
await p.selectOption("#pp-property_kind", "land"); await p.fill("#pp-size_value", "2"); await p.selectOption("#pp-size_unit", "plots");
await p.selectOption("#pp-property_use", "residential"); await p.selectOption("#pp-occupancy", "vacant");
await p.fill("#pp-asking_price", "350000"); await p.selectOption("#pp-currency", "GHS"); await pick("Negotiable");
await cont();
await p.selectOption("#pp-title_self_report", "indenture_unregistered"); await p.selectOption("#pp-planning_status", "site_plan");
await pick("None that I know of"); await multi("Indenture"); await p.selectOption("#pp-inspection", "anytime"); await pick("Non-exclusive — I may sell through others too");
await cont();
await p.waitForTimeout(4200); // honour the minimum fill time used by the spam guard
await p.check("#pp-consent_contact");
const sellerResp = p.waitForResponse((r) => r.url().endsWith("/api/property/seller"));
await p.getByRole("button", { name: /Send privately/ }).click();
const sr = await (await sellerResp).json();
if (!sr.ok || !sr.reference?.startsWith("S-")) fail("seller submit " + JSON.stringify(sr)); ok(`seller submitted ${sr.reference} (ghl=${sr.integrations?.ghl})`);
// private upload (photo)
const jpg = Buffer.from("/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=", "base64");
const fileInput = p.locator('input[type=file]').first();
await fileInput.setInputFiles({ name: "plot.jpg", mimeType: "image/jpeg", buffer: jpg });
await p.waitForTimeout(2500);
const upText = await p.locator("body").innerText();
if (!/plot\.jpg/.test(upText)) fail("upload not listed"); ok("photo uploaded privately");
await p.getByRole("button", { name: /^Finish$/ }).click(); await p.waitForURL(/\/property\/thank-you/);
const ty = await p.content(); if (ty.includes(GPS) || ty.includes(NOTE) || ty.includes("350000")) fail("thank-you leaks details"); ok("thank-you shows no sensitive details");
const robots = await p.locator('meta[name="robots"]').getAttribute("content"); if (!/noindex/.test(robots || "")) fail("thank-you not noindex"); ok("thank-you noindex");
const dl = await p.evaluate(() => JSON.stringify(window.dataLayer || []));
if (dl.includes(GPS) || dl.includes(NOTE) || dl.includes("350000") || dl.includes("@example.com")) fail("dataLayer leaks private data");
if (!dl.includes("seller_inquiry_submitted")) fail("seller_inquiry_submitted not tracked"); ok("dataLayer has seller_inquiry_submitted and no private data");

// ── Buyer (international, USD)
await p.goto(`${base}/property/buy`, { waitUntil: "networkidle" });
await p.fill("#pp-first_name", "Kwesi"); await p.fill("#pp-last_name", "E2E"); await p.fill("#pp-email", `buyer+${Date.now()}@example.com`);
await p.fill("#pp-phone", "+44 7700 900123"); await pick("Email"); await p.selectOption("#pp-residence_country", "GB");
await p.selectOption("#pp-buyer_role", "individual"); await p.selectOption("#pp-eligibility", "dual_citizen");
await cont();
await multi("Central"); await multi("Land / plot only"); await p.selectOption("#pp-property_use", "residential"); await p.selectOption("#pp-intended_use", "retirement");
await p.fill("#pp-size_min", "1"); await p.fill("#pp-size_max", "3"); await p.selectOption("#pp-size_unit", "plots");
await cont();
await pick("USD (US dollar)"); await p.fill("#pp-budget_max", "40000"); await p.selectOption("#pp-timeline", "3_6"); await p.selectOption("#pp-tenure", "leasehold_ok");
await p.selectOption("#pp-site_visit", "video"); await p.selectOption("#pp-counsel", "need_referral");
await cont(); await p.waitForTimeout(4200); await p.check("#pp-consent_contact");
const buyerResp = p.waitForResponse((r) => r.url().endsWith("/api/property/buyer"));
await p.getByRole("button", { name: /Send my requirements/ }).click();
const br = await (await buyerResp).json(); if (!br.ok) fail("buyer submit " + JSON.stringify(br)); ok(`buyer submitted ${br.reference}`);
await p.waitForURL(/\/property\/thank-you/);
if (outbound.some((u) => u.includes(GPS) || u.includes(NOTE))) fail("private data sent to a third party"); ok(`no private data in ${outbound.length} third-party requests`);

// ── Public pages never show private data
for (const path of ["/property", "/property/opportunities", "/sitemap.xml", "/llms.txt"]) {
  const t = await (await fetch(base + path)).text(); if (t.includes(GPS) || t.includes(NOTE) || t.includes(sr.reference)) fail(`${path} leaks`);
}
ok("public pages / sitemap / llms.txt contain no inquiry data");

// ── Staff API (admin-only)
const unauth = await fetch(`${base}/api/admin/property`); if (unauth.status !== 401 && unauth.status !== 404) fail("admin API not protected"); ok(`admin API without token → ${unauth.status}`);
if (ADMIN) {
  const H = { Authorization: `Bearer ${ADMIN}`, "Content-Type": "application/json" };
  const ov = await (await fetch(`${base}/api/admin/property`, { headers: H })).json();
  const s = ov.sellers.find((x) => x.reference === sr.reference); if (!s) fail("seller not in admin list"); ok("seller visible in admin queue");
  const m = await (await fetch(`${base}/api/admin/property/seller/${s.id}`, { method: "PATCH", headers: H, body: JSON.stringify({ action: "match" }) })).json();
  if (!m.ok || !m.detail.created.length) fail("matching produced no suggestion " + JSON.stringify(m)); ok(`matching suggested ${m.detail.created.length} match(es)`);
  const ap = await (await fetch(`${base}/api/admin/property/matches/${m.detail.created[0]}`, { method: "PATCH", headers: H, body: JSON.stringify({ action: "approve_introduction" }) })).json();
  if (ap.ok) fail("introduction approved without review/authorisation"); ok(`introduction blocked: ${ap.error}`);
  const ev = await (await fetch(`${base}/api/admin/property`, { headers: H })).json();
  ok(`events logged: ${[...new Set(ev.events.map((e) => e.name))].join(", ")}`);
}
if (errs.length) fail("page errors: " + errs.join("; "));
await b.close();
console.log("PROPERTY E2E PASS");
