/**
 * Readiness Review case model and status rules. Pure module (no I/O) so it can be unit tested.
 *
 * Case status (overall):
 *   intake_submitted → awaiting_payment → paid → awaiting_documents → documents_received → in_review
 *   → report_drafting → report_ready → delivered
 *   side states: payment_failed, on_hold, cancelled, refunded
 *
 * Title verification (counsel-gated, independent track):
 *   not_started → awaiting_documents → referred_to_counsel → counsel_in_progress
 *   → counsel_findings_received → counsel_signed_off | unable_to_verify   (or not_in_scope)
 *   Only Ghana-qualified counsel can produce a sign-off; we record their name, firm and reference.
 */

export const caseStatuses = [
  "intake_submitted", "awaiting_payment", "payment_failed", "paid", "awaiting_documents", "documents_received",
  "in_review", "report_drafting", "report_ready", "delivered", "on_hold", "cancelled", "refunded",
] as const;
export type CaseStatus = (typeof caseStatuses)[number];

export const paymentStatuses = ["unpaid", "pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const titleStatuses = [
  "not_started", "awaiting_documents", "referred_to_counsel", "counsel_in_progress",
  "counsel_findings_received", "counsel_signed_off", "unable_to_verify", "not_in_scope",
] as const;
export type TitleStatus = (typeof titleStatuses)[number];

export type Rating = "ready" | "attention" | "not_ready" | "not_assessed";

export type CounselRecord = { firm: string; lawyer: string; reference: string; signedOffAt?: string; summary?: string };

export type CaseDocument = {
  id: string; docKey: string; filename: string; contentType: string; size: number; storageKey: string;
  uploadedAt: string; status: "pending_upload" | "uploaded" | "rejected"; uploadedBy: "client" | "admin";
};

export type ReadinessCase = {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  paymentStatus: PaymentStatus;
  titleStatus: TitleStatus;
  sandbox: boolean;
  contact: { firstName: string; lastName: string; email: string; phone: string; whatsappSame: boolean; country: string };
  property: {
    region: string; city?: string; landSize?: string; acquisition: string; titleStatus: string; intendedUse: string;
    projectStage: string; budgetRange: string; startTimeline: string; groundSupport: string[]; focus: string[]; concerns?: string;
  };
  inventory: Record<string, "have" | "dont_have" | "not_sure">;
  consents: { terms: boolean; dataProcessing: boolean; marketing: boolean; adsConsent: boolean; at: string };
  attribution?: Record<string, string | undefined>;
  pageUrl?: string;
  payment?: {
    provider: "stripe" | "paystack" | "mock"; sessionId?: string; reference?: string; amountMinor?: number; currency?: string;
    paidAt?: string; sandbox?: boolean;
  };
  documents: CaseDocument[];
  counsel?: CounselRecord;
  findings: Record<string, { rating: Rating; notes: string }>;
  summary?: string;
  internalNotes: { at: string; by: string; text: string }[];
  report?: { generatedAt: string; version: number; final: boolean; deliveredAt?: string };
  crm?: { contactId?: string; opportunityId?: string; lastSync?: string; lastResult?: string };
};

/** Allowed manual (admin) transitions. Payment-driven moves happen via handlePaymentEvent. */
export const transitions: Record<CaseStatus, CaseStatus[]> = {
  intake_submitted: ["awaiting_payment", "cancelled", "on_hold"],
  awaiting_payment: ["paid", "payment_failed", "cancelled", "on_hold"],
  payment_failed: ["awaiting_payment", "cancelled"],
  paid: ["awaiting_documents", "refunded", "on_hold"],
  awaiting_documents: ["documents_received", "on_hold", "refunded", "cancelled"],
  documents_received: ["in_review", "awaiting_documents", "on_hold"],
  in_review: ["report_drafting", "awaiting_documents", "on_hold"],
  report_drafting: ["report_ready", "in_review", "on_hold"],
  report_ready: ["delivered", "report_drafting"],
  delivered: ["report_drafting"],
  on_hold: ["awaiting_documents", "documents_received", "in_review", "report_drafting", "cancelled", "refunded"],
  cancelled: [],
  refunded: [],
};

export const titleTransitions: Record<TitleStatus, TitleStatus[]> = {
  not_started: ["awaiting_documents", "referred_to_counsel", "not_in_scope"],
  awaiting_documents: ["referred_to_counsel", "not_in_scope", "unable_to_verify"],
  referred_to_counsel: ["counsel_in_progress", "awaiting_documents", "unable_to_verify"],
  counsel_in_progress: ["counsel_findings_received", "awaiting_documents", "unable_to_verify"],
  counsel_findings_received: ["counsel_signed_off", "counsel_in_progress", "unable_to_verify"],
  counsel_signed_off: ["counsel_findings_received"],
  unable_to_verify: ["referred_to_counsel"],
  not_in_scope: ["referred_to_counsel"],
};

export type GateResult = { ok: true } | { ok: false; reason: string };

export function canTransition(c: Pick<ReadinessCase, "status" | "paymentStatus" | "titleStatus">, to: CaseStatus): GateResult {
  if (!transitions[c.status].includes(to)) return { ok: false, reason: `Cannot move from ${c.status} to ${to}` };
  const needsPaid: CaseStatus[] = ["awaiting_documents", "documents_received", "in_review", "report_drafting", "report_ready", "delivered"];
  if (needsPaid.includes(to) && c.paymentStatus !== "paid") return { ok: false, reason: "Payment has not been confirmed" };
  if ((to === "report_ready" || to === "delivered") && !titleSettled(c.titleStatus)) {
    return { ok: false, reason: "Title verification must be signed off by counsel, marked unable to verify, or marked out of scope before the report is final" };
  }
  return { ok: true };
}

export const titleSettled = (t: TitleStatus) => t === "counsel_signed_off" || t === "unable_to_verify" || t === "not_in_scope";

export function canTitleTransition(from: TitleStatus, to: TitleStatus, counsel?: Partial<CounselRecord>): GateResult {
  if (!titleTransitions[from].includes(to)) return { ok: false, reason: `Cannot move title verification from ${from} to ${to}` };
  if (to === "counsel_signed_off" && !(counsel?.firm?.trim() && counsel?.lawyer?.trim() && counsel?.reference?.trim())) {
    return { ok: false, reason: "Counsel sign-off needs the firm, the lawyer of record and counsel's reference" };
  }
  return { ok: true };
}

/** Wording the report and client page may use for the title track — never claims more than counsel recorded. */
export function titleStatement(c: Pick<ReadinessCase, "titleStatus" | "counsel">): string {
  switch (c.titleStatus) {
    case "counsel_signed_off":
      return `Title search completed by ${c.counsel?.lawyer} (${c.counsel?.firm}), reference ${c.counsel?.reference}. Counsel's findings are summarised below and govern over anything else in this report.`;
    case "unable_to_verify":
      return "Counsel could not complete title verification on the documents available. Do not treat the land as verified.";
    case "not_in_scope":
      return "Title verification was not part of this review. Nothing in this report is a title opinion.";
    default:
      return "Title verification with Ghanaian counsel is in progress. Nothing in this draft is a title opinion.";
  }
}

export const clientStatusLabel: Record<CaseStatus, string> = {
  intake_submitted: "Intake received",
  awaiting_payment: "Awaiting payment",
  payment_failed: "Payment not completed",
  paid: "Payment confirmed",
  awaiting_documents: "Waiting for your documents",
  documents_received: "Documents received",
  in_review: "Professional review in progress",
  report_drafting: "Report being prepared",
  report_ready: "Report ready — final checks",
  delivered: "Report delivered",
  on_hold: "On hold — we'll contact you",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const titleStatusLabel: Record<TitleStatus, string> = {
  not_started: "Not started",
  awaiting_documents: "Waiting for title documents",
  referred_to_counsel: "Referred to Ghanaian counsel",
  counsel_in_progress: "Counsel search in progress",
  counsel_findings_received: "Counsel findings received",
  counsel_signed_off: "Signed off by counsel",
  unable_to_verify: "Counsel unable to verify",
  not_in_scope: "Not in scope",
};

/** Client-facing timeline milestones in order. */
export const clientTimeline: { key: string; label: string; reached: (c: ReadinessCase) => boolean }[] = [
  { key: "intake", label: "Intake submitted", reached: () => true },
  { key: "paid", label: "Payment confirmed", reached: (c) => c.paymentStatus === "paid" || c.paymentStatus === "refunded" },
  { key: "docs", label: "Documents received", reached: (c) => ["documents_received", "in_review", "report_drafting", "report_ready", "delivered"].includes(c.status) },
  { key: "review", label: "Professional review", reached: (c) => ["in_review", "report_drafting", "report_ready", "delivered"].includes(c.status) },
  { key: "title", label: "Counsel title verification", reached: (c) => titleSettled(c.titleStatus) },
  { key: "report", label: "Report delivered", reached: (c) => c.status === "delivered" },
];

/** Readiness score used for lead scoring / CRM priority (0–100). Higher = closer to a safe start. */
export function documentReadiness(inv: ReadinessCase["inventory"], titleDocKeys: string[]): { have: number; total: number; titleHave: number; titleTotal: number } {
  const keys = Object.keys(inv);
  return {
    have: keys.filter((k) => inv[k] === "have").length,
    total: keys.length,
    titleHave: titleDocKeys.filter((k) => inv[k] === "have").length,
    titleTotal: titleDocKeys.length,
  };
}
