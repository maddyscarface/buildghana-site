import { chromium } from "playwright";
const [,, url, out, w, h] = process.argv;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: +w, height: +h } });
await p.goto(url, { waitUntil: "networkidle" }); await p.waitForTimeout(300);
const info = await p.evaluate(() => { const b = document.querySelector('button[aria-label="Open menu"]'); const r = b?.getBoundingClientRect(); return { r, top: r && document.elementFromPoint(r.x + 10, r.y + 10)?.outerHTML.slice(0, 120) }; });
console.log(JSON.stringify(info));
await p.screenshot({ path: out }); await b.close();
