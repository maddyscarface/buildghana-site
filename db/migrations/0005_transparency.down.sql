-- Rolls back 0005 only (tp_* objects). Does not touch Phase 2–4 tables.
begin;
drop table if exists tp_audit_event, tp_outbox_event, tp_schedule_revision, tp_comment, tp_issue, tp_document, tp_disbursement, tp_payment_approval, tp_payment_status_history, tp_payment_request, tp_budget_line, tp_decision_vote, tp_decision_request, tp_change_order, tp_dispute, tp_inspection, tp_report_review, tp_media_asset, tp_report_revision, tp_site_report, tp_milestone, tp_work_package, tp_membership, tp_project_private, tp_project, tp_user, tp_organization, tp_tenant cascade;
drop function if exists tp_append_only();
commit;
