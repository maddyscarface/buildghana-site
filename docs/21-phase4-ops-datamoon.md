# 21 — Phase 4: Ops admin, CRM outbox, DataMoon (US prospects only)

## Scope rules
- DataMoon audiences are **United States** prospects only (`market: "US"` enforced by the recipe schema and the importer).
  BuildGhana makes **no Ghana-coverage claims** for DataMoon. Ghana residents keep using the first-party intake (Readiness Review, property inquiry, lead forms).
- **No ethnicity, ancestry, national-origin, diaspora, religion, immigration or language-proxy targeting**: blocked by `PROHIBITED_FIELD` / `PROHIBITED_TERMS` in `src/lib/datamoon/recipes.ts` (filters, topics, intent text, persona and purpose).
- Vendor prospects are stored separately from first-party leads (`dm:contact:*`), tagged `datamoon-prospect` + `no-auto-outreach` in GHL, carry **no consent tags**, no phone and no opportunity, and expire after `DATAMOON_RETENTION_DAYS`.
- Every flag defaults OFF. With no keys the vendor shows `disabled` / `not_connected`. Synthetic fixtures (labelled "SYNTHETIC FIXTURE — not DataMoon data") work outside production only.

## Admin (/admin/ops)
- Auth: bearer token → server session cookie `bga_ops` (HttpOnly, Secure, SameSite=Strict, 8 h). Deny by default; locked (404) with no staff configured.
- Roles: owner, manager, marketer, estimator, operator, legal_reviewer, read_only (matrix in `src/lib/ops/rbac.ts`). Brand grants checked on every request; cookie writes require same-origin (CSRF).
- Tabs: Overview, Records (search leads/readiness/property/projects/vendor prospects; PII masked without `records.pii`; CSV export with allowlist + formula-injection guard), Projects (private documents via signed upload/download URLs, validation by type/size/label), Queues (links to the existing Readiness and Property consoles), CRM (outbox status, run/replay), DataMoon (topics, recipes, approvals, synthetic run, CSV import with dry-run), Suppressions, Reports, Staff, Health, Audit (hash-chained, verifiable).
- Readiness and Property consoles from Phase 3 (`/admin/readiness`, `/admin/property`) are unchanged; there is no estimator.

## CRM outbox
`src/lib/ops/outbox.ts`: idempotent enqueue (idempotency key), per-job lock, exponential backoff (1 min → 6 h, 6 attempts → dead), `skipped` → blocked (no attempt used). Lead, readiness and property GHL failures enqueue jobs; the cron worker (`/api/cron/outbox`, Bearer `CRON_SECRET`) or the CRM tab re-runs the existing sync functions.

## DataMoon webhook
`POST /api/webhooks/datamoon/exports`: 404 unless `DATAMOON_INTENT_ENABLED` and `DATAMOON_INTENT_WEBHOOK_SECRET` are set. Verifies `Webhook-Signature: v1=<hex>` = HMAC-SHA256(secret, `${Webhook-Timestamp}.${rawBody}`) with ±300 s tolerance in constant time. It dedupes on the event id (at-least-once delivery), ignores test and unmapped-feed events, stashes the 24 h download URL server-side and queues the import. It replies 2xx fast.

## Approvals before any billable call
Recipe approve (owner) → export approval (owner) → `DATAMOON_AUDIENCE_ACTIVATION_BUILDGHANA=true` → quota guard (`DATAMOON_RECORD_CEILING`, `DATAMOON_MONTHLY_RECORD_BUDGET`, org credits, feed rows). CRM sync needs a separate owner approval plus `DATAMOON_GHL_SYNC_ENABLED`.
