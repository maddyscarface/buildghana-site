# QA report — branch `blueprint-v1` (24 Nov 2026, PKT UTC+5)

Deployed code: local commit `9023222`, which is GitHub commit `9748c30` on `blueprint-v1` (same tree; it was pushed through the GitHub API in parts of up to 4 files each). This report is a docs-only follow-up commit.
Staging: https://buildghana-blueprint-v1.vercel.app → `dpl_4yLmzy3y2DW1Sx1jgu3jA9tXmcDs` (preview target).
Production `dpl_6qPkrBxhdczDoi86iE2XNGY1Ya9x` and the existing staging alias (`dpl_EsJai6yyUek7JaCjnnwfkTjVrTUx`) were not changed.

| Area (§07.1) | Result | Evidence | Real vs mocked |
|---|---|---|---|
| Types / unit | `tsc` OK · vitest **136/136** (121 existing + 15 new) | `npx vitest run` | real |
| Build | `next build` OK locally and on Vercel | build log | real |
| Readiness browser e2e | PASS (intake, draft resume, sandbox checkout, case page paid, upload) | tests/e2e-readiness/e2e.mjs (local) | sandbox payment mock |
| Lead regression | PASS 5/5 | tests/e2e-readiness/lead-regression.mjs (local) | memory store, GHL log-mode |
| Property e2e | PASS 15/15 | tests/e2e-property/e2e.mjs (local) | GHL log-mode |
| Readiness smoke | 21/21 | scripts/smoke-readiness.mjs (local) | signed mock webhook |
| ChatGPT ads / pixels | 21 PASS, ALL PASSED | tests/e2e-chatgpt-ads (local mock receiver) | mock receiver |
| Ops admin smoke | 48/48 | tests/e2e-ops/smoke.mjs (local, test staff tokens) | KV memory |
| Case-token privacy | token stripped from address bar; page_view path `/ghana-build-readiness-review/case/[id]?utm_source=…`; no token/id in dataLayer; reload still works | tools/tokcheck (local) | real |
| Staging: 25 routes | all public routes 200; `X-Robots-Tag: noindex, nofollow, noarchive` + meta `noindex, nofollow`; robots `Disallow: /`; empty sitemap | QA script on staging | real |
| Staging: console / overflow | 0 console errors and 0 horizontal overflow at 1440×900 and 390×844 on all 23 public routes | QA script | real |
| Staging: axe (WCAG 2.0/2.1/2.2 A+AA rules) | 0 violations on all 23 public routes (before fixes: logo name mismatch on every page; contrast on readiness/property forms) | axe-core 4 | automated only; manual keyboard/screen-reader pass still owed |
| Admin / case pages | 200, noindex; one expected 401 (/session before login) or 404 (fake case id) resource log each | QA script | real |
| /api/health | `blueprint.violations: 0`, payments `live_enabled: false`, DataMoon mock, GHL not_configured | curl | real |

Not tested on staging on purpose: form submissions (preview shares the production Upstash DB; submissions were tested locally against the memory store).
