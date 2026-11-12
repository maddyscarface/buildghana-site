/**
 * Browser e2e for the Readiness Review sandbox flow:
 * landing → intake (5 steps, draft resume, partial documents) → sandbox checkout → case page → upload.
 * Usage: node tests/e2e-readiness/e2e.mjs http://localhost:3000 [screenshotDir]
 */
import { chromium } from "playwright";
import { writeFileSync, mkdirSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const shots = process.argv[3];
if (shots) mkdirSync(shots, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
await ctx.addInitScript(() => localStorage.setItem("bga_consent", JSON.stringify({ analytics: true, ads: false, at: new Date().toISOString() })));
const p = await ctx.newPage();
const errors = [];
p.on("pageerror", (e) => errors.push(e.message));
const draftPosts = [];
p.on("response", (r) => { if (r.url().includes("/api/readiness/draft") && r.request().method() === "POST") draftPosts.push(r.status()); });
const step = (s) => console.log("•", s);
const snap = async (n) => shots && p.screenshot({ path: `${shots}/e2e-${n}.png`, fullPage: true });

await p.goto(`${base}/ghana-build-readiness-review?utm_source=e2e&utm_medium=test&gclid=TEST123`, { waitUntil: "networkidle" });
step("landing loaded");
await p.getByRole("link", { name: /Get My Ghana Build Readiness Review/i }).first().click();
await p.waitForURL(/\/start/);
await p.waitForLoadState("networkidle");

await p.fill("#first_name", "E2E"); await p.fill("#last_name", "Tester");
await p.fill("#email", `e2e+${Date.now()}@example.com`); await p.fill("#phone", "+44 20 7946 0000");
await p.selectOption("#current_country", "GB"); await p.selectOption("#preferred_contact", "whatsapp"); await p.selectOption("#time_zone", "Europe/London");
await p.getByRole("button", { name: /^Continue/ }).click(); step("step 1 done");
await p.selectOption("#ghana_region", "Ashanti"); await p.fill("#district", "Kumasi Metropolitan"); await p.fill("#locality", "Ahodwo");
await p.fill("#map_link", "https://maps.google.com/?q=6.6745,-1.6164");
await p.selectOption("#area_unit", "plots"); await p.fill("#land_area", "1");
await p.selectOption("#access", "road"); await p.selectOption("#land_controller", "family"); await p.selectOption("#acquired", "yes");
await p.fill("#site_contact_name", "Kwame"); await p.fill("#site_contact_phone", "+233 24 000 0000");
await p.getByRole("button", { name: /^Continue/ }).click(); step("step 2 done");
await p.waitForTimeout(300);
if (draftPosts.length !== 1 || draftPosts[0] !== 200) throw new Error(`expected one intake_started post after step 1, got ${JSON.stringify(draftPosts)}`);
step("intake_started recorded once (CRM)");
// Resume draft: reload mid-flow and confirm answers come back
await p.reload({ waitUntil: "networkidle" });
await p.getByText(/restored your saved answers/i).waitFor({ timeout: 5000 });
step("draft restored after reload");
await p.getByRole("button", { name: /^Back/ }).click(); await p.getByRole("button", { name: /^Back/ }).click();
await p.getByRole("button", { name: /^Continue/ }).click(); await p.getByRole("button", { name: /^Continue/ }).click();
await p.waitForTimeout(300);
if (draftPosts.length !== 1) throw new Error(`intake_started must not repeat on resume/revisit, got ${draftPosts.length} posts`);
await p.selectOption("#intended_use", "single_family"); await p.selectOption("#finish", "standard");
await p.selectOption("#budget_band", "100k_200k"); await p.selectOption("#budget_currency", "GHS");
await p.selectOption("#funds", "staged"); await p.selectOption("#design_status", "concept");
await p.getByRole("button", { name: /Title verification by Ghanaian counsel/i }).click();
await p.getByRole("button", { name: /^Continue/ }).click(); step("step 3 done");
const groups = await p.getByRole("radiogroup").all();
for (const [i, g] of groups.entries()) await g.getByRole("radio", { name: ["Available", "Missing", "Uncertain"][i % 3] }).click();
await snap("inventory");
await p.getByRole("button", { name: /^Continue/ }).click(); step("step 4 done (partial documents)");
await p.getByTestId("fee-summary").first().waitFor();
await snap("scope-consent");
const boxes = p.locator('input[type="checkbox"]');
for (let i = 0; i < 4; i++) await boxes.nth(i).check(); // authority, privacy, scope, site contact
await p.waitForTimeout(4200); // server rejects forms completed in under 4s (bot guard)
await p.getByRole("button", { name: /Save and choose payment/i }).click();
await p.getByText(/Continue to payment/i).first().waitFor({ timeout: 15000 }).catch(async (e) => { await p.screenshot({ path: "/tmp/e2e-fail.png", fullPage: true }); throw e; });
step("intake saved, payment choice shown"); await snap("payment-choice");
await p.getByRole("button", { name: /Paystack/i }).click();
await p.waitForURL(/checkout\/sandbox/, { timeout: 15000 });
step("sandbox checkout"); await snap("sandbox-checkout");
await p.getByRole("button", { name: /Complete/i }).click();
await p.waitForURL(/\/case\//, { timeout: 15000 });
await p.getByText(/Payment confirmed|Paid/i).first().waitFor({ timeout: 15000 });
step("case page shows paid");
const pdf = "/tmp/e2e-sample.pdf"; writeFileSync(pdf, "%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
await p.locator('input[type="file"]').first().setInputFiles(pdf);
await p.getByText("e2e-sample.pdf uploaded securely.").waitFor({ timeout: 15000 });
step("document uploaded"); await snap("case-after-upload");
await b.close();
if (errors.length) { console.error("Page errors:", errors); process.exit(1); }
console.log("E2E PASS");
