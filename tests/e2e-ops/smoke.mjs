/**
 * Ops admin smoke (local/staging sandbox only — never against a deployment wired to live GHL/DataMoon).
 * API: role/brand denial, CSRF, project + private document, DataMoon synthetic recipe → approve → run → import,
 *      prohibited targeting refused, CSV export allowlist, outbox run, audit chain.
 * UI:  login, every tab renders without page errors, no horizontal overflow at 375/390/768/1440; screenshots.
 * Usage: OWNER=<token> MARKETER=<token> READONLY=<token> OTHERBRAND=<token> node tests/e2e-ops/smoke.mjs <base> [shotDir]
 */
import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const base = (process.argv[2] || "http://localhost:3000").replace(/\/$/, "");
const shots = process.argv[3]; if (shots) mkdirSync(shots, { recursive: true });
const T = { owner: process.env.OWNER, marketer: process.env.MARKETER, ro: process.env.READONLY, other: process.env.OTHERBRAND };
let fails = 0, passes = 0;
const ok = (n, c, x = "") => { console.log(`${c ? "PASS" : "FAIL"}  ${n}${x ? "  " + x : ""}`); c ? passes++ : fails++; };
const api = async (path, { tok, method = "GET", body, headers = {} } = {}) => {
  const r = await fetch(`${base}/api/admin/ops${path}`, { method, headers: { "content-type": "application/json", ...(tok ? { authorization: `Bearer ${tok}` } : {}), ...headers }, body: body ? JSON.stringify(body) : undefined });
  const t = await r.text(); let j; try { j = JSON.parse(t); } catch { j = { raw: t.slice(0, 300) }; } return { s: r.status, j, h: r.headers };
};

// ── API: authz ──
ok("no token → 401", (await api("/records")).s === 401);
ok("bad token → 401", (await api("/records", { tok: "x".repeat(32) })).s === 401);
ok("other-brand staff → 403", (await api("/records", { tok: T.other })).s === 403);
ok("read-only cannot create project → 403", (await api("/projects", { tok: T.ro, method: "POST", body: { title: "Denied", type: "general", market: "ghana" } })).s === 403);
ok("marketer cannot read staff → 403", (await api("/staff", { tok: T.marketer })).s === 403);
const mrec = await api("/records", { tok: T.marketer });
ok("marketer records are PII-masked", mrec.s === 200 && mrec.j.pii === false);
const cs = await fetch(`${base}/api/admin/ops/session`, { method: "POST", headers: { "content-type": "application/json", origin: "https://evil.example" }, body: JSON.stringify({ token: T.owner }) });
ok("cross-site login blocked → 403", cs.status === 403);

// ── API: projects + private documents ──
const pr = await api("/projects", { tok: T.owner, method: "POST", body: { title: "Smoke project — Kumasi family home", type: "construction_management", market: "abroad" } });
ok("project created", pr.s === 201, pr.j.project?.reference);
const pid = pr.j.project?.id;
const bytes = Buffer.from("%PDF-1.4\n% smoke test\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF\n");
const bad = await api(`/projects/${pid}/documents`, { tok: T.owner, method: "POST", body: { category: "other", label: "Script", contentType: "application/x-msdownload", size: 100 } });
ok("disallowed upload type refused", bad.s === 422);
const big = await api(`/projects/${pid}/documents`, { tok: T.owner, method: "POST", body: { category: "other", label: "Huge", contentType: "application/pdf", size: 900 * 1024 * 1024 } });
ok("oversize upload refused", big.s === 422);
const dr = await api(`/projects/${pid}/documents`, { tok: T.owner, method: "POST", body: { category: "parcel_document", label: "Indenture copy", contentType: "application/pdf", size: bytes.length } });
ok("upload URL signed", dr.s === 201 && !!dr.j.upload?.url);
const up = await fetch(new URL(dr.j.upload.url, base), { method: dr.j.upload.method || "PUT", headers: dr.j.upload.headers || { "content-type": "application/pdf" }, body: bytes });
ok("file PUT to signed URL", up.ok, String(up.status));
const did = dr.j.document.id;
ok("upload confirmed", (await api(`/documents/${did}`, { tok: T.owner, method: "PATCH", body: { action: "confirm_upload" } })).s === 200);
const dl = await api(`/documents/${did}`, { tok: T.owner });
ok("download link is signed + short-lived", dl.s === 200 && /sig|signature|exp/i.test(dl.j.url || ""));
const tampered = await fetch(new URL(dl.j.url.replace(/(sig=)[0-9a-f]{4}/i, "$1dead"), base));
ok("tampered signature refused", tampered.status === 403 || tampered.status === 401, String(tampered.status));
ok("marketer cannot read documents", (await api(`/documents/${did}`, { tok: T.marketer })).s === 403);

// ── API: DataMoon synthetic flow ──
const dm = await api("/datamoon", { tok: T.owner });
ok("DataMoon shows not connected / fixtures", dm.s === 200 && dm.j.provider !== "live", `${dm.j.provider} · ${dm.j.status?.label}`);
const topics = await api("/datamoon/topics?kind=b2c&q=real", { tok: T.owner });
ok("topic discovery (synthetic fixture fallback)", topics.s === 200 && topics.j.topics?.length > 0 && topics.j.source === "synthetic_fixture");
const t0 = topics.j.topics[0];
const recipeBody = { name: "Smoke US property researchers", persona: "us_overseas_property_researcher", kind: "b2c", api: "main_audience", market: "US", states: ["NY", "TX"], topics: [{ kind: "b2c", id: t0.id, name: t0.name, synthetic: true }], lookbackDays: 14, maxRecords: 50, purpose: "Invite to the Readiness Review guide via an opt-in landing page", legalBasis: "To be reviewed by counsel", destinations: ["admin_review_only"] };
const prohibited = await api("/datamoon/recipes", { tok: T.owner, method: "POST", body: { ...recipeBody, name: "Diaspora targeting", purpose: "Target the Ghanaian diaspora in the US by ethnicity" } });
ok("ethnicity/diaspora targeting refused (not saved)", prohibited.s === 422, String(prohibited.s));
const nonUs = await api("/datamoon/recipes", { tok: T.owner, method: "POST", body: { ...recipeBody, market: "GH" } });
ok("non-US market refused", nonUs.s === 422);
const rc = await api("/datamoon/recipes", { tok: T.marketer, method: "POST", body: recipeBody });
ok("marketer can draft a recipe", rc.s === 201, rc.j.error || "");
const rid = rc.j.recipe?.id;
ok("marketer cannot approve", (await api(`/datamoon/recipes/${rid}`, { tok: T.marketer, method: "POST", body: { action: "approve" } })).s === 403);
ok("run before approval refused", (await api(`/datamoon/recipes/${rid}`, { tok: T.owner, method: "POST", body: { action: "run" } })).s === 409);
for (const a of ["submit", "approve", "approve_export"]) { const r = await api(`/datamoon/recipes/${rid}`, { tok: T.owner, method: "POST", body: { action: a, patch: { maxRecords: 50 } } }); ok(`owner ${a}`, r.s === 200, r.j.error || ""); }
const run = await api(`/datamoon/recipes/${rid}`, { tok: T.owner, method: "POST", body: { action: "run" } });
ok("synthetic run queued (no vendor call)", run.s === 200 && run.j.result?.synthetic === true, run.j.result?.exportId);
const dry = await api("/datamoon/imports", { tok: T.owner, method: "POST", body: { recipeId: rid, source: "csv", dryRun: true, csv: "contact_id,first_name,last_name,personal_emails,personal_state,contact_country\nid_00000000000000aa,Pat,Doe,pat@example.com,NY,US\nid_00000000000000bb,Kofi,Mensah,kofi@example.com,,GH\n" } });
ok("CSV dry run: 1 accepted, non-US rejected", dry.s === 200 && dry.j.summary?.accepted === 1 && dry.j.summary?.rejected >= 1, JSON.stringify(dry.j.summary?.reasons || {}));
const crm = await api("/crm", { tok: T.owner, method: "POST", body: { action: "run" } });
ok("outbox run processes the fixture import", crm.s === 200 && crm.j.processed >= 1, `processed ${crm.j.processed} done ${crm.j.done}`);
const after = await api("/datamoon", { tok: T.owner });
ok("synthetic vendor prospects stored separately", after.j.contacts?.total >= 1 && after.j.contacts.sample.every((c) => c.synthetic));
const vrec = await api("/records?type=vendor_prospect", { tok: T.owner });
ok("vendor prospects visible as their own record type", vrec.s === 200 && vrec.j.rows?.length >= 1);
const sup = await api("/suppressions", { tok: T.owner, method: "POST", body: { email: "pat@example.com", reason: "opt_out" } });
ok("suppression added", sup.s === 200);
const dry2 = await api("/datamoon/imports", { tok: T.owner, method: "POST", body: { recipeId: rid, source: "csv", dryRun: true, csv: "contact_id,personal_emails,personal_state,contact_country\nid_00000000000000aa,pat@example.com,NY,US\n" } });
ok("suppressed email blocked on import", dry2.j.summary?.suppressed === 1 && dry2.j.summary?.accepted === 0);

// ── API: CSV, audit, health, cron, webhook ──
const csvR = await fetch(`${base}/api/admin/ops/records?format=csv`, { headers: { authorization: `Bearer ${T.marketer}` } });
ok("marketer cannot export CSV", csvR.status === 403);
const csvO = await fetch(`${base}/api/admin/ops/records?format=csv`, { headers: { authorization: `Bearer ${T.owner}` } });
const csvT = await csvO.text();
ok("owner CSV export (allowlisted header, no GPS/notes)", csvO.status === 200 && !/gps|directions|message|token/i.test(csvT.split("\n")[0]), csvT.split("\n")[0].slice(0, 120));
const au = await api("/audit", { tok: T.owner });
ok("audit chain verifies", au.s === 200 && au.j.chain?.ok === true, `${au.j.entries?.length} entries`);
{ const hh = (await api("/health", { tok: T.owner })).j.health?.datamoon; ok("health shows DataMoon flags off", hh?.main === "disabled" && hh?.intent === "disabled" && hh?.activation === "off" && hh?.ghlSync === "off"); }
ok("cron without secret → 401/404", [401, 404].includes((await fetch(`${base}/api/cron/outbox`)).status));
ok("DataMoon webhook disabled → 404", (await fetch(`${base}/api/webhooks/datamoon/exports`, { method: "POST", body: "{}" })).status === 404);

// ── UI ──
const b = await chromium.launch();
for (const [w, h] of [[375, 812], [390, 844], [768, 1024], [1440, 900]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, ...(w < 800 ? { isMobile: true, hasTouch: true } : {}) });
  const p = await ctx.newPage(); const errs = []; p.on("pageerror", (e) => errs.push(e.message));
  await p.goto(`${base}/admin/ops`, { waitUntil: "networkidle" });
  if (w === 375 && shots) await p.screenshot({ path: `${shots}/m375_admin_ops_login.png`, fullPage: true });
  await p.fill("#ops-token", T.owner); await p.getByRole("button", { name: "Sign in" }).click();
  await p.getByRole("tablist").waitFor({ timeout: 15000 });
  const tabs = await p.getByRole("tab").allInnerTexts();
  let overflow = [];
  for (const name of tabs) {
    await p.getByRole("tab", { name, exact: true }).click(); await p.waitForTimeout(600); await p.waitForLoadState("networkidle");
    const ov = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (ov > 1) overflow.push(`${name}+${ov}px`);
    if (shots && (w === 390 || w === 1440 || w === 768)) await p.screenshot({ path: `${shots}/${w < 800 ? "m" : "d"}${w}_admin_ops_${name.toLowerCase().replace(/[^a-z]+/g, "-")}.png`, fullPage: true });
  }
  ok(`UI ${w}px: ${tabs.length} tabs render without page errors`, errs.length === 0 && tabs.length === 11, errs.join(" | "));
  ok(`UI ${w}px: no page-level horizontal overflow`, overflow.length === 0, overflow.join(", "));
  await ctx.close();
}
// read-only sees fewer tabs
{ const ctx = await b.newContext(); const p = await ctx.newPage();
  await p.goto(`${base}/admin/ops`, { waitUntil: "networkidle" }); await p.fill("#ops-token", T.ro); await p.getByRole("button", { name: "Sign in" }).click();
  await p.getByRole("tablist").waitFor(); const tabs = await p.getByRole("tab").allInnerTexts();
  ok("read-only: no Staff/Audit tabs", !tabs.includes("Staff & roles") && !tabs.includes("Audit log"), tabs.join(", ")); await ctx.close(); }
await b.close();
console.log(`\n${passes} passed, ${fails} failed`);
process.exit(fails ? 1 : 0);
