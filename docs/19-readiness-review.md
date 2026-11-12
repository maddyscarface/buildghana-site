# 19 — Ghana Build Readiness Review (Phase 2)

A paid, document-based review that tells an overseas owner whether their Ghana project is ready to build.
Public pages: `/ghana-build-readiness-review` (landing) → `/ghana-build-readiness-review/start` (intake) →
hosted checkout → `/ghana-build-readiness-review/case/<id>?t=<token>` (private status, uploads, report).
Admin: `/admin/readiness` (requires `ADMIN_TOKEN`).

## 1. Flow

| Step | What happens | Code |
|---|---|---|
| A. Intake | 5-step form: contact, land (region, acquisition route, document type, who's on the ground), project (use, stage, budget, timeline, what to answer), **document inventory** (12 documents: have / don't have / not sure; ✦ = needed by counsel), consent. Honeypot + 4 s timing guard + rate limit. Idempotent on `submission_id`. | `src/components/readiness/IntakeForm.tsx`, `POST /api/readiness/intake`, `service.createCase` |
| Checkout | Client picks Stripe (USD card) or Paystack (GHS card/mobile money). Server creates a hosted session with an idempotency key; nothing card-related touches our servers. | `POST /api/readiness/checkout`, `payments/stripe.ts`, `payments/paystack.ts` |
| Payment confirmation | **Only** the provider webhook marks a case paid (signature verified, event id claimed once, amount checked). The success redirect never grants access. | `webhooks/stripe`, `webhooks/paystack`, `webhook.ts`, `service.handlePaymentEvent` |
| Uploads | Open after payment. Browser asks for a signed URL (type + size checked), PUTs the file directly to storage, then confirms; the server sniffs magic bytes before accepting. Every step is audit-logged. | `case/[id]/uploads`, `storage/*` |
| Review | Admin works the queue: status, per-area findings (ready / attention / not ready), summary, notes, documents (signed links). | `/admin/readiness`, `api/admin/readiness/*` |
| Title (counsel-gated) | Separate track. Sign-off needs counsel firm + lawyer of record + reference. The report cannot be marked ready/delivered until title is signed off, marked *unable to verify*, or *not in scope*. Wording comes from `titleStatement()` and never claims verification counsel didn't record. | `model.ts` (`canTitleTransition`, `canTransition`) |
| Report | Server-side branded PDF (pdf-lib). Admin can generate a watermarked DRAFT at any time; the client can download only after **Deliver**. | `report.ts`, `api/admin/readiness/[id]/report`, `api/readiness/case/[id]/report` |

### Status model
Case: `intake_submitted → awaiting_payment → (payment_failed) → paid → awaiting_documents → documents_received → in_review → report_drafting → report_ready → delivered` plus `on_hold`, `cancelled`, `refunded`.
Title: `not_started → awaiting_documents → referred_to_counsel → counsel_in_progress → counsel_findings_received → counsel_signed_off` or `unable_to_verify` / `not_in_scope`.
Allowed transitions are in `src/lib/readiness/model.ts` and unit-tested (`tests/readiness.test.ts`).

## 2. Modes and the env vars that switch them on

| Piece | Without env (default) | Activated by |
|---|---|---|
| Price | "Price set by owner" shown everywhere. Real checkout refuses to start. Sandbox uses a labelled 1.00 test amount. | Admin → Price, or `READINESS_PRICE_USD` / `READINESS_PRICE_GHS` / `READINESS_TURNAROUND_DAYS` |
| Payments | **Mock checkout** on non-production deployments (`/ghana-build-readiness-review/checkout/sandbox`), which sends a signed synthetic webhook through the same handler. Disabled on production. | `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`; `PAYSTACK_SECRET_KEY`. `PAYMENTS_FORCE_MOCK=1` keeps the mock on staging. |
| Storage | Local adapter: OS temp dir, 4 MB/file (Vercel body limit), **not durable** on serverless. | `DOCS_S3_BUCKET`, `DOCS_S3_ENDPOINT`, `DOCS_S3_REGION`, `DOCS_S3_ACCESS_KEY_ID`, `DOCS_S3_SECRET_ACCESS_KEY` (S3 or R2; 25 MB/file, direct browser PUT via SigV4 presigned URL) |
| Case data | In-memory KV fallback, per instance (sandbox only). | `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` |
| Links | Insecure dev secrets (logged warning). | `READINESS_TOKEN_SECRET`, `DOCS_SIGNING_SECRET` |
| Admin | Locked (page explains; APIs 404). | `ADMIN_TOKEN` (≥16 chars) |
| GHL | Logged no-op `[ghl:noop]`. | `GHL_PRIVATE_TOKEN`, `GHL_LOCATION_ID`, `GHL_RR_PIPELINE_ID`, `GHL_RR_STAGE_IDS` |
| Conversions | Sandbox payments never fire ad conversions. Live: Meta CAPI, GA4 MP, OpenAI CAPI, Google Ads hook, intent vendor — each only if configured and consented. | see `.env.example` |

`/api/health` reports every one of these.

## 3. GoHighLevel
- Contact upsert is duplicate-safe (`upsertContactMinimal`: search by email → update, else create) with **minimal fields only**: name, email, phone, region, case status. **No documents, document names or findings go to GHL.**
- Tags: `rr-intake`, `rr-paid`, `rr-delivered`, … and `rev-readiness-review` so review revenue can be filtered from construction revenue.
- Opportunity upsert in its own pipeline (`GHL_RR_PIPELINE_ID`), stage from `rrStageFor()`; status won on delivery, lost on cancel/refund. Monetary value = amount paid.
- Lead score: the website-lead score sync is unchanged; readiness cases add `rr-*` tags, which GHL workflows can use to bump score.
- Website-lead opportunities are now duplicate-safe too (search before create) and honour `GHL_STAGE_IDS`.

## 4. Tracking events (consent-gated, deduped)
Browser: `readiness_view`, `readiness_intake_start`, `readiness_step`, `readiness_intake_submit`, `begin_checkout`, `purchase` (only on a confirmed, non-sandbox case), `document_upload`, `report_download`. Forwarded to the dataLayer (GTM), and to gtag / fbq when those are configured directly.
Server: on confirmed payment, `Purchase` to Meta CAPI, `purchase` to GA4 MP, `order_created` to OpenAI CAPI and the Google Ads offline hook, all with event id `rr_purchase_<caseId>` so browser and server dedupe.
Attribution: UTMs and click ids (gclid, gbraid, wbraid, fbclid, msclkid, ttclid, li_fat_id, OpenAI refs) persist first/last touch and are stored on the case. Revenue goes to its own stream `readiness_review` (admin shows live vs sandbox totals per currency).

## 5. Security notes
- Private case links are HMAC tokens; wrong token = 404. Pages are `noindex`, `Cache-Control: private, no-store`.
- Upload allow-list: PDF, JPEG, PNG, WEBP, HEIC/HEIF. Magic-byte check on confirm. 40 files per case. Signed URLs expire after 10 minutes.
- Admin: bearer token, constant-time compare, rate limited, every action audit-logged.
- Stripe webhook: `t=…,v1=…` HMAC-SHA256, 5-minute tolerance. Paystack: HMAC-SHA512 `x-paystack-signature`. Mock: HMAC with `READINESS_MOCK_WEBHOOK_SECRET`, unavailable on production.

## 6. Go-live checklist (owner)
1. Set the price (admin or env) and turnaround.
2. Create the Upstash database and an S3/R2 private bucket (CORS: allow PUT from the site origin, header `content-type`).
3. Generate `READINESS_TOKEN_SECRET`, `DOCS_SIGNING_SECRET`, `ADMIN_TOKEN`.
4. Stripe and/or Paystack keys + webhooks (URLs above). Run one test-mode payment end to end. Confirm a Stripe refund webhook maps back to the case (charge metadata); if not, refund from the admin.
5. Engage Ghanaian counsel; agree the title-search scope, fees and how findings are recorded.
6. Create the GHL pipeline + stages, put the IDs in `GHL_RR_STAGE_IDS`.
7. Review the PDF template wording with counsel (scope & limits section).
8. Test: `npm test`, `node scripts/smoke-readiness.mjs <url>`, `node tests/e2e-readiness/e2e.mjs <url>` (staging only — needs mock payments).
