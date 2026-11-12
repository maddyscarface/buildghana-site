/**
 * Browser e2e for the Readiness Review sandbox flow:
 * landing → intake (5 steps) → sandbox checkout → case page → upload.
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
const step = (s) => console.log("•", s);
const snap = async (n) => shots && p.screenshot({ path: `${shots}/e2e-${n}.png`, fullPage: true });

await p.goto(`${base}/ghana-build-readiness-review?utm_source=e2e&utm_medium=test&gclid=TEST123`, { waitUntil: "networkidle" });
step("landing loaded");
await p.getByRole("link", { name: /Start your review/i }).first().click();
await p.waitForURL(/\/start/);
await p.waitForLoadState("networkidle");

await p.fill("#first_name", "E2E"); await p.fill("#last_name", "Tester");
await p.fill("#email", `e2e+${Date.now()}@example.com`); await p.fill("#phone", "+44 20 7946 0000");
await p.selectOption("#current_country", "GB");
await p.getByRole("button", { name: /^Continue/ }).click(); step("step 1 done");
await p.selectOption("#ghana_region", "Ashanti"); await p.fill("#ghana_city", "Kumasi");
await p.selectOption("#acquisition", "family"); await p.selectOption("#title_status", "indenture_only");
await p.getByRole("button", { name: /^Continue/ }).click(); step("step 2 done");
await p.selectOption("#intended_use", "family_home"); await p.selectOption("#project_stage", "land_only");
await p.selectOption("#budget_range", "100k_200k"); await p.selectOption("#start_timeline", "6_12m");
await p.getByRole("button", { name: /Is the land safe to build on/i }).click();
await p.getByRole("button", { name: /^Continue/ }).click(); step("step 3 done");
for (const g of await p.getByRole("radiogroup").all()) await g.getByRole("radio", { name: "Have it" }).click();
await snap("inventory");
await p.getByRole("button", { name: /^Continue/ }).click(); step("step 4 done");
const boxes = p.locator('input[type="checkbox"]');
await boxes.nth(0).check(); await boxes.nth(1).check();
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
