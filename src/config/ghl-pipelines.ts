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

export const rrLogicalStages = ["intake", "awaiting_payment", "paid_awaiting_docs", "in_review", "counsel", "report", "delivered", "lost"] as const;
export type RrStage = (typeof rrLogicalStages)[number];

export function rrStageFor(status: CaseStatus, titleInProgress = false): RrStage {
  switch (status) {
    case "intake_submitted": return "intake";
    case "awaiting_payment": case "payment_failed": return "awaiting_payment";
    case "paid": case "awaiting_documents": return "paid_awaiting_docs";
    case "documents_received": case "in_review": return titleInProgress ? "counsel" : "in_review";
    case "report_drafting": case "report_ready": return "report";
    case "delivered": return "delivered";
    case "on_hold": return "in_review";
    case "cancelled": case "refunded": return "lost";
  }
}

export const opportunityStatusFor = (s: RrStage): "open" | "won" | "lost" => (s === "delivered" ? "won" : s === "lost" ? "lost" : "open");

export function parseJsonEnv(name: string): Record<string, string> {
  try { return JSON.parse(process.env[name] || "{}"); } catch { return {}; }
}
