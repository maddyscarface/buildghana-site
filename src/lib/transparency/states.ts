/**
 * State machines (spec 02 §3) and the evidence-state vocabulary shown to owners (spec 03 Task B.4).
 * Pure functions: unit-tested in tests/transparency.test.ts.
 */
import type { EvidenceState, Independence, Inspection, MilestoneStatus, PaymentStatus, ReportStatus, SiteReport, Dispute } from "./types";

export class TransitionError extends Error {
  constructor(public readonly from: string, public readonly to: string, kind: string) { super(`${kind}: ${from} → ${to} is not allowed`); }
}

export const reportTransitions: Record<ReportStatus, ReportStatus[]> = {
  DRAFT: ["SUBMITTED"],
  SUBMITTED: ["NEEDS_CORRECTION", "OFFICE_REVIEWED"],
  NEEDS_CORRECTION: ["SUBMITTED"],
  OFFICE_REVIEWED: ["INSPECTION_PENDING", "PUBLISHED", "NEEDS_CORRECTION"],
  INSPECTION_PENDING: ["PUBLISHED", "VERIFIED"],
  PUBLISHED: ["VERIFIED", "DISPUTED", "ARCHIVED"],
  VERIFIED: ["DISPUTED", "ARCHIVED"],
  DISPUTED: ["PUBLISHED", "VERIFIED", "ARCHIVED"],
  ARCHIVED: [],
};

export const milestoneTransitions: Record<MilestoneStatus, MilestoneStatus[]> = {
  NOT_STARTED: ["REPORTED_IN_PROGRESS"],
  REPORTED_IN_PROGRESS: ["UNDER_REVIEW"],
  UNDER_REVIEW: ["REPORTED_IN_PROGRESS", "APPROVED_PROGRESS"],
  APPROVED_PROGRESS: ["REPORTED_IN_PROGRESS", "UNDER_REVIEW", "COMPLETE_VERIFIED"],
  COMPLETE_VERIFIED: [],
};

/** No automatic money release: every transition below is a human action recorded with an actor. */
export const paymentTransitions: Record<PaymentStatus, PaymentStatus[]> = {
  DRAFT: ["SUBMITTED", "CANCELLED"],
  SUBMITTED: ["EVIDENCE_REVIEW", "CANCELLED"],
  EVIDENCE_REVIEW: ["AWAITING_OWNER_APPROVAL", "REJECTED", "CANCELLED"],
  AWAITING_OWNER_APPROVAL: ["APPROVED_FOR_PAYMENT", "REJECTED", "EVIDENCE_REVIEW"],
  APPROVED_FOR_PAYMENT: ["PAID_PENDING_RECONCILIATION", "CANCELLED"],
  PAID_PENDING_RECONCILIATION: ["RECONCILED"],
  RECONCILED: [],
  REJECTED: [],
  CANCELLED: [],
};

export function assertTransition<S extends string>(table: Record<S, S[]>, from: S, to: S, kind: string) {
  if (!table[from]?.includes(to)) throw new TransitionError(from, to, kind);
}

/** Statuses an owner/co-owner may ever see. Drafts, submissions and returned reports stay staff-only. */
export const clientVisibleStatuses: ReportStatus[] = ["PUBLISHED", "VERIFIED", "DISPUTED"];

/**
 * Evidence state for a report: reported → reviewed → verified, with disputed as an overlay that wins.
 * `verified` requires a recorded qualified inspection (pass / pass with conditions) that covers the report.
 */
export function evidenceState(report: Pick<SiteReport, "id" | "status">, ctx: { inspections?: Inspection[]; disputes?: Dispute[] } = {}): EvidenceState | null {
  if (report.status === "DRAFT" || report.status === "ARCHIVED") return null;
  if (report.status === "DISPUTED" || ctx.disputes?.some((d) => d.reportId === report.id && d.status === "open")) return "disputed";
  if (report.status === "VERIFIED" && (ctx.inspections === undefined || ctx.inspections.some((i) => i.reportIds.includes(report.id) && i.result !== "fail"))) return "verified";
  if (["OFFICE_REVIEWED", "INSPECTION_PENDING", "PUBLISHED", "VERIFIED"].includes(report.status)) return "reviewed";
  return "reported";
}

export const evidenceLabel: Record<EvidenceState, { label: string; explain: string }> = {
  reported: { label: "Reported", explain: "Submitted by the site team. Not yet reviewed by the office." },
  reviewed: { label: "Office reviewed", explain: "Checked by the BuildGhana office for project, dates and adequate evidence. Not an engineering inspection." },
  verified: { label: "Inspected", explain: "A qualified inspection was recorded for this milestone. See the inspector, independence label, method and limitations." },
  disputed: { label: "Disputed", explain: "Someone has questioned this evidence. The original is kept and the dispute is appended, not deleted." },
};

export const independenceLabel: Record<Independence, string> = {
  independent_third_party: "Independent third party",
  internal_review: "Internal review (same delivery organisation — not independent)",
};

export const reportStatusLabel: Record<ReportStatus, string> = {
  DRAFT: "Draft", SUBMITTED: "Field submitted", NEEDS_CORRECTION: "Returned for correction", OFFICE_REVIEWED: "Office reviewed",
  INSPECTION_PENDING: "Inspection pending", PUBLISHED: "Published to owner", VERIFIED: "Inspected", DISPUTED: "Disputed", ARCHIVED: "Archived",
};

export const milestoneStatusLabel: Record<MilestoneStatus, string> = {
  NOT_STARTED: "Not started", REPORTED_IN_PROGRESS: "In progress (field reported)", UNDER_REVIEW: "Under review",
  APPROVED_PROGRESS: "Progress approved by office", COMPLETE_VERIFIED: "Complete — inspected",
};

/** Owner-facing payment labels. Only RECONCILED may say "Paid". */
export const paymentStatusLabel: Record<PaymentStatus, string> = {
  DRAFT: "Draft request",
  SUBMITTED: "Requested — not approved",
  EVIDENCE_REVIEW: "Requested — evidence under review",
  AWAITING_OWNER_APPROVAL: "Requested — awaiting owner authorisation",
  APPROVED_FOR_PAYMENT: "Authorised — not paid",
  PAID_PENDING_RECONCILIATION: "Disbursement recorded — awaiting reconciliation",
  RECONCILED: "Paid — reconciled",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

/** Schedule variance in whole days (forecast end − baseline end). Positive = later than baseline. */
export function varianceDays(baselineEnd: string, forecastEnd: string): number {
  return Math.round((Date.parse(forecastEnd) - Date.parse(baselineEnd)) / 86_400_000);
}
