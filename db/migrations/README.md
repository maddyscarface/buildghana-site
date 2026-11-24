# Database migrations

The deployed app persists through `src/lib/server/kv.ts` (Upstash Redis REST in production; process memory in local/staging — **not durable**, and production writes fail closed without Upstash).

`0004_phase4_ops.*.sql` describes the same Phase 4 objects for Postgres/Supabase (brand-scoped composite foreign keys, RLS brand isolation, append-only audit log). Apply with `psql "$DATABASE_URL" -f 0004_phase4_ops.up.sql`; roll back with the `.down.sql` file. Additive only: Phase 2/3 objects are not altered.

Note: `src/lib/property/model.ts` refers to `db/property-schema.sql` (Phase 3), which was never committed. That file is still outstanding.

`0005_transparency.*.sql` (Phase 5) adds the project-transparency portal objects as `tp_*` tables only: tenant-scoped composite keys, RLS tenant isolation via `request.tenant_id`, append-only triggers on audit/revision/review/inspection/approval/outbox tables, and a CHECK that a correction request carries notes. Validated locally with PGlite: applies cleanly after 0004, re-applies idempotently, append-only trigger fires, and `.down.sql` leaves the Phase 4 tables untouched. Staging runs the in-memory demo adapter; nothing is applied to any hosted database.
