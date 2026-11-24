/**
 * Phase 5 — Trust & Transparency data model (spec 02 §2). Mirrors db/migrations/0005_transparency.up.sql.
 * Money is integer minor units with an explicit currency. Timestamps are ISO-8601 UTC strings.
 * Every row carries tenantId; project rows carry projectId. UUIDs/ids are NOT authorization.
 */
export type Currency = "GHS" | "USD";
export type Iso = string;

export const roles = ["ops_admin", "project_manager", "field_supervisor", "inspector", "owner", "co_owner", "accountant", "contractor"] as const;
export type Role = (typeof roles)[number];

/** Per-project read categories. Owners hold all; co-owners/financiers default to reports + gallery + schedule only. */
export const scopes = ["reports", "gallery", "schedule", "documents", "budget", "decisions"] as const;
export type Scope = (typeof scopes)[number];

export type Tenant = { id: string; brandId: string; status: "active" | "suspended"; createdAt: Iso };
export type OrgType = "delivery" | "client" | "independent_inspection" | "contractor";
export type Organization = { id: string; tenantId: string; name: string; type: OrgType };

export type User = {
  id: string; tenantId: string; orgId: string; name: string; email: string; title: string;
  /** Tenant-wide staff role (null for client-side users, who only hold project memberships). */
  staffRole: Role | null;
  timezone: string; phone?: string;
  disabled: boolean; sessionsRevokedBefore: number;
  mfa: "not_configured"; synthetic: boolean;
};

export type Membership = {
  id: string; tenantId: string; projectId: string; userId: string; role: Role; scopes: Scope[];
  workPackageIds?: string[]; invitedBy: string; grantedAt: Iso; invitationExpiry?: Iso; revokedAt?: Iso; version: number;
};

export type ServiceModel = "owners_representative" | "construction_delivery";
export type Project = {
  id: string; tenantId: string; clientOrgId: string; code: string; name: string;
  /** City/district precision only. Never an exact address or coordinates. */
  locationPublic: string; timezone: string; status: "active" | "on_hold" | "closed";
  serviceModel: ServiceModel; reportingPolicyVersion: number; reportingCadence: "daily" | "weekly" | "milestone";
  financialVisibility: "contract_authorized" | "not_authorized";
  pmUserId: string; baselined: boolean; synthetic: boolean; version: number; createdAt: Iso;
};

export type WorkPackage = { id: string; tenantId: string; projectId: string; trade: Trade; code: string; title: string; leadId: string; contractorOrgId?: string };
export type Trade = "site_prep" | "foundations" | "blockwork" | "frame" | "roof" | "mep" | "finishes" | "handover";

export const milestoneStatuses = ["NOT_STARTED", "REPORTED_IN_PROGRESS", "UNDER_REVIEW", "APPROVED_PROGRESS", "COMPLETE_VERIFIED"] as const;
export type MilestoneStatus = (typeof milestoneStatuses)[number];
export type Milestone = {
  id: string; tenantId: string; projectId: string; workPackageId: string; phase: number; title: string;
  baselineStart: string; baselineEnd: string; forecastStart: string; forecastEnd: string;
  /** Weight used only with human-approved progress assessments (never derived from photo counts). */
  weight: number; status: MilestoneStatus; overlays: ("BLOCKED" | "DISPUTED")[];
  requiresInspection: boolean; blockers: string[]; responsible: string; forecastIsCommitment: false; version: number;
};

export const reportStatuses = ["DRAFT", "SUBMITTED", "NEEDS_CORRECTION", "OFFICE_REVIEWED", "INSPECTION_PENDING", "PUBLISHED", "VERIFIED", "DISPUTED", "ARCHIVED"] as const;
export type ReportStatus = (typeof reportStatuses)[number];
export type EvidenceState = "reported" | "reviewed" | "verified" | "disputed";

export type Quantity = { item: string; qty: number; unit: string; basis: "field_reported" };
export type ReportContent = {
  summary: string; workReported: string; quantities: Quantity[]; crewCount: number | null;
  materials: string; weather: string; siteAccess: string; issues: string; safetyIssues: string; nextSteps: string;
  mediaIds: string[];
};
export type ReportRevision = ReportContent & {
  revision: number; capturedAt: Iso | null; submittedAt: Iso; serverReceivedAt: Iso; submittedBy: string;
  attestation: { accepted: true; text: string; at: Iso };
};
export type SiteReport = {
  id: string; tenantId: string; projectId: string; milestoneId: string; workPackageId: string; authorId: string;
  status: ReportStatus; statusBeforeDispute?: ReportStatus;
  /** Immutable submitted revisions (append-only). */
  revisions: ReportRevision[];
  /** Working draft (next revision) — editable by the author only while DRAFT or NEEDS_CORRECTION. */
  draft: ReportContent & { capturedAt: Iso | null; updatedAt: Iso };
  createdAt: Iso; publishedAt?: Iso; version: number; synthetic: boolean;
  idempotencyKeys: string[];
};

export type MediaStage = "overview" | "before" | "during" | "after" | "detail";
export type MediaAsset = {
  id: string; tenantId: string; projectId: string; reportId: string; revision: number; stage: MediaStage; caption: string;
  objectKey: string; mime: string; sizeBytes: number; receivedBytes: number; sha256: string | null;
  uploadState: "pending" | "complete" | "rejected"; rejectReason?: string;
  scanStatus: "not_scanned" | "clean" | "quarantined";
  deviceCapturedAt: Iso | null; serverReceivedAt: Iso | null; uploaderId: string;
  provenance: "synthetic_placeholder" | "device_upload";
  /** Location is never certified. */
  locationLabel: "Device-reported location not collected";
  visibilityClass: "project" | "staff_only"; idempotencyKey?: string; createdAt: Iso;
};

export type ReviewDecision = "approve" | "request_correction" | "publish" | "require_inspection";
export type ReportReview = { id: string; tenantId: string; projectId: string; reportId: string; revision: number; reviewerId: string; decision: ReviewDecision; notes: string; createdAt: Iso };

export type Independence = "independent_third_party" | "internal_review";
export type Inspection = {
  id: string; tenantId: string; projectId: string; milestoneId: string; inspectorId: string;
  independence: Independence; credentialReference: string; credentialVerified: boolean;
  result: "pass" | "fail" | "pass_with_conditions"; scope: string; methods: string; limitations: string;
  reportIds: string[]; inspectedAt: Iso; signature: string; createdAt: Iso; synthetic: boolean;
};

export type Dispute = { id: string; tenantId: string; projectId: string; reportId: string; raisedBy: string; reason: string; status: "open" | "resolved"; resolution?: string; resolvedBy?: string; createdAt: Iso; resolvedAt?: Iso };

export type DecisionType = "change_order" | "owner_selection" | "milestone_acceptance" | "document_request";
export type DecisionStatus = "OPEN" | "APPROVED" | "REJECTED" | "CLARIFICATION_REQUESTED" | "WITHDRAWN";
export type DecisionVote = { userId: string; action: "approve" | "reject" | "clarify"; comments: string; actedAt: Iso; payloadVersion: number; confirmation: string };
export type DecisionRequest = {
  id: string; tenantId: string; projectId: string; type: DecisionType; title: string; description: string;
  requestedBy: string; assignedTo: string; deadline: string; status: DecisionStatus; payloadVersion: number;
  changeOrderId?: string; votes: DecisionVote[]; createdAt: Iso; version: number;
};

export type ChangeOrderStatus = "PROPOSED" | "AWAITING_OWNER" | "APPROVED" | "REJECTED" | "SUPERSEDED";
export type ChangeOrder = {
  id: string; tenantId: string; projectId: string; number: string; description: string; sourceDoc: string;
  proposedDeltaMinor: number; approvedDeltaMinor: number | null; currency: Currency; costCode: string;
  status: ChangeOrderStatus; supersedes?: string; approvedAt?: Iso; approvedBy?: string; createdAt: Iso; version: number;
};

export type BudgetLine = { id: string; tenantId: string; projectId: string; costCode: string; label: string; baselineMinor: number; committedMinor: number; currency: Currency };

export const paymentStatuses = ["DRAFT", "SUBMITTED", "EVIDENCE_REVIEW", "AWAITING_OWNER_APPROVAL", "APPROVED_FOR_PAYMENT", "PAID_PENDING_RECONCILIATION", "RECONCILED", "REJECTED", "CANCELLED"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];
export type PaymentRequest = {
  id: string; tenantId: string; projectId: string; milestoneId: string; number: string; amountMinor: number; currency: Currency;
  payee: string; costCode: string; supportingEvidence: string[]; status: PaymentStatus; submittedBy: string;
  history: { status: PaymentStatus; by: string; at: Iso; note: string }[]; createdAt: Iso; version: number;
};
export type PaymentApproval = { id: string; tenantId: string; projectId: string; paymentRequestId: string; approverId: string; stage: "evidence_review" | "owner_authorization"; decision: "approve" | "reject" | "clarify"; reason: string; createdAt: Iso };
export type Disbursement = {
  id: string; tenantId: string; projectId: string; paymentRequestId: string; paidMinor: number; currency: Currency; paidAt: string;
  source: "manual_bank_evidence" | "payment_system_event"; sourceReference: string; evidenceDocId: string;
  recordedBy: string; recordedAt: Iso; reconciledBy?: string; reconciledAt?: Iso;
};

export type DocumentRec = {
  id: string; tenantId: string; projectId: string; documentType: "drawing" | "contract_summary" | "inspection_report" | "invoice" | "bank_evidence" | "schedule";
  title: string; version: number; revisionLabel: string; author: string; issuedAt: string;
  accessClass: "project" | "financial" | "restricted"; approvalState: "draft" | "published" | "superseded"; synthetic: boolean;
};

export type Issue = { id: string; tenantId: string; projectId: string; milestoneId?: string; title: string; severity: "low" | "medium" | "high"; ownerId: string; status: "open" | "closed"; dueAt?: string; createdAt: Iso };
export type Comment = { id: string; tenantId: string; projectId: string; parentRef: string; authorId: string; text: string; visibilityClass: "project" | "staff_only"; createdAt: Iso };
export type ScheduleRevision = { id: string; tenantId: string; projectId: string; milestoneId: string; revision: number; kind: "baseline" | "forecast"; from: { start: string; end: string }; to: { start: string; end: string }; reason: string; approvedBy: string; createdAt: Iso };

export type OutboxEvent = {
  id: string; tenantId: string; projectId: string; type: "report_published" | "decision_requested" | "invitation" | "inspection_recorded" | "payment_awaiting_owner";
  aggregateRef: string; idempotencyKey: string; recipientUserId: string; channel: "email";
  /** Neutral text only: never amounts, media, document links or tokens (spec 02 §7). */
  text: string; status: "logged_not_sent"; createdAt: Iso;
};

export type AuditEvent = {
  id: string; tenantId: string; projectId?: string; actorId: string; actorRole: string; action: string;
  objectType: string; objectId: string; ipHash?: string; occurredAt: Iso; oldVersion?: number; newVersion?: number; detail?: Record<string, string | number | boolean | null>;
};

export type Tables = {
  tenants: Tenant; organizations: Organization; users: User; memberships: Membership; projects: Project;
  work_packages: WorkPackage; milestones: Milestone; site_reports: SiteReport; media_assets: MediaAsset;
  report_reviews: ReportReview; inspections: Inspection; disputes: Dispute; decision_requests: DecisionRequest;
  change_orders: ChangeOrder; budget_lines: BudgetLine; payment_requests: PaymentRequest; payment_approvals: PaymentApproval;
  disbursements: Disbursement; documents: DocumentRec; issues: Issue; comments: Comment; schedule_revisions: ScheduleRevision;
  outbox_events: OutboxEvent; audit_events: AuditEvent;
};
export type TableName = keyof Tables;
