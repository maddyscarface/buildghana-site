/**
 * Readiness Review case model and status rules. Pure module (no I/O) so it can be unit tested.
 *
 * Case status (spec §2 Step B):
 *   draft → awaiting_payment → paid → intake_incomplete → scheduling → site_visit_completed → documents_under_review
 *   → legal_title_check_pending → legal_title_check_complete → report_drafting → internal_qa → delivered → follow_up
 *   side states: payment_failed, needs_more_documents, on_hold, cancelled, refunded
 *   ("draft" lives in the browser — the intake autosaves locally and the server case starts at awaiting_payment.)
 *
 * Title (counsel-gated, independent track, spec §2 Step C):
 *   unverified → in_progress → verified_with_qualifications | adverse_findings | unable_to_determine
 *   plus not_commissioned (title verification not purchased — the report then says nothing about title quality).
 *   Only Ghana-qualified counsel can produce an outcome; we record their firm, lawyer and reference.
 *   An uploaded document is never a verified title.
 */

export const caseStatuses = [
  "draft", "awaiting_payment", "payment_failed", "paid", "intake_incomplete", "needs_more_documents", "scheduling",
  "site_visit_completed", "documents_under_review", "legal_title_check_pending", "legal_title_check_complete",
  "report_drafting", "internal_qa", "delivered", "follow_up", "on_hold", "cancelled", "refunded",
] as const;
export type CaseStatus = (typeof caseStatuses)[number];

export const paymentStatuses = ["unpaid", "pending", "paid", "failed", "refunded"] as const;
export type PaymentStatus = (typeof paymentStatuses)[number];

export const titleStatuses = [
  "unverified", "in_progress", "verified_with_qualifications", "adverse_findings", "unable_to_determine", "not_commissioned",
] as const;
export type TitleStatus = (typeof titleStatuses)[number];
export const counselOutcomes: TitleStatus[] = ["verified_with_qualifications", "adverse_findings", "unable_to_determine"];

export type Rating = "ready" | "attention" | "not_ready" | "not_assessed";
export type DocAvailability = "available" | "missing" | "uncertain";

export type CounselRecord = { firm: string; lawyer: string; reference: string; signedOffAt?: string; summary?: string; limitations?: string; searchReference?: string };

export type CaseDocument = {
  id: string; docKey: string; filename: string; contentType: string; size: number; storageKey: string;
  uploadedAt: string; status: "pending_upload" | "uploaded" | "rejected"; uploadedBy: "client" | "admin";
};

export type SiteVisit = {
  scheduledFor?: string; inspector?: string; completedAt?: string; completedBy?: string;
  /** Inspection checklist (spec §2 Step C). */
  checklist: Partial<Record<SiteCheckKey, string>>;
};
export const siteChecks = [
  { key: "access", label: "Access" },
  { key: "boundaries", label: "Visible boundaries / pillars" },
  { key: "slope_drainage", label: "Slope & drainage" },
  { key: "neighbours", label: "Neighbouring uses" },
  { key: "utilities", label: "Utilities (power, water, road)" },
  { key: "risks", label: "Apparent risks" },
  { key: "survey", label: "Survey availability" },
  { key: "measurements", label: "Measurements taken" },
  { key: "unknowns", label: "Unknowns / not verified on site" },
] as const;
export type SiteCheckKey = (typeof siteChecks)[number]["key"];

export const permitStatuses = ["required", "possibly_required", "not_applicable", "pending_confirmation"] as const;
export type PermitStatus = (typeof permitStatuses)[number];
export type PermitItem = { id: string; item: string; authority: string; status: PermitStatus; sourceUrl?: string; lastChecked?: string; notes?: string };

export type CostBand = { low: number; base: number; high: number };
export type CostRange = {
  ghs: CostBand; usd: CostBand; fxRate: number; fxSource: string; fxDate: string;
  assumptions: string; assumptionsVersion: string; confidence: "low" | "medium" | "high"; preparedAt: string;
};

export const recommendations = ["proceed", "proceed_after_conditions", "pause"] as const;
export type RecommendationDecision = (typeof recommendations)[number];
export type Recommendation = {
  decision: RecommendationDecision; rationale: string; conditions?: string; nextSteps?: string;
  draftedAt: string; approvedBy?: string; approvedAt?: string;
};

export type ReportVersion = { version: number; generatedAt: string; final: boolean; by: string; deliveredAt?: string; acknowledgedAt?: string };
export type Task = { id: string; text: string; due?: string; done: boolean };

export type ReadinessCase = {
  id: string;
  caseNumber: string;
  createdAt: string;
  updatedAt: string;
  status: CaseStatus;
  paymentStatus: PaymentStatus;
  titleStatus: TitleStatus;
  sandbox: boolean;
  contact: {
    firstName: string; lastName: string; email: string; phone: string; whatsappSame: boolean; country: string;
    preferredContact: string; timeZone: string;
  };
  parcel: {
    region: string; district: string; locality: string; gps?: string; mapPin?: { lat: number; lng: number }; plotNumber?: string;
    area?: string; areaUnit: string; access: string; controller: string; acquired: string;
    siteContact?: { name?: string; phone?: string; relationship?: string };
  };
  project: {
    use: string; useOther?: string; floorArea?: string; units?: string; floors?: string; finish: string; description?: string;
    budgetBand: string; budgetCurrency: "USD" | "GHS"; funds: string; landIncluded: boolean; targetStart?: string; designStatus: string;
    addOns: string[]; concerns?: string;
  };
  inventory: Record<string, DocAvailability>;
  consents: { authority: boolean; privacy: boolean; scope: boolean; marketing: boolean; siteContact: boolean; adsConsent: boolean; at: string };
  attribution?: Record<string, string | undefined>;
  pageUrl?: string;
  payment?: {
    provider: "stripe" | "paystack" | "mock"; sessionId?: string; reference?: string; amountMinor?: number; currency?: string;
    paidAt?: string; sandbox?: boolean; refundedAt?: string; refundNote?: string;
  };
  documents: CaseDocument[];
  counsel?: CounselRecord;
  findings: Record<string, { rating: Rating; notes: string }>;
  summary?: string;
  internalNotes: { at: string; by: string; text: string }[];
  ops: { reviewer?: string; dueDate?: string; tasks: Task[]; jurisdiction?: string };
  siteVisit: SiteVisit;
  permits: PermitItem[];
  cost?: CostRange;
  recommendation?: Recommendation;
  reports: ReportVersion[];
  engagement?: "pm_proposal" | "won" | "lost";
  crm?: { contactId?: string; opportunityId?: string; lastSync?: string; lastResult?: string };
};

/** Allowed manual (admin) transitions. Payment-driven moves happen via handlePaymentEvent. */
export const transitions: Record<CaseStatus, CaseStatus[]> = {
  draft: ["awaiting_payment", "cancelled"],
  awaiting_payment: ["paid", "payment_failed", "cancelled", "on_hold"],
  payment_failed: ["awaiting_payment", "cancelled"],
  paid: ["intake_incomplete", "needs_more_documents", "scheduling", "on_hold", "refunded"],
  intake_incomplete: ["scheduling", "needs_more_documents", "on_hold", "cancelled", "refunded"],
  needs_more_documents: ["scheduling", "documents_under_review", "legal_title_check_pending", "on_hold", "cancelled", "refunded"],
  scheduling: ["site_visit_completed", "needs_more_documents", "on_hold", "cancelled", "refunded"],
  site_visit_completed: ["documents_under_review", "needs_more_documents", "on_hold"],
  documents_under_review: ["legal_title_check_pending", "report_drafting", "needs_more_documents", "on_hold"],
  legal_title_check_pending: ["legal_title_check_complete", "needs_more_documents", "on_hold"],
  legal_title_check_complete: ["report_drafting", "on_hold"],
  report_drafting: ["internal_qa", "documents_under_review", "needs_more_documents", "on_hold"],
  internal_qa: ["delivered", "report_drafting"],
  delivered: ["follow_up", "report_drafting"],
  follow_up: ["report_drafting"],
  on_hold: ["intake_incomplete", "needs_more_documents", "scheduling", "documents_under_review", "report_drafting", "cancelled", "refunded"],
  cancelled: [],
  refunded: [],
};

export const titleTransitions: Record<TitleStatus, TitleStatus[]> = {
  unverified: ["in_progress", "not_commissioned"],
  in_progress: ["verified_with_qualifications", "adverse_findings", "unable_to_determine", "unverified"],
  verified_with_qualifications: ["in_progress"],
  adverse_findings: ["in_progress"],
  unable_to_determine: ["in_progress"],
  not_commissioned: ["unverified", "in_progress"],
};

export type GateResult = { ok: true } | { ok: false; reason: string };

export const siteVisitDocumented = (v?: SiteVisit) =>
  Boolean(v?.completedAt && v.completedBy?.trim() && v.checklist && siteChecks.filter((k) => v.checklist[k.key]?.trim()).length >= 5);

const needsPaid: CaseStatus[] = [
  "intake_incomplete", "needs_more_documents", "scheduling", "site_visit_completed", "documents_under_review",
  "legal_title_check_pending", "legal_title_check_complete", "report_drafting", "internal_qa", "delivered", "follow_up",
];

export function canTransition(c: Pick<ReadinessCase, "status" | "paymentStatus" | "titleStatus"> & Partial<Pick<ReadinessCase, "siteVisit" | "recommendation" | "reports">>, to: CaseStatus): GateResult {
  if (!transitions[c.status].includes(to)) return { ok: false, reason: `Cannot move from ${c.status} to ${to}` };
  if (needsPaid.includes(to) && c.paymentStatus !== "paid") return { ok: false, reason: "Payment has not been confirmed" };
  if (to === "site_visit_completed" && !siteVisitDocumented(c.siteVisit)) {
    return { ok: false, reason: "Only a real, documented visit can be marked complete: record the date, who visited and at least five checklist items" };
  }
  if (to === "legal_title_check_complete" && !titleSettled(c.titleStatus)) {
    return { ok: false, reason: "Counsel must record an outcome (verified with qualifications, adverse findings or unable to determine) first" };
  }
  if (to === "internal_qa" || to === "delivered") {
    if (!titleSettled(c.titleStatus)) return { ok: false, reason: "The counsel-owned title section must have an outcome, or be marked not commissioned, before the report is final" };
    if (!siteVisitDocumented(c.siteVisit)) return { ok: false, reason: "The site visit is still pending — the report cannot be issued as complete" };
    if (!c.recommendation) return { ok: false, reason: "Draft the recommendation first" };
  }
  if (to === "delivered" && !(c.recommendation?.approvedBy && c.recommendation.approvedAt)) {
    return { ok: false, reason: "A named human reviewer must approve the recommendation in internal QA" };
  }
  return { ok: true };
}

export const titleSettled = (t: TitleStatus) => counselOutcomes.includes(t) || t === "not_commissioned";

export function canTitleTransition(from: TitleStatus, to: TitleStatus, counsel?: Partial<CounselRecord>): GateResult {
  if (!titleTransitions[from].includes(to)) return { ok: false, reason: `Cannot move title from ${from} to ${to}` };
  if (counselOutcomes.includes(to) && !(counsel?.firm?.trim() && counsel?.lawyer?.trim() && counsel?.reference?.trim())) {
    return { ok: false, reason: "A counsel outcome needs the firm, the lawyer of record and counsel's reference" };
  }
  if (to === "in_progress" && !(counsel?.firm?.trim() || counsel?.lawyer?.trim())) {
    return { ok: false, reason: "Assign counsel (firm or lawyer) before starting the title check" };
  }
  return { ok: true };
}

export const clientStatusLabel: Record<CaseStatus, string> = {
  draft: "Draft",
  awaiting_payment: "Awaiting payment",
  payment_failed: "Payment not completed",
  paid: "Payment confirmed",
  intake_incomplete: "We need a few more details",
  needs_more_documents: "Waiting for more documents",
  scheduling: "Scheduling your site visit",
  site_visit_completed: "Site visit completed",
  documents_under_review: "Documents under review",
  legal_title_check_pending: "Title check with counsel",
  legal_title_check_complete: "Title check complete",
  report_drafting: "Report being prepared",
  internal_qa: "Report in quality review",
  delivered: "Report delivered",
  follow_up: "Follow-up",
  on_hold: "On hold — we'll contact you",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export const titleStatusLabel: Record<TitleStatus, string> = {
  unverified: "Unverified",
  in_progress: "Counsel check in progress",
  verified_with_qualifications: "Verified by counsel, with qualifications",
  adverse_findings: "Adverse findings",
  unable_to_determine: "Unable to determine",
  not_commissioned: "Not commissioned",
};

export const permitStatusLabel: Record<PermitStatus, string> = {
  required: "Required", possibly_required: "Possibly required", not_applicable: "Not applicable", pending_confirmation: "Pending confirmation",
};
export const recommendationLabel: Record<RecommendationDecision, string> = {
  proceed: "Proceed to detailed design / budgeting",
  proceed_after_conditions: "Proceed only after specific conditions are met",
  pause: "Pause pending investigation or legal advice",
};

/** Client-facing timeline milestones in order. */
const after = (c: ReadinessCase, ...s: CaseStatus[]) => s.includes(c.status);
export const clientTimeline: { key: string; label: string; reached: (c: ReadinessCase) => boolean }[] = [
  { key: "intake", label: "Intake submitted", reached: () => true },
  { key: "paid", label: "Payment confirmed", reached: (c) => c.paymentStatus === "paid" || c.paymentStatus === "refunded" },
  { key: "scheduled", label: "Site visit scheduled", reached: (c) => Boolean(c.siteVisit?.scheduledFor) },
  { key: "visit", label: "Site visit completed", reached: (c) => siteVisitDocumented(c.siteVisit) },
  { key: "review", label: "Documents under review", reached: (c) => after(c, "documents_under_review", "legal_title_check_pending", "legal_title_check_complete", "report_drafting", "internal_qa", "delivered", "follow_up") },
  { key: "title", label: "Counsel-led title check", reached: (c) => titleSettled(c.titleStatus) },
  { key: "report", label: "Report delivered", reached: (c) => after(c, "delivered", "follow_up") },
];

/** Wording the report and client page may use for title — never claims more than counsel recorded. */
export function titleStatement(c: Pick<ReadinessCase, "titleStatus" | "counsel">): string {
  const who = c.counsel ? `${c.counsel.lawyer} (${c.counsel.firm}), reference ${c.counsel.reference}` : "counsel";
  switch (c.titleStatus) {
    case "verified_with_qualifications":
      return `Ghanaian counsel — ${who} — reports the title as verified subject to the qualifications below. Counsel's opinion governs over anything else in this report.`;
    case "adverse_findings":
      return `Ghanaian counsel — ${who} — reports adverse findings. Do not proceed with construction or payments until you have taken legal advice on them.`;
    case "unable_to_determine":
      return `Ghanaian counsel — ${who} — was unable to determine title on the documents and searches available. Do not treat the land as verified.`;
    case "not_commissioned":
      return "Title verification by counsel was not commissioned for this review. Nothing in this report is a title opinion, and uploaded documents have not been verified.";
    case "in_progress":
      return "The counsel-led title check is in progress. Nothing in this draft is a title opinion.";
    default:
      return "Title is unverified. Uploading documents does not verify title. Nothing in this report is a title opinion.";
  }
}

export function documentReadiness(inv: ReadinessCase["inventory"], titleDocKeys: string[]) {
  const keys = Object.keys(inv);
  return {
    have: keys.filter((k) => inv[k] === "available").length,
    total: keys.length,
    titleHave: titleDocKeys.filter((k) => inv[k] === "available").length,
    titleTotal: titleDocKeys.length,
  };
}

/** Coarse lead score 0–100 for CRM prioritisation (no PII). */
export function leadScore(c: Pick<ReadinessCase, "project" | "parcel" | "inventory" | "paymentStatus">, titleDocKeys: string[]): number {
  let s = 0;
  if (c.paymentStatus === "paid") s += 35;
  if (c.parcel.acquired === "yes") s += 15; else if (c.parcel.acquired === "in_progress") s += 8;
  if (c.project.funds === "available") s += 15; else if (c.project.funds === "staged") s += 8;
  if (["100k_200k", "200k_400k", "400k_plus"].includes(c.project.budgetBand)) s += 15; else if (c.project.budgetBand === "50k_100k") s += 8;
  const d = documentReadiness(c.inventory, titleDocKeys);
  s += Math.round((d.titleHave / Math.max(1, d.titleTotal)) * 10);
  if (["drawings", "structural", "permit_applied", "permitted"].includes(c.project.designStatus)) s += 10;
  return Math.min(100, s);
}

export function caseNumberFor(id: string, at = new Date()): string {
  const y = at.getUTCFullYear().toString().slice(2);
  const m = String(at.getUTCMonth() + 1).padStart(2, "0");
  return `BGR-${y}${m}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}
