/** Console-error + horizontal-overflow sweep of every Phase 5 route at 1440 and 390, per persona. Prints no secrets. */
import { chromium } from "playwright";
const BASE = process.env.BASE || "http://localhost:3317"; const CODE = process.env.TRANSPARENCY_DEMO_ACCESS_CODE;
const P = "/portal/projects/p-demo-accra-villa";
const plan = {
  public: ["/project-transparency", "/", "/portal/login", "/who-we-serve", "/ghana-build-readiness-review", "/assessment"],
  "u-owner": ["/portal/projects", P, `${P}/updates`, `${P}/schedule`, `${P}/gallery`, `${P}/documents`, `${P}/decisions`, `${P}/budget`, `${P}/team`],
  "u-coinv": ["/portal/projects", P, `${P}/updates`, `${P}/schedule`, `${P}/gallery`],
  "u-field": ["/field/projects", "/field/drafts", "/field/projects/p-demo-accra-villa/report/new"],
  "u-pm": ["/office", "/office/reports/r-12", "/office/reports/r-09", "/office/inspections", "/office/financials", "/office/audit", `${P}/schedule`],
  "u-insp": ["/office/inspections"], "u-acct": ["/office/financials", "/office/audit"], "u-builder": ["/portal/projects", P, `${P}/updates`],
};
const b = await chromium.launch(); let bad = 0, n = 0;
for (const [persona, routes] of Object.entries(plan)) {
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const ctx = await b.newContext({ viewport: vp }); const page = await ctx.newPage(); const errs = [];
    page.on("console", (m) => m.type() === "error" && errs.push(m.text().slice(0, 160))); page.on("pageerror", (e) => errs.push(e.message.slice(0, 160)));
    if (persona !== "public") { await page.goto(`${BASE}/portal/login`); await page.selectOption("#persona", persona); await page.fill("#code", CODE); await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/portal/login")), page.click("button[type=submit]")]); }
    for (const r of routes) {
      errs.length = 0; const res = await page.goto(BASE + r, { waitUntil: "networkidle" }); n++;
      const ov = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      const fail = res.status() !== 200 || ov > 0 || errs.length;
      if (fail) bad++;
      if (fail) console.log(`FAIL ${persona} ${vp.width} ${r} status=${res.status()} overflow=${ov} errors=${JSON.stringify(errs)}`);
    }
    await ctx.close();
  }
}
await b.close(); console.log(`${n - bad}/${n} route checks clean (200, no overflow, no console errors)`); process.exit(bad ? 1 : 0);
