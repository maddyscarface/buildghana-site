# BuildGhana — Universal Business Launch OS v1.0 artifacts

Client output contract (§01.7 / §02.6) for this tenant. Generated or hand-maintained files; no secrets.

| File | What | How it stays current |
|---|---|---|
| `business.manifest.json` | Typed business manifest (facts with status, features, market, readiness intake/outputs) | Generated from `src/config/manifest.ts`; `tests/blueprint.test.ts` fails if out of sync (`WRITE_BLUEPRINT=1 npx vitest run tests/blueprint.test.ts` to regenerate) |
| `sources-ledger.md` | Evidence / claims ledger with status and public-use policy | Hand-maintained; mirrors `src/config/site.ts` `verified` flags |
| `open-questions.md` | Owner decisions and accounts that block G2–G5 | Hand-maintained |
| `feature-flags.json` | Module matrix for the Ghana advisory pack and env names | Hand-maintained |
| `sitemap.csv` | Route inventory (indexable flag, schema, audience) | Generated from `src/content/seo-routes.ts` + services |
| `keyword-page-map.csv` | Keyword-to-page map (no search volumes; all themes are hypotheses) | Generated from `src/content/seo-routes.ts` |
| `qa-report.md` | Staging QA evidence for this branch | Written per release |
| `runbook.md` | Staging deploy, rollback and production gate | Hand-maintained |

Runtime integration state (`not_configured` / `mock_verified` / `connected`) is reported by `GET /api/health` → `blueprint.integrations`. A configured credential is not a verified integration.
