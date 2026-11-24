-- BuildGhana Phase 5 — Project transparency portal (Postgres / Supabase). ADDITIVE ONLY: new tp_* objects; nothing existing is altered.
-- The staging demo runs on the in-memory adapter (src/lib/transparency/store.ts) with identical shapes. Apply this when
-- a Supabase/Postgres project is provisioned, then implement SupabaseStore against it.
-- Tenant isolation: every row has tenant_id; composite FKs (tenant_id, id) make cross-tenant references impossible and RLS
-- restricts rows to `current_setting('request.tenant_id')`, set per transaction by the API server (service role never reaches the browser).
-- Project/role/scope checks stay in the service layer (src/lib/transparency/rbac.ts) AND are mirrored by RLS on membership.
begin;
create extension if not exists citext;

create table if not exists tp_tenant (id text primary key, name text not null, created_at timestamptz not null default now());
create table if not exists tp_organization (
  id text not null, tenant_id text not null references tp_tenant(id), name text not null,
  kind text not null check (kind in ('delivery','client','independent_inspector','contractor')),
  primary key (tenant_id, id)
);
create table if not exists tp_user (
  id text not null, tenant_id text not null references tp_tenant(id), org_id text not null, name text not null,
  email citext not null, staff_role text check (staff_role in ('ops_admin','project_manager','field_supervisor','inspector','accountant')),
  timezone text not null default 'Africa/Accra', mfa_enrolled boolean not null default false, disabled boolean not null default false,
  sessions_revoked_before timestamptz, created_at timestamptz not null default now(),
  primary key (tenant_id, id), unique (tenant_id, email), foreign key (tenant_id, org_id) references tp_organization(tenant_id, id)
);
create table if not exists tp_project (
  id text not null, tenant_id text not null references tp_tenant(id), code text not null, name text not null,
  location_public text not null, -- city/district only; precise location lives in tp_project_private
  service_model text not null check (service_model in ('owners_representative','construction_delivery')),
  financial_visibility text not null check (financial_visibility in ('contract_authorized','not_authorized')),
  pm_user_id text not null, timezone text not null default 'Africa/Accra', synthetic boolean not null default false,
  created_at timestamptz not null default now(), primary key (tenant_id, id), unique (tenant_id, code)
);
create table if not exists tp_project_private (tenant_id text not null, project_id text not null, precise_location text, primary key (tenant_id, project_id), foreign key (tenant_id, project_id) references tp_project(tenant_id, id) on delete cascade);
create table if not exists tp_membership (
  id text not null, tenant_id text not null, project_id text not null, user_id text not null,
  role text not null check (role in ('ops_admin','project_manager','field_supervisor','inspector','owner','co_owner','accountant','contractor')),
  scopes text[] not null default '{}', work_package_ids text[], invited_by text, granted_at timestamptz not null default now(),
  invitation_expiry timestamptz, revoked_at timestamptz, revoked_by text,
  primary key (tenant_id, id), unique (tenant_id, project_id, user_id),
  foreign key (tenant_id, project_id) references tp_project(tenant_id, id), foreign key (tenant_id, user_id) references tp_user(tenant_id, id)
);
create table if not exists tp_work_package (id text not null, tenant_id text not null, project_id text not null, trade text not null, code text not null, title text not null, lead_id text not null, contractor_org_id text, primary key (tenant_id, id), foreign key (tenant_id, project_id) references tp_project(tenant_id, id));
create table if not exists tp_milestone (
  id text not null, tenant_id text not null, project_id text not null, work_package_id text not null, phase int not null, title text not null,
  baseline_start date not null, baseline_end date not null, forecast_start date not null, forecast_end date not null, weight numeric not null default 0,
  status text not null check (status in ('NOT_STARTED','REPORTED_IN_PROGRESS','UNDER_REVIEW','APPROVED_PROGRESS','COMPLETE_VERIFIED')),
  overlays text[] not null default '{}', requires_inspection boolean not null default false, blockers text[] not null default '{}', responsible text not null,
  version int not null default 1, primary key (tenant_id, id), foreign key (tenant_id, project_id) references tp_project(tenant_id, id), foreign key (tenant_id, work_package_id) references tp_work_package(tenant_id, id)
);
create table if not exists tp_site_report (
  id text not null, tenant_id text not null, project_id text not null, milestone_id text not null, work_package_id text not null, author_id text not null,
  status text not null check (status in ('DRAFT','SUBMITTED','NEEDS_CORRECTION','OFFICE_REVIEWED','INSPECTION_PENDING','PUBLISHED','VERIFIED','DISPUTED','ARCHIVED')),
  status_before_dispute text, draft jsonb not null, created_at timestamptz not null default now(), published_at timestamptz, version int not null default 1, synthetic boolean not null default false,
  primary key (tenant_id, id), foreign key (tenant_id, milestone_id) references tp_milestone(tenant_id, id), foreign key (tenant_id, author_id) references tp_user(tenant_id, id)
);
-- Submitted revisions are immutable rows (append-only), never an updated JSON array.
create table if not exists tp_report_revision (
  tenant_id text not null, report_id text not null, revision int not null, content jsonb not null, media_ids text[] not null,
  captured_at timestamptz, submitted_at timestamptz not null, server_received_at timestamptz not null default now(), submitted_by text not null,
  attestation_text text not null, attestation_at timestamptz not null, idempotency_key text,
  primary key (tenant_id, report_id, revision), foreign key (tenant_id, report_id) references tp_site_report(tenant_id, id), unique (tenant_id, report_id, idempotency_key)
);
create table if not exists tp_media_asset (
  id text not null, tenant_id text not null, project_id text not null, report_id text not null, revision int not null,
  stage text not null check (stage in ('overview','before','during','after','detail')), caption text not null default '',
  object_key text not null, -- private bucket key; never a public URL
  mime text not null, size_bytes bigint not null check (size_bytes > 0), received_bytes bigint not null default 0, sha256 char(64),
  upload_state text not null check (upload_state in ('pending','complete','rejected')), reject_reason text,
  scan_status text not null default 'not_scanned' check (scan_status in ('not_scanned','clean','quarantined')),
  device_captured_at timestamptz, server_received_at timestamptz, uploader_id text not null,
  provenance text not null check (provenance in ('synthetic_placeholder','device_upload')),
  visibility_class text not null default 'project' check (visibility_class in ('project','staff_only')), idempotency_key text, created_at timestamptz not null default now(),
  primary key (tenant_id, id), unique (tenant_id, object_key), foreign key (tenant_id, report_id) references tp_site_report(tenant_id, id)
);
create table if not exists tp_report_review (id text not null, tenant_id text not null, project_id text not null, report_id text not null, revision int not null, reviewer_id text not null, decision text not null check (decision in ('approve','request_correction','publish','require_inspection')), notes text not null default '', created_at timestamptz not null default now(), primary key (tenant_id, id), foreign key (tenant_id, report_id) references tp_site_report(tenant_id, id), check (decision <> 'request_correction' or length(notes) > 0));
create table if not exists tp_inspection (id text not null, tenant_id text not null, project_id text not null, milestone_id text not null, inspector_id text not null, independence text not null check (independence in ('independent_third_party','internal_review')), credential_reference text not null, credential_verified boolean not null default false, result text not null check (result in ('pass','fail','pass_with_conditions')), scope text not null, methods text not null, limitations text not null, report_ids text[] not null, inspected_at timestamptz not null, signature text not null, created_at timestamptz not null default now(), synthetic boolean not null default false, primary key (tenant_id, id), foreign key (tenant_id, milestone_id) references tp_milestone(tenant_id, id));
create table if not exists tp_dispute (id text not null, tenant_id text not null, project_id text not null, report_id text not null, raised_by text not null, reason text not null, status text not null check (status in ('open','resolved')), resolution text, resolved_by text, created_at timestamptz not null default now(), resolved_at timestamptz, primary key (tenant_id, id), foreign key (tenant_id, report_id) references tp_site_report(tenant_id, id));
create table if not exists tp_change_order (id text not null, tenant_id text not null, project_id text not null, number text not null, description text not null, source_doc text not null, proposed_delta_minor bigint not null, approved_delta_minor bigint, currency char(3) not null, cost_code text not null, status text not null check (status in ('PROPOSED','AWAITING_OWNER','APPROVED','REJECTED','SUPERSEDED')), supersedes text, approved_at timestamptz, approved_by text, created_at timestamptz not null default now(), version int not null default 1, primary key (tenant_id, id), unique (tenant_id, project_id, number));
create table if not exists tp_decision_request (id text not null, tenant_id text not null, project_id text not null, type text not null, title text not null, description text not null, requested_by text not null, assigned_to text not null, deadline date not null, status text not null check (status in ('OPEN','APPROVED','REJECTED','CLARIFICATION_REQUESTED','WITHDRAWN')), payload_version int not null default 1, change_order_id text, created_at timestamptz not null default now(), version int not null default 1, primary key (tenant_id, id));
create table if not exists tp_decision_vote (tenant_id text not null, decision_id text not null, user_id text not null, action text not null check (action in ('approve','reject','clarify')), comments text not null default '', acted_at timestamptz not null default now(), payload_version int not null, confirmation text not null, primary key (tenant_id, decision_id, user_id, acted_at), foreign key (tenant_id, decision_id) references tp_decision_request(tenant_id, id));
create table if not exists tp_budget_line (id text not null, tenant_id text not null, project_id text not null, cost_code text not null, label text not null, baseline_minor bigint not null, committed_minor bigint not null default 0, currency char(3) not null, primary key (tenant_id, id));
create table if not exists tp_payment_request (id text not null, tenant_id text not null, project_id text not null, milestone_id text not null, number text not null, amount_minor bigint not null check (amount_minor > 0), currency char(3) not null, payee text not null, cost_code text not null, supporting_evidence text[] not null default '{}', status text not null check (status in ('DRAFT','SUBMITTED','EVIDENCE_REVIEW','AWAITING_OWNER_APPROVAL','APPROVED_FOR_PAYMENT','PAID_PENDING_RECONCILIATION','RECONCILED','REJECTED','CANCELLED')), submitted_by text not null, created_at timestamptz not null default now(), version int not null default 1, primary key (tenant_id, id), unique (tenant_id, project_id, number));
create table if not exists tp_payment_status_history (tenant_id text not null, payment_request_id text not null, status text not null, by_user text not null, at timestamptz not null default now(), note text not null default '', primary key (tenant_id, payment_request_id, at, status));
create table if not exists tp_payment_approval (id text not null, tenant_id text not null, project_id text not null, payment_request_id text not null, approver_id text not null, stage text not null check (stage in ('evidence_review','owner_authorization')), decision text not null check (decision in ('approve','reject','clarify')), reason text not null default '', created_at timestamptz not null default now(), primary key (tenant_id, id));
create table if not exists tp_disbursement (id text not null, tenant_id text not null, project_id text not null, payment_request_id text not null, paid_minor bigint not null check (paid_minor > 0), currency char(3) not null, paid_at date not null, source text not null check (source in ('manual_bank_evidence','payment_system_event')), source_reference text not null, evidence_doc_id text not null, recorded_by text not null, recorded_at timestamptz not null default now(), reconciled_by text, reconciled_at timestamptz, primary key (tenant_id, id), unique (tenant_id, payment_request_id));
create table if not exists tp_document (id text not null, tenant_id text not null, project_id text not null, document_type text not null, title text not null, version int not null, revision_label text not null, author text not null, issued_at date not null, object_key text, access_class text not null check (access_class in ('project','financial','restricted')), approval_state text not null check (approval_state in ('draft','published','superseded')), synthetic boolean not null default false, primary key (tenant_id, id));
create table if not exists tp_issue (id text not null, tenant_id text not null, project_id text not null, milestone_id text, title text not null, severity text not null, owner_id text not null, status text not null, due_at date, created_at timestamptz not null default now(), primary key (tenant_id, id));
create table if not exists tp_comment (id text not null, tenant_id text not null, project_id text not null, parent_ref text not null, author_id text not null, text text not null, visibility_class text not null default 'project', created_at timestamptz not null default now(), primary key (tenant_id, id));
create table if not exists tp_schedule_revision (id text not null, tenant_id text not null, project_id text not null, milestone_id text not null, revision int not null, kind text not null check (kind in ('baseline','forecast')), from_start date, from_end date, to_start date not null, to_end date not null, reason text not null, approved_by text not null, created_at timestamptz not null default now(), primary key (tenant_id, id));
create table if not exists tp_outbox_event (id text not null, tenant_id text not null, project_id text not null, type text not null, aggregate_ref text not null, idempotency_key text not null, recipient_user_id text not null, channel text not null default 'email', text text not null, status text not null default 'logged_not_sent', created_at timestamptz not null default now(), primary key (tenant_id, id), unique (tenant_id, idempotency_key));
create table if not exists tp_audit_event (id text not null, tenant_id text not null, project_id text, actor_id text not null, actor_role text not null, action text not null, object_type text not null, object_id text not null, ip_hash text, occurred_at timestamptz not null default now(), old_version int, new_version int, detail jsonb, primary key (tenant_id, id));

create index if not exists tp_report_project_status on tp_site_report (tenant_id, project_id, status);
create index if not exists tp_media_report on tp_media_asset (tenant_id, report_id);
create index if not exists tp_audit_project_time on tp_audit_event (tenant_id, project_id, occurred_at desc);
create index if not exists tp_membership_user on tp_membership (tenant_id, user_id) where revoked_at is null;

-- Append-only: block UPDATE/DELETE on evidence and audit tables.
create or replace function tp_append_only() returns trigger language plpgsql as $$ begin raise exception '% is append-only', tg_table_name; end $$;
do $$ declare t text; begin
  foreach t in array array['tp_audit_event','tp_report_revision','tp_report_review','tp_inspection','tp_payment_approval','tp_payment_status_history','tp_schedule_revision','tp_outbox_event','tp_decision_vote'] loop
    execute format('drop trigger if exists %I_append_only on %I', t, t);
    execute format('create trigger %I_append_only before update or delete on %I for each row execute function tp_append_only()', t, t);
  end loop;
end $$;

-- RLS: tenant isolation on every tp_* table. Project-level access is additionally enforced through tp_membership.
do $$ declare t text; begin
  foreach t in array array['tp_organization','tp_user','tp_project','tp_project_private','tp_membership','tp_work_package','tp_milestone','tp_site_report','tp_report_revision','tp_media_asset','tp_report_review','tp_inspection','tp_dispute','tp_change_order','tp_decision_request','tp_decision_vote','tp_budget_line','tp_payment_request','tp_payment_status_history','tp_payment_approval','tp_disbursement','tp_document','tp_issue','tp_comment','tp_schedule_revision','tp_outbox_event','tp_audit_event'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists %I_tenant on %I', t, t);
    execute format($p$create policy %I_tenant on %I using (tenant_id = current_setting('request.tenant_id', true)) with check (tenant_id = current_setting('request.tenant_id', true))$p$, t, t);
  end loop;
end $$;

commit;
