/**
 * Responsive audit: horizontal overflow, 44px tap targets, minimum text size, mobile navigation.
 * Usage: node tests/responsive/check.mjs <base> [out.json]
 * Tap-target rule follows WCAG 2.5.5/2.5.8 intent: interactive controls ≥44×44 CSS px; inline links inside
 * running text are reported separately (exempt) rather than failed.
 */
import { chromium } from "playwright";
import { writeFileSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const out = process.argv[3];
const viewports = [[320, 640], [360, 740], [390, 844], [414, 896], [768, 1024], [834, 1194], [1024, 768], [1280, 800], [1440, 900], [1920, 1080], [844, 390]];
const pages = ["/", "/property", "/property/sell", "/property/buy", "/property/how-it-works", "/property/opportunities", "/property/thank-you?type=seller&ref=S-ABC123",
  "/ghana-build-readiness-review", "/ghana-build-readiness-review/start", "/build-in-ghana", "/assessment", "/about", "/our-process", "/land-feasibility", "/resources", "/privacy", "/admin/property"];

const b = await chromium.launch();
const results = [];
for (const [w, h] of viewports) {
  const mobile = w < 1024;
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: mobile && w < 900, hasTouch: mobile });
  await ctx.addInitScript(() => localStorage.setItem("bga_consent", JSON.stringify({ analytics: false, ads: false, at: new Date().toISOString() })));
  const p = await ctx.newPage();
  for (const path of pages) {
    await p.goto(base + path, { waitUntil: "networkidle" }).catch(() => null);
    await p.waitForTimeout(150);
    const r = await p.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const overflow = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth) - window.innerWidth;
      const offenders = overflow > 0 ? [...document.querySelectorAll("body *")].filter((e) => { const r = e.getBoundingClientRect(); return r.right > vw + 1 && getComputedStyle(e).position !== "fixed"; }).slice(0, 5).map((e) => `${e.tagName.toLowerCase()}.${String(e.className).slice(0, 50)}`) : [];
      const visible = (e) => { const r = e.getBoundingClientRect(); const s = getComputedStyle(e); return r.width > 0 && r.height > 0 && s.visibility !== "hidden" && s.display !== "none" && !e.closest("[aria-hidden=true]") && !e.closest(".sr-only"); };
      const small = [], inline = [];
      for (const e of document.querySelectorAll("a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=radio], [role=checkbox], summary")) {
        if (!visible(e)) continue;
        if (e.matches("input[type=checkbox], input[type=radio]")) { const l = e.closest("label"); if (l) { const lr = l.getBoundingClientRect(); if (lr.height >= 44) continue; } }
        if (e.matches("input[type=file]")) continue;
        const r = e.getBoundingClientRect();
        if (r.width >= 44 && r.height >= 44) continue;
        const inText = e.tagName === "A" && getComputedStyle(e).display === "inline" && e.parentElement && /^(P|LI|SPAN|DD|TD|SMALL|STRONG|EM)$/.test(e.parentElement.tagName);
        (inText ? inline : small).push(`${e.tagName.toLowerCase()} "${(e.textContent || e.getAttribute("aria-label") || "").trim().slice(0, 30)}" ${Math.round(r.width)}×${Math.round(r.height)}`);
      }
      const tiny = [];
      const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const n = walker.currentNode; if (!n.textContent.trim()) continue; const el = n.parentElement; if (!el || !visible(el)) continue;
        const fs = parseFloat(getComputedStyle(el).fontSize); if (fs < 12) tiny.push(`${fs}px "${n.textContent.trim().slice(0, 25)}"`);
      }
      return { overflow, offenders, small: [...new Set(small)], inline: inline.length, tiny: [...new Set(tiny)].slice(0, 8) };
    });
    let nav = null;
    if (w < 1024 && path === "/") {
      const btn = p.getByRole("button", { name: "Open menu" });
      nav = (await btn.count()) ? "button-present" : "MISSING";
      if (nav === "button-present") {
        await btn.click(); await p.waitForTimeout(300);
        const links = await p.locator('a[href="/property"]:visible').count();
        const noOverflow = await p.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
        await p.getByRole("button", { name: "Close menu" }).click();
        nav = links > 0 && noOverflow ? "opens; Property link visible; closes" : `BROKEN links=${links}`;
      }
    } else if (path === "/") nav = (await p.locator('nav[aria-label="Primary"] a[href="/property"]:visible').count()) ? "desktop nav shows Property" : "desktop Property link hidden";
    results.push({ vp: `${w}x${h}`, path, ...r, nav });
  }
  await ctx.close();
}
await b.close();
const fails = results.filter((r) => r.overflow > 0 || r.small.length || (r.nav && /BROKEN|MISSING|hidden/.test(r.nav)));
for (const vp of [...new Set(results.map((r) => r.vp))]) {
  const rs = results.filter((r) => r.vp === vp);
  console.log(`${vp.padEnd(10)} pages=${rs.length} overflow=${rs.filter((r) => r.overflow > 0).length} smallTargets=${rs.reduce((a, r) => a + r.small.length, 0)} tinyText=${rs.reduce((a, r) => a + r.tiny.length, 0)} nav=${rs.find((r) => r.nav)?.nav}`);
}
for (const f of fails) console.log("FAIL", f.vp, f.path, JSON.stringify({ overflow: f.overflow, offenders: f.offenders, small: f.small.slice(0, 6), nav: f.nav }));
const tinyAll = results.filter((r) => r.tiny.length); for (const t of tinyAll.slice(0, 10)) console.log("TINY", t.vp, t.path, t.tiny.slice(0, 4).join("; "));
if (out) writeFileSync(out, JSON.stringify(results, null, 1));
console.log(fails.length ? `RESPONSIVE FAIL (${fails.length})` : "RESPONSIVE PASS");
