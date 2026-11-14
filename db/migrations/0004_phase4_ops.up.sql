-- BuildGhana Phase 4 — ops/admin, CRM outbox and DataMoon tables (Postgres / Supabase). ADDITIVE ONLY.
-- The running app uses the KV adapter (Upstash) with the same shapes; apply this when moving to Postgres.
-- Every table carries brand_id with a composite FK so cross-brand references are impossible, and RLS
-- restricts rows to the caller's granted brands (the API server runs `set local request.brand_ids = 'buildghana'` per transaction).
begin;

create table if not exists brand (id text primary key, name text not null, created_at timestamptz not null default now());
insert into brand (id, name) values ('buildghana', 'BuildGhana') on conflict do nothing;

create table if not exists actor (
  id text primary key, name text not null, token_sha256 text, disabled boolean not null default false,
  revoked_before timestamptz, created_at timestamptz not null default now()
);
create table if not exists actor_brand_role (
  actor_id text not null references actor(id) on delete cascade, brand_id text not null references brand(id),
  role text not null check (role in ('owner','manager','marketer','estimator','operator','legal_reviewer','read_only')),
  primary key (actor_id, brand_id)
);

create table if not exists project (
  id uuid primary key, brand_id text not null references brand(id), reference text not null,
  title text not null, type text not null, status text not null, market text not null default 'unknown',
  assignee text, due_date date, sandbox boolean not null default false,
  created_source text not null, created_by text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (brand_id, id), unique (brand_id, reference)
);
create table if not exists project_link (
  brand_id text not null, project_id uuid not null, record_type text not null, record_id text not null,
  primary key (project_id, record_type, record_id), foreign key (brand_id, project_id) references project(brand_id, id) on delete cascade
);
create table if not exists project_task (
  id uuid primary key, brand_id text not null, project_id uuid not null, title text not null, due date, assignee text, done boolean not null default false,
  created_by text not null, created_at timestamptz not null default now(), foreign key (brand_id, project_id) references project(brand_id, id) on delete cascade
);
create table if not exists project_note (
  id uuid primary key, brand_id text not null, project_id uuid not null, body text not null, created_by text not null, created_at timestamptz not null default now(),
  foreign key (brand_id, project_id) references project(brand_id, id) on delete cascade
);
create table if not exists media_asset (
  id uuid primary key, brand_id text not null, project_id uuid not null, category text not null, label text not null,
  content_type text not null, size_bytes bigint not null check (size_bytes > 0), storage_key text not null unique,
  status text not null check (status in ('pending_upload','uploaded','verified','deleted')), scan text not null,
  provenance_source text not null, provenance_by text not null, verified_by text, verified_at timestamptz,
  owner_approved_by text, owner_approved_at timestamptz, created_at timestamptz not null default now(), deleted_at timestamptz,
  foreign key (brand_id, project_id) references project(brand_id, id) on delete restrict
);

create table if not exists event_outbox (
  id uuid primary key, brand_id text not null references brand(id), kind text not null, ref text not null,
  idempotency_key text not null unique, status text not null check (status in ('pending','processing','done','blocked','dead')),
  attempts int not null default 0, max_attempts int not null default 6, next_attempt_at timestamptz not null default now(),
  last_error text, processing_version int not null default 1, lineage jsonb not null default '{}', payload jsonb,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index if not exists event_outbox_due on event_outbox (status, next_attempt_at);
create table if not exists job_retry (id bigserial primary key, job_id uuid not null references event_outbox(id) on delete cascade, attempted_at timestamptz not null default now(), outcome text not null, error text);

create table if not exists audit_log (
  id uuid primary key, brand_id text not null references brand(id), at timestamptz not null default now(), actor text not null, role text not null,
  action text not null, target_type text, target_id text, detail jsonb, prev_hash text not null, hash text not null unique
);
-- Append-only: block updates/deletes.
create or replace function audit_log_immutable() returns trigger language plpgsql as $$ begin raise exception 'audit_log is append-only'; end $$;
drop trigger if exists audit_log_no_change on audit_log;
create trigger audit_log_no_change before update or delete on audit_log for each row execute function audit_log_immutable();

create table if not exists suppressions (
  brand_id text not null references brand(id), key text not null, kind text not null check (kind in ('email','contact_id')),
  reason text not null, note text, created_by text not null, created_at timestamptz not null default now(), primary key (brand_id, key)
);
create table if not exists consent_evidence (
  id bigserial primary key, brand_id text not null references brand(id), subject_type text not null, subject_id text not null,
  consents jsonb not null, source text not null, at timestamptz not null default now()
);

-- DataMoon (vendor) — separate from first-party leads, cases and property inventory.
create table if not exists audience_recipe (
  id uuid primary key, brand_id text not null references brand(id), name text not null, persona text not null, kind text not null, api text not null,
  market text not null check (market = 'US'), states text[] not null default '{}', topics jsonb not null default '[]', feed_id text,
  lookback_days int not null check (lookback_days between 1 and 14), filters jsonb not null default '[]', enrichment_bundles text[] not null default '{}',
  max_records int not null check (max_records > 0), estimated_credits int not null, purpose text not null, legal_basis text not null, destinations text[] not null,
  status text not null, owner text not null, export_approved_by text, export_approved_at timestamptz, crm_sync_approved_by text, crm_sync_approved_at timestamptz,
  synthetic boolean not null default false, version int not null default 1, last_run_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (brand_id, id)
);
create table if not exists vendor_feed (feed_id text primary key, brand_id text not null references brand(id), description text, output_type text, verified_at timestamptz);
create table if not exists vendor_export (
  export_id text primary key, brand_id text not null, recipe_id uuid, feed_id text references vendor_feed(feed_id), status text not null,
  row_count int, credits_reserved int, created_at timestamptz not null default now(), foreign key (brand_id, recipe_id) references audience_recipe(brand_id, id)
);
create table if not exists vendor_contact (
  id uuid primary key, brand_id text not null references brand(id), contact_id text not null check (contact_id ~ '^id_[0-9a-f]{16}$'),
  recipe_id uuid, import_id uuid not null, export_id text not null, first_name text, last_name text, email text, state text, match_confidence text,
  status text not null, synthetic boolean not null default false, provenance text not null default 'DataMoon', imported_at timestamptz not null default now(),
  expires_at timestamptz not null, crm_status text, crm_contact_id text, unique (brand_id, contact_id)
);
create table if not exists vendor_import_log (
  id uuid primary key, brand_id text not null references brand(id), export_id text not null, recipe_id uuid, at timestamptz not null default now(), by_actor text not null,
  dry_run boolean not null, accepted int not null, rejected int not null, duplicates int not null, suppressed int not null, reasons jsonb not null default '{}', synthetic boolean not null
);
create table if not exists vendor_webhook_event (id text primary key, received_at timestamptz not null default now(), type text not null, export_id text, feed_id text, row_count int, status text not null);
create table if not exists crm_mapping (brand_id text not null references brand(id), local_type text not null, local_id text not null, ghl_contact_id text, ghl_opportunity_id text, last_sync timestamptz, last_result text, primary key (brand_id, local_type, local_id));

-- Row-level security: brand isolation via the request.brand_ids setting (comma-separated). Service-role connections bypass RLS; use a non-owner app role.
do $$ declare t text; begin
  foreach t in array array['project','project_link','project_task','project_note','media_asset','event_outbox','audit_log','suppressions','consent_evidence','audience_recipe','vendor_contact','vendor_import_log','crm_mapping'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists brand_isolation on %I', t);
    execute format($p$create policy brand_isolation on %I using (brand_id = any (coalesce(string_to_array(current_setting('request.brand_ids', true), ','), '{}')))$p$, t);
  end loop;
end $$;

commit;
