# 19 — Ghana Build Readiness Review (Phase 2)

A paid pre-construction review for overseas owners: a **documented site visit**, a professional review of paperwork,
drawings and budget, a **counsel-led title check**, a **permit checklist**, a **preliminary GHS/USD cost range** and a
**human-approved recommendation** (proceed · proceed after conditions · pause). Built to `01_BUILDGHANA_CURSOR_BUILD.md`.

Public routes: `/ghana-build-readiness-review` (landing) → `/start` (intake, autosaved) → hosted checkout →
`/case/<id>?t=<token>` (private status, uploads, report, acknowledgment). Aliases: `/status?case=<id>&t=<token>`
(used in emails), `/payment?case=<id>&t=<token>` (payment handoff → case page). Admin: `/admin/readiness` (`ADMIN_TOKEN`).

## 1. Flow

| Step | What happens | Code |
|---|---|---|
| A. Intake | 5 steps: **contact** (name, email, phone, residence country, preferred contact method, time zone) · **parcel** (region, district/assembly, locality, GhanaPost/GPS, map pin from a pasted Google Maps link or coordinates, plot number, area + unit, access, who controls the land, acquired?, optional site contact) · **project & budget** (use: single-family / multifamily / commercial / mixed / renovation / other; floor area, units, floors, finish, description; budget band + currency GHS/USD, funds, land included, start month, design status, optional add-ons to quote) · **land paperwork** (9 documents, each available / missing / uncertain — missing paperwork never blocks) · **scope & consent** (authority, privacy, scope, site-contact permission when a site contact is given, optional marketing). Draft autosaves to `localStorage` and resumes (consents are never pre-ticked). Honeypot + 4 s timing guard + rate limit; idempotent on `submission_id`. | `IntakeForm.tsx`, `POST /api/readiness/intake`, `service.createCase` |
| Uploads | Available from intake onwards (missing documents can be added later without starting over). Signed URL (type + size checked) → direct PUT → confirm; magic bytes sniffed before acceptance; marks the inventory item available. Uploading never changes the title status. | `case/[id]/uploads`, `storage/*` |
| B. Fees & checkout | `BASE_REVIEW_FEE` (USD and/or GHS) charged via Stripe (USD) or Paystack (GHS). Add-ons (title verification by counsel, expedited, third-party checks, travel outside coverage) are **never charged at checkout** — quoted per case and charged only with client approval. FX rate + source + date shown wherever two currencies appear. Server-side sessions with idempotency keys. | `pricing.ts`, `FeeSummary.tsx`, `POST /api/readiness/checkout` |
| Payment confirmation | **Only** the verified webhook marks a case paid (signature, event id claimed once, amount checked). Receipts come from the processor. Refunds: processor webhook or admin "mark refunded" (after refunding in the processor) — revenue stream gets a negative entry. | `webhooks/*`, `service.handlePaymentEvent`, `markRefunded` |
| C. Operations | Admin queue with case number (`BGR-YYMM-XXXXXX`), assigned reviewer, due date, jurisdiction, tasks/checklist; **site visit** scheduling + inspection record (access, boundaries, slope/drainage, neighbours, utilities, risks, survey, measurements, unknowns; ≥5 items, date not in future) + site photos; **counsel-owned title** (firm, lawyer, reference, official search ref, findings, limitations); **permit checklist** (required / possibly required / not applicable / pending confirmation, authority, source link, last checked); **cost range** (GHS low/base/high manual or from versioned cost assumptions × m², USD via FX, assumptions, confidence); **recommendation** + QA approval; notes, signed document links, audit log. | `AdminDashboard.tsx`, `api/admin/readiness/*`, `service.adminAct` |
| D. Report | Versioned PDF: cover, 1 parcel & project, 2 site visit (PENDING banner if not documented — cannot be final), 3 land & title (counsel-owned; `titleStatement()`), 4 permit checklist, 5 cost range (GHS + USD, FX source/date, assumptions version, "not a quote"), 6 recommendation (+ approver), 7 optional next step, scope & limits. Drafts are watermarked; every draft/final is recorded in report history. Delivery = authenticated download on the case page + **link-only** email (Resend, or logged no-op) + client "I've received my report" acknowledgment. | `report.ts`, `notify.ts`, `api/admin/readiness/[id]/report`, `api/readiness/case/[id]/report` |

### Status model (spec §2 Step B)
`draft` (browser autosave) → `awaiting_payment` (→ `payment_failed`) → `paid` → `intake_incomplete` → `scheduling` →
`site_visit_completed` → `documents_under_review` → `legal_title_check_pending` → `legal_title_check_complete` →
`report_drafting` → `internal_qa` → `delivered` → `follow_up`; side states `needs_more_documents`, `on_hold`, `cancelled`, `refunded`.

Gates (unit-tested): work states need confirmed payment · `site_visit_completed` needs a documented visit · `legal_title_check_complete` needs a counsel outcome · `internal_qa` / `delivered` need a documented visit, a title outcome (or *not commissioned*) and a recommendation · `delivered` needs a named QA approver. Editing a recommendation voids its approval.

Title (counsel-gated): `unverified → in_progress → verified_with_qualifications | adverse_findings | unable_to_determine`, or `not_commissioned`. Starting needs assigned counsel; any outcome needs firm + lawyer + reference.

## 2. Modes and the env vars that switch them on

| Piece | Without env (default) | Activated by |
|---|---|---|
| Fees | "Price set by owner" everywhere; real checkout refuses to start. Sandbox uses a labelled 1.00 test amount. | Admin → Fees & settings, or `BASE_REVIEW_FEE_USD` / `BASE_REVIEW_FEE_GHS` / `READINESS_TURNAROUND_DAYS` |
| FX / coverage / refunds | "set by owner" notices; cost ranges can't be saved without FX. | Admin settings, or `READINESS_FX_USD_GHS` + `READINESS_FX_SOURCE` + `READINESS_FX_DATE`, `READINESS_COVERAGE`, `READINESS_REFUND_POLICY` |
| Cost assumptions | Manual GHS ranges only. | Admin → publish versioned GHS/m² benchmarks (owner-supplied) |
| Payments | **Mock checkout** on non-production deployments (signed synthetic webhook through the same handler). Disabled on production. | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`; `PAYSTACK_SECRET_KEY`. `PAYMENTS_FORCE_MOCK=1` keeps the mock on staging. |
| Storage | Local adapter (OS temp dir, 4 MB/file, **not durable** on serverless). | `DOCS_S3_BUCKET`, `DOCS_S3_ENDPOINT`, `DOCS_S3_REGION`, `DOCS_S3_ACCESS_KEY_ID`, `DOCS_S3_SECRET_ACCESS_KEY` |
| Case data | In-memory KV, per instance (sandbox only). Production refuses intake without it. | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |
| Links | Dev secrets (warning). Production refuses intake without the token secret. | `READINESS_TOKEN_SECRET`, `DOCS_SIGNING_SECRET` |
| Admin | Locked (page explains; APIs 404). | `ADMIN_TOKEN` (≥16 chars) |
| Client email | Logged no-op `[readiness] email noop` (no real emails from staging). | `RESEND_API_KEY` + `READINESS_EMAIL_FROM` (+ `READINESS_EMAIL_REPLY_TO`) |
| GHL | Logged no-op `[ghl:noop]` with stage + lead score. | `GHL_PRIVATE_TOKEN`, `GHL_LOCATION_ID`, `GHL_RR_PIPELINE_ID`, `GHL_RR_STAGE_IDS` |
| Conversions | Sandbox cases never fire conversions. Live: GA4 MP lifecycle events; Meta CAPI / OpenAI / Google Ads only with ad consent. | see `.env.example` |
| Intent (DataMoon/AudienceLab) | Disabled vendor abstraction. | `INTENT_ENABLED=true` + vendor + key |

`/api/health` reports each of these.

## 3. GoHighLevel
Spec pipeline stages (`GHL_RR_STAGE_IDS` keys): `new_inquiry`, `intake_started`, `payment_pending`, `paid_review`, `documents_incomplete`, `site_visit_scheduled`, `legal_title_check`, `report_delivered`, `pm_proposal`, `won`, `lost` (mapping in `rrStageFor()`; PM proposal / won / lost set from the admin "Engagement" buttons). Minimal fields only: contact basics, project type, region (coarse location), budget band, lead score, source, admin case URL (no client token). **Never** deeds, documents, document names, counsel findings or notes. Tag `rev-readiness-review` keeps review revenue separable. Early stages are wired and **forward-only** (`planForwardOnly()`): an existing opportunity is only ever moved to a *later* stage, never back, and closed (won/lost) opportunities are never reopened.
- `new_inquiry` — every general website lead (`/api/lead` → `syncLeadToGhl`) also gets an opportunity in `GHL_RR_PIPELINE_ID` at `new_inquiry` (create-only; the construction pipeline `GHL_PIPELINE_ID` is unchanged).
- `intake_started` — when a visitor completes step 1 (contact) of the intake, the browser posts once to `/api/readiness/draft` (once per draft + email, flag in localStorage). The server dedupes again with a KV set-if-absent per hashed email (30 days), upserts the contact with contact basics only and writes the opportunity at `intake_started` (moves a `new_inquiry` opportunity forward; leaves later stages alone). On a GHL error the KV lock is released so a later save retries. The step-1 screen tells the visitor their contact details are kept so they can resume.
- From submission on, `syncCaseToGhl()` moves the case through the remaining stages.
Tests: `tests/ghl-funnel.test.ts` (mocked GHL API).

## 4. Tracking events (spec names; consent-gated, deduped, no PII)
Browser (dataLayer → GTM; gtag/fbq only if loaded with consent): `readiness_view`, `readiness_started`, `document_inventory_completed`, `checkout_started`, `payment_confirmed` (confirmed, non-sandbox only; Meta `Purchase` / Google Ads purchase label), plus `readiness_step`, `readiness_intake_submit`, `document_upload`, `report_download`, `report_acknowledged`.
Server (GA4 MP, one per case via `claimEvent`, sandbox skipped): `payment_confirmed`, `site_visit_booked`, `report_delivered`, `qualified_project_consultation` (PM proposal), `project_won`. Meta CAPI / OpenAI / Google Ads offline upload only with ad consent. Revenue is its own stream (`readiness_review`), separate from lead events.

## 5. Security notes
- Private case links are HMAC tokens; wrong token = 404. Pages `noindex`, `no-store`.
- Upload allow-list PDF/JPEG/PNG/WEBP/HEIC; magic-byte check; 40 files/case; signed URLs expire in 10 min; every issue/confirm/download audit-logged. Malware scanning: not implemented (type sniffing only) — add bucket-side scanning (e.g. R2/S3 + ClamAV/GuardDuty) before go-live.
- Admin: bearer token, constant-time compare, rate limited, audit-logged.
- Webhooks: Stripe `t=,v1=` HMAC-SHA256 (5-min tolerance); Paystack HMAC-SHA512; mock HMAC, unavailable on production.

## 6. Go-live checklist (owner)
1. Base fee, add-on prices (or "quoted"), turnaround, coverage text, refund/cancellation terms, FX source.
2. Cost benchmarks (GHS/m² per finish level) from a QS — publish as v1.
3. Upstash + private S3/R2 bucket (CORS PUT from the site origin) + malware scanning.
4. Secrets: `READINESS_TOKEN_SECRET`, `DOCS_SIGNING_SECRET`, `ADMIN_TOKEN`.
5. Stripe and/or Paystack keys + webhooks; one test-mode payment and one refund end to end.
6. Engage Ghanaian counsel (scope, fees, how findings are recorded); site inspector(s) and coverage area.
7. GHL pipeline + stages → `GHL_RR_STAGE_IDS`; custom field IDs → `GHL_CUSTOM_FIELD_IDS`.
8. Counsel review of report wording (scope & limits, title section).
9. Tests: `npm test`, `SMOKE_ADMIN_TOKEN=… node scripts/smoke-readiness.mjs <url>`, `node tests/e2e-readiness/e2e.mjs <url>` (staging only).
