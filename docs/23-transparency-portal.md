# 23 — Project transparency portal (Phase 5)

Status: **staging demo** on branch `phase5-transparency`. Synthetic data only, in-memory store, no notifications sent, no money moved. Production is gated off in code (`tpConfig`: `VERCEL_ENV=production` → disabled).

## What exists
| Area | Routes | Notes |
|---|---|---|
| Public | `/project-transparency` | Indexable. 4-step flow, evidence states, limits, spec FAQ + FAQPage/Service/Breadcrumb JSON-LD, labelled synthetic portal preview (HTML mock, no photos). CTAs: See How Project Transparency Works (primary, anchors to #how-it-works) · Request Construction Oversight (`/assessment?service=owners_rep`, existing funnel) · Client Portal (`/portal/login`) · Start a Build Readiness Review. |
| Client portal | `/portal/login`, `/portal/projects`, `/portal/projects/:id` + `/updates` `/schedule` `/gallery` `/documents` `/decisions` `/budget` `/team` | Overview: last site report / office review / inspection, progress rail, needs-your-attention, "what this portal does not mean", sanitized PDF export. |
| Field (phone-first) | `/field/projects`, `/field/projects/:id/report/new[?report=]`, `/field/drafts` | Safety checklist gate → project+milestone confirm → guided shots per trade → chunked resumable upload (256 KB, retry/backoff, "simulate dropped connection") → notes (autosave server + localStorage, crew count only) → attestation → submit. Corrections reopen the same report as a new revision. |
| Office | `/office` (queue), `/office/reports/:id`, `/office/inspections`, `/office/financials`, `/office/audit` | Review (no self-review), publish, require inspection, resolve dispute; inspections with scope/method/limitations/signature (no self-inspection); milestone assessment; PM evidence review, accountant disbursement + reconciliation; change-order proposals; audit log, outbox (logged, not sent), demo reset. |
| APIs | `/api/portal/*`, `/api/field/*`, `/api/office/*` | Every handler: feature gate → session → same-origin (writes) → service-layer tenant/project/role/scope check. Unknown and forbidden both 404; denials audited. |

## Architecture
- `src/lib/transparency/` — `types` (rows), `states` (report / milestone / payment state machines, evidence vocabulary), `rbac` (role matrix, scopes, financial-visibility gate), `ledger` (separate buckets, per currency, no FX), `store` (`TransparencyStore` + `BlobStore` interfaces; `MemoryStore`; `SupabaseStore` stub that throws), `service` (all business rules), `auth` (HMAC session, timing-safe access code, failed-attempt throttle, signed 5-minute media URLs), `media` (magic-byte sniffing, limits), `seed` (Demo Accra Villa + IDOR fixtures), `export` (pdf-lib).
- Store is a `globalThis` singleton per server instance: **not durable and not shared across Vercel instances** (a cold start resets the demo). Acceptable for a demo only.
- Media bytes live in the in-memory BlobStore (200 MB cap). Seed evidence tiles are SVG diagrams labelled "SYNTHETIC DEMO · not a site photograph".

## Evidence states (what owners see)
Reported → Office reviewed → Inspected; Disputed overrides. "Inspected" requires a non-fail inspection whose `reportIds` include the report. Internal reviews are labelled "Internal review (same delivery organisation — not independent)". No "verified" wording without an inspection.

## Money
Requested, Authorised-not-paid, Disbursed-awaiting-reconciliation and Paid-reconciled are four separate figures, never summed. Only RECONCILED shows as paid. A disbursement requires an evidence document and reference. Change-order approval adjusts the approved budget only. No payment provider is connected; no money moves.

## Permission matrix (summary — source of truth `src/lib/transparency/rbac.ts`)
| Role | Sees | Can do |
|---|---|---|
| owner | published reports, gallery, schedule, documents (+financial if contract authorises), decisions, budget | respond to decisions (code-confirmed), authorise payments, raise disputes, comment, manage access (grant co_owner only), export |
| co_owner | only granted scopes (default reports/gallery/schedule) | comment; budget/documents only if granted **and** project financial visibility is authorised |
| field_supervisor | all submitted reports, own drafts | create/edit own drafts, upload, submit |
| project_manager | everything incl. drafts list (not others' draft content) | review, publish, assess milestones, forecast edits, change orders, payment evidence review, resolve disputes, audit |
| inspector | reports, gallery, schedule, documents | record inspections (not on own reports) |
| accountant | budget, financial docs, audit | record disbursements, reconcile |
| contractor | published reports for own work package, schedule | payment requests, comments |
| ops_admin | same-tenant admin | access, demo reset, audit |

## Privacy / tracking
- `/portal`, `/field`, `/office` (+ APIs): `X-Robots-Tag: noindex, nofollow, noarchive`, `Cache-Control: private, no-store`, `Referrer-Policy: no-referrer`, meta robots noindex, robots.txt disallow.
- `TrackingGate` removes GA4/GTM/Meta/marketing tags, consent banner and sticky CTA on those paths; `isUntrackedPath` covers them. A unit test statically scans `src/lib/transparency` for ghl/kv/datamoon/analytics/fetch imports.
- Outbox text is neutral ("A new project update has been reviewed. Sign in…") — never amounts, media, document links or tokens. Status `logged_not_sent`.
- GHL mapping: **none**. The portal sends nothing to GHL. If the owner later wants CRM signals, only non-sensitive events (e.g. `portal_invite_accepted`, no project data) should be mapped, after approval.

## Env vars (names only)
`TRANSPARENCY_DEMO`, `TRANSPARENCY_SESSION_SECRET` (≥32), `TRANSPARENCY_DEMO_ACCESS_CODE` (≥12), reserved `TRANSPARENCY_STORE`. Staging values are passed per deployment (`vercel deploy -e/-b`), not saved in project settings.

## Runbook
- Local: `npm run build && TRANSPARENCY_DEMO=true TRANSPARENCY_SESSION_SECRET=… TRANSPARENCY_DEMO_ACCESS_CODE=… npx next start`.
- Tests: `npx vitest run` (unit, incl. `tests/transparency.test.ts`); `node tests/e2e-transparency/e2e.mjs` (demo script, 62 checks); `node tests/e2e-transparency/sweep.mjs` (all routes × 2 viewports × personas: status, overflow, console).
- Reset demo: Office → Audit & notifications → Reset demo data (ops_admin), or redeploy.
- Rotate demo code/secret: redeploy with new `-e` values; old sessions die with the secret.

## Needed before any real client data (blocked)
1. Postgres/Supabase project → apply `db/migrations/0005_transparency.up.sql`, implement `SupabaseStore`.
2. Private object storage (R2/S3) with signed URLs → implement `BlobStore`; server-side upload sessions.
3. Identity provider with invites, email verification and MFA for privileged roles (replaces the shared demo code).
4. Malware/content scanner for uploads (`scan_status` is `not_scanned`).
5. Email/SMS/WhatsApp provider + opt-in records; owner-approved notification texts.
6. Real inspector organisations with verified credentials (none are invented here).
7. Owner decisions in spec 06 §B.
