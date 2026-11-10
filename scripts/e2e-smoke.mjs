// End-to-end smoke test: walks the multi-step form on a funnel page, submits, and checks
// that exactly one generate_lead event with a shared event_id reached the dataLayer.
// Usage: BASE_URL=http://localhost:3000 node scripts/e2e-smoke.mjs [screenshotDir]
import { chromium } from "playwright";

const BASE = process.env.BASE_URL || "http://localhost:3000";
const shots = process.argv[2];
const browser = await chromium.launch();
let failures = 0;
const check = (cond, msg) => { console.log(`${cond ? "PASS" : "FAIL"}  ${msg}`); if (!cond) failures++; };

// Screenshots
if (shots) {
  for (const [name, path, w, h] of [
    ["home-desktop", "/", 1440, 900], ["home-mobile", "/", 390, 844],
    ["service-desktop", "/ghana-project-rescue", 1440, 900], ["lp-mobile", "/lp/new-home", 390, 844],
    ["lp-desktop", "/lp/investors", 1440, 900], ["assessment-mobile", "/assessment", 390, 844],
  ]) {
    const p = await browser.newPage({ viewport: { width: w, height: h } });
    await p.goto(BASE + path, { waitUntil: "networkidle" });
    await p.evaluate(() => localStorage.setItem("bga_consent", JSON.stringify({ analytics: true, ads: true })));
    await p.reload({ waitUntil: "networkidle" });
    await p.screenshot({ path: `${shots}/${name}.png`, fullPage: name.endsWith("desktop") && name.startsWith("home") });
    await p.close();
  }
}

// Form flow
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
await page.goto(`${BASE}/lp/new-home?utm_source=meta&utm_campaign=test&fbclid=TESTCLICK`, { waitUntil: "networkidle" });
await page.evaluate(() => localStorage.setItem("bga_consent", JSON.stringify({ analytics: true, ads: true })));

// Step validation
await page.getByRole("button", { name: "Continue" }).click();
check(await page.getByText("Please enter your first name").isVisible(), "step 1 shows inline validation errors");

await page.fill("#first_name", "Test");
await page.fill("#last_name", "Lead");
await page.fill("#email", "test.lead@example.com");
await page.fill("#phone", "+1 617 555 0100");
await page.selectOption("#current_country", "US");
await page.getByRole("button", { name: "Continue" }).click();

await page.selectOption("#ghana_region", "Greater Accra");
await page.getByLabel("I own land and have documents").check();
await page.getByLabel("Design complete, permits pending").check();
await page.getByLabel("Single-family home").check();
await page.getByRole("button", { name: "Continue" }).click();

await page.getByLabel("$200,000 – $400,000").check();
await page.getByLabel("Within 3 months").check();
await page.fill("#project_description", "Two-storey four-bedroom home; drawings complete, permit application lodged with the Assembly.");
await page.getByRole("button", { name: "Continue" }).click();

await page.waitForTimeout(4200); // exceed MIN_FILL_MS anti-bot threshold
await page.getByText("Required: I agree").click();
await page.getByRole("button", { name: "Request My Assessment" }).click();
await page.waitForURL(/thank-you/, { timeout: 15000 });
check(page.url().includes("type=lead"), `redirected to thank-you (${page.url().replace(BASE, "")})`);

const dl = await page.evaluate(() => (window.dataLayer || []).filter((e) => e && e.event));
const leads = dl.filter((e) => e.event === "generate_lead");
check(leads.length === 1, `exactly one generate_lead in dataLayer (found ${leads.length})`);
check(leads[0] && /^[0-9a-f-]{36}$/.test(leads[0].event_id) && leads[0].event_id === leads[0].transaction_id, "generate_lead event_id = transaction_id = lead id");
check(dl.some((e) => e.event === "form_start"), "form_start fired");
const attr = await page.evaluate(() => JSON.parse(localStorage.getItem("bga_attr_last") || "{}"));
check(attr.utm_campaign === "test" && attr.fbc?.endsWith("TESTCLICK"), "attribution captured (utm + fbc built from fbclid)");

// Refresh thank-you; ensure no duplicate conversion
await page.reload({ waitUntil: "networkidle" });
const dl2 = await page.evaluate(() => (window.dataLayer || []).filter((e) => e.event === "generate_lead").length);
check(dl2 === 0, "no generate_lead re-fired on thank-you reload");
check(errors.length === 0, `no page errors ${errors.join(" | ")}`);

await browser.close();
console.log(failures ? `\n${failures} check(s) failed` : "\nAll checks passed");
process.exit(failures ? 1 : 0);
