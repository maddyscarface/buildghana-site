/**
 * Phase 5 demo-script e2e (spec 06 §A). Run against a server started with the demo env:
 *   BASE=http://localhost:3317 TRANSPARENCY_DEMO_ACCESS_CODE=… node tests/e2e-transparency/e2e.mjs
 * The access code is read from env and never printed. SHOTS=dir saves the three review screenshots.
 */
import { chromium } from "playwright";
import zlib from "node:zlib";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const BASE = process.env.BASE || "http://localhost:3317";
const CODE = process.env.TRANSPARENCY_DEMO_ACCESS_CODE;
const SHOTS = process.env.SHOTS || "";
if (!CODE) { console.error("TRANSPARENCY_DEMO_ACCESS_CODE missing"); process.exit(2); }
const P1 = "p-demo-accra-villa";
const results = []; const consoleErrors = [];
const ok = (name, cond, extra = "") => { results.push({ name, pass: !!cond, extra }); console.log(`${cond ? "PASS" : "FAIL"} ${name}${extra ? ` — ${extra}` : ""}`); };

// Synthetic test image: a noisy PNG (~700 KB → several 256 KB chunks). Not a site photo.
function png(w, h) {
  const crc = (b) => { let c, t = []; for (let n = 0; n < 256; n++) { c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } let x = 0xffffffff; for (const v of b) x = t[(x ^ v) & 0xff] ^ (x >>> 8); return (x ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  const raw = Buffer.alloc((w * 3 + 1) * h); for (let i = 0; i < raw.length; i++) raw[i] = i % (w * 3 + 1) === 0 ? 0 : (Math.random() * 256) | 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 0 })), chunk("IEND", Buffer.alloc(0))]);
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "tp-e2e-"));
const img1 = path.join(tmp, "synthetic-test-1.png"); fs.writeFileSync(img1, png(480, 480));
const img2 = path.join(tmp, "synthetic-test-2.png"); fs.writeFileSync(img2, png(200, 200));
const fake = path.join(tmp, "not-an-image.png"); fs.writeFileSync(fake, Buffer.from("this is plain text pretending to be a png"));

const browser = await chromium.launch();
async function as(persona, viewport = { width: 1440, height: 900 }) {
  const ctx = await browser.newContext({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
  const page = await ctx.newPage();
  page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`${persona}: ${m.text().slice(0, 200)}`); });
  page.on("pageerror", (e) => consoleErrors.push(`${persona} pageerror: ${e.message.slice(0, 200)}`));
  await page.goto(`${BASE}/portal/login`);
  await page.selectOption("#persona", persona);
  await page.fill("#code", CODE);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/portal/login")), page.click("button[type=submit]")]);
  return { ctx, page };
}
const vis = (l, t = 10000) => l.first().waitFor({ state: "visible", timeout: t }).then(() => true, () => false);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
const status = async (page, url) => (await page.goto(BASE + url)).status();

try {
  // 0. Public page + bad code
  {
    const ctx = await browser.newContext(); const page = await ctx.newPage();
    page.on("console", (m) => { if (m.type() === "error") consoleErrors.push(`public: ${m.text().slice(0, 200)}`); });
    for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
      await page.setViewportSize(vp);
      const r = await page.goto(`${BASE}/project-transparency`, { waitUntil: "networkidle" });
      ok(`public page 200 @${vp.width}`, r.status() === 200);
      const rej = page.getByRole("button", { name: "Reject non-essential" });
      if (await rej.count()) { await rej.first().click(); await page.waitForTimeout(300); }
      ok(`public page no overflow @${vp.width}`, (await overflow(page)) <= 0, `${await overflow(page)}px`);
      if (vp.width === 1440 && SHOTS) await page.screenshot({ path: path.join(SHOTS, "project-transparency-1440.png"), fullPage: true });
      if (vp.width === 390 && SHOTS) await page.screenshot({ path: path.join(SHOTS, "project-transparency-390.png"), fullPage: true });
    }
    ok("H1 text", (await page.locator("h1").innerText()).includes("Construction progress updates you can actually verify"));
    ok("single H1", (await page.locator("h1").count()) === 1);
    for (const t of ["See How Project Transparency Works", "Request Construction Oversight", "Client Portal", "Start a Build Readiness Review"]) ok(`CTA ${t}`, (await page.getByText(t, { exact: true }).count()) > 0);
    const ld = await page.locator('script[type="application/ld+json"]').allInnerTexts();
    ok("FAQPage schema", ld.some((x) => x.includes('"FAQPage"')));
    ok("public page has no fund-safety guarantee", !/(we|buildghana) guarantees?|funds are (safe|protected)|escrow protection|100% (safe|secure)/i.test(await page.content()));
    await page.goto(`${BASE}/portal/login`);
    await page.selectOption("#persona", "u-owner"); await page.fill("#code", "wrong-code-123456"); await page.click("button[type=submit]");
    ok("wrong access code rejected", await vis(page.getByText("That access code isn't right.")));
    ok("portal unauth redirects", (await page.goto(`${BASE}/portal/projects/${P1}`)).url().includes("/portal/login"));
    await ctx.close();
  }

  // 1. Field supervisor on a phone: safety → project → upload with a dropped connection → resume → notes → submit
  let reportId;
  {
    const { ctx, page } = await as("u-field", { width: 390, height: 844 });
    ok("field lands on /field/projects", page.url().includes("/field/projects"));
    await page.getByRole("link", { name: "New site report" }).first().click();
    await page.waitForURL(/report\/new/);
    const boxes = page.locator("section input[type=checkbox]");
    ok("continue disabled before safety checklist", await page.getByRole("button", { name: /safe position/ }).isDisabled());
    for (let i = 0; i < 4; i++) await boxes.nth(i).check();
    await page.getByRole("button", { name: /safe position/ }).click();
    await page.getByLabel(/Ground-floor blockwork/).check();
    await page.getByText(/I am reporting for/).click();
    await page.getByRole("button", { name: "Start report" }).click();
    await page.waitForURL(/report=/);
    reportId = new URL(page.url()).searchParams.get("report");
    ok("draft created", !!reportId, reportId);
    await page.getByRole("radio", { name: "Overview" }).click();
    await page.getByText("Demo: simulate a dropped connection").click();
    await page.locator('input[type=file][multiple]').setInputFiles(img1);
    await page.getByRole("button", { name: "Resume upload" }).waitFor({ timeout: 15000 });
    ok("upload paused after simulated drop", await page.getByText(/Connection lost/).isVisible());
    const partial = await page.locator("li p.text-xs").first().innerText();
    await page.getByRole("button", { name: "Resume upload" }).click();
    await page.getByText(/Uploaded · fingerprint/).waitFor({ timeout: 20000 });
    ok("upload resumed and completed", true, `before resume: ${partial.split("·")[0].trim()}`);
    await page.getByRole("radio", { name: "Close-up" }).click();
    await page.locator('input[type=file][multiple]').setInputFiles(fake);
    await page.getByText(/doesn't match|not an accepted|type/i).first().waitFor({ timeout: 10000 }).catch(() => {});
    ok("fake image rejected by magic-byte check", (await page.locator("li").filter({ hasText: "error" }).count()) > 0 || (await page.getByText(/accepted|match/i).count()) > 0);
    const errItem = page.locator("li").filter({ hasText: /error/ }).first();
    if (await errItem.count()) await errItem.getByRole("button", { name: "Remove" }).click();
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "field-report-mobile-390.png"), fullPage: true });
    ok("field wizard no overflow @390", (await overflow(page)) <= 0);
    await page.getByRole("button", { name: "Next: notes" }).click();
    await page.getByLabel("Short summary *").fill("E2E: east wall blockwork to lintel level (synthetic)");
    await page.getByLabel("Work reported *").fill("Blockwork continued on the east elevation (synthetic e2e).");
    await page.getByLabel(/Crew on site/).fill("6");
    ok("notes autosaved", await vis(page.getByText(/Draft saved|Saved on this phone/)));
    await page.getByRole("button", { name: "Review" }).click();
    await page.locator("section label").filter({ hasText: /confirm|accurate|true/i }).locator("input").check();
    await page.getByRole("button", { name: "Submit report" }).click();
    ok("report submitted", await vis(page.getByText("Report submitted")));
    await ctx.close();
  }

  // 2. Office returns it for correction (no self-review is enforced server-side)
  {
    const { ctx, page } = await as("u-pm");
    await page.goto(`${BASE}/office`);
    ok("report in review queue", (await page.getByText("E2E: east wall blockwork").count()) > 0);
    await page.goto(`${BASE}/office/reports/${reportId}`);
    await page.getByLabel(/Notes for the field team/).fill("Need a closer shot of the lintel bearing (e2e).");
    await page.getByRole("button", { name: "Return for correction" }).click();
    ok("returned for correction", await vis(page.getByText("Decision recorded.")));
    await ctx.close();
  }

  // 3. Field corrects and resubmits (new revision; original kept)
  {
    const { ctx, page } = await as("u-field", { width: 390, height: 844 });
    await page.goto(`${BASE}/field/drafts`);
    ok("correction note visible to field", await page.getByText(/closer shot of the lintel/).first().isVisible());
    await page.getByRole("link", { name: "Fix and resubmit" }).first().click();
    await page.waitForURL(/report=/);
    for (let i = 0; i < 4; i++) await page.locator("section input[type=checkbox]").nth(i).check();
    await page.getByRole("button", { name: /safe position/ }).click();
    await page.getByRole("radio", { name: "Close-up" }).click();
    await page.locator('input[type=file][multiple]').setInputFiles(img2);
    await page.getByText(/Uploaded · fingerprint/).first().waitFor({ timeout: 20000 });
    await page.waitForFunction(() => !document.body.innerText.includes("uploading"));
    await page.getByRole("button", { name: "Next: notes" }).click();
    await page.getByRole("button", { name: "Review" }).click();
    await page.locator("section label").filter({ hasText: /confirm|accurate|true/i }).locator("input").check();
    await page.getByRole("button", { name: "Submit report" }).click();
    ok("correction resubmitted as revision 2", await vis(page.getByText(/Revision 2/)));
    await ctx.close();
  }

  // 4. Office reviews and publishes
  {
    const { ctx, page } = await as("u-pm");
    await page.goto(`${BASE}/office/reports/${reportId}`);
    await page.getByRole("button", { name: "Mark office reviewed" }).click();
    await vis(page.getByText("Decision recorded."));
    await page.reload();
    await page.getByRole("button", { name: "Publish to owner" }).click();
    ok("published", await vis(page.getByText("Decision recorded.")));
    await ctx.close();
  }

  // 5. Inspector records a pass covering the report → Inspected
  {
    const { ctx, page } = await as("u-insp");
    await page.goto(`${BASE}/office/inspections`);
    const li = page.locator("li").filter({ hasText: "Ground-floor blockwork" }).first();
    await li.getByText("Record an inspection").click();
    await li.getByLabel("Result *").selectOption("pass");
    await li.locator("label").filter({ hasText: "E2E: east wall blockwork" }).locator("input").check();
    await li.getByLabel("Scope inspected *").fill("East elevation blockwork and lintels (synthetic e2e).");
    await li.getByLabel(/Method/).fill("Visual, tape measure");
    await li.getByLabel(/Limitations/).fill("Did not test block strength.");
    await li.getByLabel(/Type your full name/).fill("Synthetic Inspector");
    await li.getByRole("button", { name: "Record inspection" }).click();
    ok("inspection recorded", await vis(page.getByText("Inspection recorded.")));
    await ctx.close();
  }

  // 6. Owner sees it, approves the change order, authorises a payment request
  {
    const { ctx, page } = await as("u-owner");
    await page.goto(`${BASE}/portal/projects/${P1}`, { waitUntil: "networkidle" });
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "portal-dashboard-1440.png"), fullPage: true });
    ok("dashboard no overflow @1440", (await overflow(page)) <= 0);
    await page.goto(`${BASE}/portal/projects/${P1}/updates`);
    const card = page.locator("article").filter({ hasText: "E2E: east wall blockwork" });
    ok("owner sees published report", (await card.count()) === 1);
    ok("report shows Inspected evidence state", (await card.getByText("Inspected", { exact: true }).count()) > 0);
    ok("owner does not see correction notes", (await card.getByText(/closer shot of the lintel/).count()) === 0);
    await page.goto(`${BASE}/portal/projects/${P1}/decisions`);
    const dec = page.locator("section").filter({ has: page.getByRole("heading", { name: /CO-002/ }) });
    await dec.getByLabel(/Type DEMO-ACC-01/).fill("DEMO-ACC-01");
    await dec.getByRole("button", { name: "Approve" }).click();
    ok("owner approved CO-002", await vis(page.getByText("Your decision was recorded.")));
    await page.goto(`${BASE}/portal/projects/${P1}/budget`);
    const row = page.locator("tr").filter({ hasText: "PR-005" });
    await row.getByLabel(/Type DEMO-ACC-01/).fill("DEMO-ACC-01");
    await row.getByRole("button", { name: "Authorise" }).click();
    ok("owner authorised PR-005", await vis(page.getByText("Recorded.")));
    await page.reload();
    ok("authorised ≠ paid", (await page.locator("tr").filter({ hasText: "PR-005" }).getByText("Approved for payment").count()) > 0 || (await page.locator("tr").filter({ hasText: "PR-005" }).getByText(/Authorised/).count()) > 0);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE}/portal/projects/${P1}`, { waitUntil: "networkidle" });
    ok("dashboard no overflow @390", (await overflow(page)) <= 0);
    if (SHOTS) await page.screenshot({ path: path.join(SHOTS, "portal-dashboard-390.png"), fullPage: true });
    await ctx.close();
  }

  // 7. Accountant records disbursement for PR-005 then reconciles; PR-003 reconcile
  {
    const { ctx, page } = await as("u-acct");
    await page.goto(`${BASE}/office/financials`);
    const li = page.locator("li").filter({ hasText: "PR-005" });
    await li.getByLabel(/Date paid/).fill("2026-11-24");
    await li.getByLabel(/payment reference/).fill("DEMO-REF-E2E-005");
    await li.getByRole("button", { name: "Record disbursement" }).click();
    ok("disbursement recorded", await vis(page.getByText(/awaiting reconciliation/).first()));
    await page.reload();
    await page.locator("li").filter({ hasText: "PR-005" }).getByRole("button", { name: "Mark reconciled" }).click();
    ok("reconciled", await vis(page.getByText("Reconciled.")));
    await ctx.close();
  }

  // 8. Co-investor: no budget; owner revokes → immediate denial
  {
    const co = await as("u-coinv");
    ok("co-investor sees project", (await status(co.page, `/portal/projects/${P1}`)) === 200);
    ok("co-investor budget 404", (await status(co.page, `/portal/projects/${P1}/budget`)) === 404);
    ok("co-investor documents 404", (await status(co.page, `/portal/projects/${P1}/documents`)) === 404);
    ok("co-investor budget nav hidden", (await co.page.goto(`${BASE}/portal/projects/${P1}`)) && (await co.page.getByRole("link", { name: "Budget" }).count()) === 0);
    const own = await as("u-owner");
    await own.page.goto(`${BASE}/portal/projects/${P1}/team`);
    const li = own.page.locator("li").filter({ hasText: "Demo Co-investor" });
    await li.getByRole("button", { name: "Revoke access" }).click();
    ok("owner revoked co-investor", await vis(own.page.getByText("Access revoked.")));
    ok("revoked co-investor denied immediately", (await status(co.page, `/portal/projects/${P1}`)) === 404);
    await co.ctx.close(); await own.ctx.close();
  }

  // 9. IDOR: other project's owner and another tenant's owner
  {
    for (const persona of ["u-owner-b", "u-other-owner"]) {
      const { ctx, page } = await as(persona);
      ok(`${persona} project page 404`, (await status(page, `/portal/projects/${P1}`)) === 404);
      const api = await page.request.get(`${BASE}/api/portal/projects/${P1}/summary`);
      ok(`${persona} summary API denied`, api.status() === 404 || api.status() === 403, String(api.status()));
      const media = await page.request.get(`${BASE}/api/portal/media/md-05-2-2`);
      ok(`${persona} media without signature denied`, media.status() >= 400, String(media.status()));
      const exp = await page.request.get(`${BASE}/api/portal/projects/${P1}/export`);
      ok(`${persona} export denied`, exp.status() >= 400, String(exp.status()));
      await ctx.close();
    }
    const anon = await browser.newContext();
    const r = await anon.request.post(`${BASE}/api/office/reports/r-12/review`, { data: { decision: "publish" }, headers: { Origin: BASE } });
    ok("anonymous office write denied", r.status() === 401 || r.status() === 404, String(r.status()));
    const fieldCtx = await as("u-field");
    const pmOnly = await fieldCtx.page.request.post(`${BASE}/api/office/reports/r-12/review`, { data: { decision: "publish" }, headers: { Origin: BASE } });
    ok("field supervisor cannot publish", pmOnly.status() >= 400, String(pmOnly.status()));
    const xsite = await fieldCtx.page.request.post(`${BASE}/api/field/projects/${P1}/reports`, { data: { milestoneId: "ms-3", confirmProjectCode: "DEMO-ACC-01" }, headers: { Origin: "https://evil.example" } });
    ok("cross-origin write blocked", xsite.status() === 403, String(xsite.status()));
    await anon.close(); await fieldCtx.ctx.close();
  }

  // 10. Private headers + no trackers on private pages
  {
    const { ctx, page } = await as("u-owner");
    const urls = [];
    page.on("request", (r) => urls.push(r.url()));
    const res = await page.goto(`${BASE}/portal/projects/${P1}/gallery`, { waitUntil: "networkidle" });
    ok("X-Robots-Tag noindex on portal", (res.headers()["x-robots-tag"] || "").includes("noindex"));
    ok("Cache-Control private on portal", (res.headers()["cache-control"] || "").includes("private"));
    ok("no third-party requests on portal", !urls.some((u) => !u.startsWith(BASE) && !u.startsWith("data:") && !u.startsWith("blob:")), urls.filter((u) => !u.startsWith(BASE)).slice(0, 3).join(","));
    ok("no GTM/pixel scripts in portal HTML", !/googletagmanager|fbq\(|connect\.facebook|leadconnector|datamoon/i.test(await page.content()));
    const img = page.locator("img[src*='/api/portal/media/']").first();
    const src = await img.getAttribute("src");
    ok("media URL is signed + expiring", /exp=\d+&sig=/.test(src || ""));
    const mr = await page.request.get(BASE + src);
    ok("signed media served with nosniff", mr.status() === 200 && mr.headers()["x-content-type-options"] === "nosniff");
    await ctx.close();
  }
} catch (e) {
  ok("script error", false, e.message.split("\n")[0]);
} finally {
  await browser.close();
  fs.rmSync(tmp, { recursive: true, force: true });
}
const failed = results.filter((r) => !r.pass);
console.log(`\n${results.length - failed.length}/${results.length} passed`);
console.log(`console errors: ${consoleErrors.length}`); consoleErrors.slice(0, 15).forEach((e) => console.log("  " + e));
process.exit(failed.length ? 1 : 0);
