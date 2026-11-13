# BuildGhana Abroad: Customer Acquisition Platform

**Build in Ghana. Stay in Control From Abroad.**

A production-ready Next.js 15 + TypeScript + Tailwind v4 site and lead infrastructure for a U.S.-led construction management business serving overseas owners building in Ghana.

> **Integration status:** every external connection (GoHighLevel, Meta CAPI, GA4, Google Ads, GTM, Upstash, Turnstile) is implemented as an adapter and is **OFF until credentials are set**. None has been connected or verified. `GET /api/health` shows which have credentials. `docs/13-qa-checklist.md` is how you verify them.


## Preview and hosting package

- **Staging / review:** https://buildghana-staging.vercel.app (noindex; production is unchanged at https://buildghana-site.vercel.app)
- **Run locally:** `npm ci --include=dev && cp .env.example .env.local && npm run dev`
- **Quality check:** `npm run typecheck && npm test && npm run build`
- **Host this build:** see [HOSTING.md](HOSTING.md) for Vercel upload, Netlify, a generic Node/pm2 VPS, and cPanel. A static HTML export is not supported — the site has API routes.

## What's included
| Area | Location |
|---|---|
| 20+ routes: home, 7 service pages, new-home hub, process, about, projects, resources (3 articles), assessment, booking, thank-you, privacy, terms | `src/app/(site)` |
| 3 paid-traffic funnels (`/lp/new-home`, `/lp/stalled-project`, `/lp/investors`) | `src/app/(lp)`, copy in `src/content/funnels.ts` |
| All page copy (editable without touching layout) | `src/content/*.ts`, `src/config/site.ts` |
| 4-step accessible lead form (prefill, step validation, abandonment tracking, consent split) | `src/components/form/LeadForm.tsx` |
| Server lead API: zod validation, honeypot, min-fill time, Turnstile, rate limit, same-origin check, idempotency, durable storage | `src/app/api/lead`, `src/lib/server/*` |
| Admin-editable lead scoring (JSON + env override) | `src/config/lead-scoring.json`, `src/lib/lead/scoring.ts` |
| GoHighLevel adapter (upsert contact, custom fields, tags, note, opportunity) | `src/lib/server/ghl.ts` |
| Meta CAPI (hashed, shared event_id dedup) + GA4 Measurement Protocol | `src/lib/server/meta-capi.ts`, `ga4-mp.ts` |
| CRM → conversions webhook (Schedule, Qualified, Paid Assessment, Contract) | `src/app/api/crm-webhook` |
| GTM + Consent Mode v2 + consent banner + first-party attribution (UTM, gclid, gbraid, wbraid, fbclid/fbc, fbp) | `src/components/tracking`, `src/lib/client` |
| SEO: metadata, canonicals, OG image, sitemap, robots, JSON-LD | `src/lib/seo.ts`, `src/app/sitemap.ts`, `robots.ts` |
| Unit tests (18) + Playwright E2E smoke script | `tests/`, `scripts/e2e-smoke.mjs` |

## Docs (deliverables)
| # | Doc |
|---|---|
| 1 | [Brand identity & messaging](docs/01-brand-messaging.md) |
| 2 | [Sitemap & funnel architecture](docs/02-sitemap-funnels.md) |
| 3–6 | Copy, website, funnels and lead capture are the code itself (see table above) |
| 7 | [GoHighLevel data mapping](docs/07-ghl-data-mapping.md) |
| 8 | [CRM automation specification](docs/08-crm-automation.md) |
| 9 | [Analytics & tracking plan + validation guide](docs/09-tracking-plan.md) |
| 10 | [Meta ads campaigns & creative](docs/10-meta-ads.md) |
| 11 | [Google Ads structure](docs/11-google-ads.md) |
| 12 | [SEO / AEO launch plan + 20 article topics](docs/12-seo-aeo.md) |
| 13 | [Testing & QA checklist](docs/13-qa-checklist.md) |
| 14 | [Deployment & runbook](docs/14-deployment.md) |
| 15 | [30/60/90-day optimisation plan](docs/15-30-60-90-plan.md) |
| + | [Intent-data layer (optional)](docs/16-intent-data-layer.md) · [Assets & visual direction](docs/17-assets-visuals.md) |

## Quick start
```bash
npm install
cp .env.example .env.local
npm run dev          # http://localhost:3000
npm test             # unit tests
npm run typecheck
npm run build
```
Deploy to Vercel: see `docs/14-deployment.md`.

## Before launch (must-do)
1. Confirm or remove every `verified: false` claim in `src/config/site.ts` (they render as dashed "to confirm before launch" boxes).
2. Set fees in `src/content/funnels.ts → FEES` (or keep "quoted in writing").
3. Legal review of `/privacy` and `/terms`. Have a Ghana-qualified professional review the articles' regulatory content.
4. Add founder photo (`founder.photo`) and any real, permitted project photography.
5. Configure integrations and pass `docs/13-qa-checklist.md`.

## Guardrails built in
- U.S. licences are never presented as authorising Ghana construction (footer + service disclaimers).
- Advisory (owner's rep) is kept separate from contracting.
- No testimonials, metrics, addresses, licences or case studies are fabricated. Placeholders are visibly labelled.
- Lead scoring ignores country of residence and all protected characteristics. Strict schema rejects unexpected fields.
- In production the API refuses leads (503) rather than silently dropping them if neither storage nor CRM is configured.
