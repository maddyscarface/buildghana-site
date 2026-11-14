import { chromium } from "playwright";
const [,, base, outdir, ...paths] = process.argv;
const b = await chromium.launch();
for (const [w,h,tag] of [[390,844,"m390"],[1440,900,"d1440"]]) {
  const p = await b.newPage({ viewport: { width: w, height: h } });
  for (const path of paths) {
    try { await p.goto(base + path, { waitUntil: "networkidle", timeout: 45000 }); await p.waitForTimeout(400);
      const f = `${outdir}/${tag}${path.replace(/[\/?=&]+/g, "_") || "_home"}.png`; await p.screenshot({ path: f, fullPage: false }); console.log(f);
    } catch (e) { console.log("ERR", path, e.message.slice(0,100)); }
  }
  await p.close();
}
await b.close();
