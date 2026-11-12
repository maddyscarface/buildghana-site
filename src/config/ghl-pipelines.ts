/**
 * GoHighLevel pipeline/stage mapping. IDs come from env so nothing account-specific is in code.
 *
 *  Acquisition pipeline (website leads)      GHL_PIPELINE_ID + GHL_STAGE_NEW_LEAD / GHL_STAGE_PRIORITY
 *                                            optional GHL_STAGE_IDS JSON {"new_lead","priority","standard","nurture"}
 *  Readiness Review pipeline (paid product)  GHL_RR_PIPELINE_ID + GHL_RR_STAGE_IDS JSON keyed by the logical stages below
 *
 * Revenue stays separable: Readiness Review opportunities live in their own pipeline and carry the
 * tag "rev-readiness-review"; construction work is tracked in the acquisition pipeline.
 */
import type { CaseStatus } from "@/lib/readiness/model";

/** Spec §3 pipeline: New inquiry → Readiness intake started → Payment pending → Paid review → Documents incomplete
 *  → Site visit scheduled → Legal/title check → Report delivered → PM proposal → Won/Lost. */
export const rrLogicalStages = [
  "new_inquiry", "intake_started", "payment_pending", "paid_review", "documents_incomplete", "site_visit_scheduled",
  "legal_title_check", "report_delivered", "pm_proposal", "won", "lost",
] as const;
export type RrStage = (typeof rrLogicalStages)[number];

export function rrStageFor(c: { status: CaseStatus; engagement?: "pm_proposal" | "won" | "lost"; siteScheduled?: boolean }): RrStage {
  if (c.engagement) return c.engagement;
  switch (c.status) {
    case "draft": return "intake_started";
    case "awaiting_payment": case "payment_failed": return "payment_pending";
    case "paid": return "paid_review";
    case "intake_incomplete": case "needs_more_documents": return "documents_incomplete";
    case "scheduling": return c.siteScheduled ? "site_visit_scheduled" : "paid_review";
    case "site_visit_completed": case "documents_under_review": return "site_visit_scheduled";
    case "legal_title_check_pending": case "legal_title_check_complete": case "report_drafting": case "internal_qa": return "legal_title_check";
    case "delivered": case "follow_up": return "report_delivered";
    case "on_hold": return "paid_review";
    case "cancelled": case "refunded": return "lost";
  }
}

export const opportunityStatusFor = (s: RrStage): "open" | "won" | "lost" => (s === "won" ? "won" : s === "lost" ? "lost" : "open");

export function parseJsonEnv(name: string): Record<string, string> {
  try { return JSON.parse(process.env[name] || "{}"); } catch { return {}; }
}
