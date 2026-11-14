# Database migrations

The deployed app persists through `src/lib/server/kv.ts` (Upstash Redis REST in production; process memory in local/staging — **not durable**, and production writes fail closed without Upstash).

`0004_phase4_ops.*.sql` describes the same Phase 4 objects for Postgres/Supabase (brand-scoped composite foreign keys, RLS brand isolation, append-only audit log). Apply with `psql "$DATABASE_URL" -f 0004_phase4_ops.up.sql`; roll back with the `.down.sql` file. Additive only: Phase 2/3 objects are not altered.

Note: `src/lib/property/model.ts` refers to `db/property-schema.sql` (Phase 3), which was never committed. That file is still outstanding.
