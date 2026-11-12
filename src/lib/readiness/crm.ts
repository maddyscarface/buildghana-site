import "server-only";
import { ghlConfigured, ghlLogNoop, upsertContactMinimal, upsertOpportunity } from "@/lib/server/ghl";
import { opportunityStatusFor, parseJsonEnv, rrStageFor } from "@/config/ghl-pipelines";
import type { ReadinessCase } from "./model";

/**
 * Readiness Review → GoHighLevel. Sends the minimum needed to run the pipeline and follow-ups:
 * name, email, phone, country, case id/status/title status, amount and attribution source.
 * NEVER sends documents, document names, concerns text or counsel notes.
 */
export async function syncCaseToGhl(c: ReadinessCase): Promise<{ status: "ok" | "skipped" | "error"; detail?: string; contactId?: string; opportunityId?: string }> {
  const titleActive = ["referred_to_counsel", "counsel_in_progress", "counsel_findings_received"].includes(c.titleStatus);
  const stage = rrStageFor(c.status, titleActive);
  const pipelineId = process.env.GHL_RR_PIPELINE_ID;
  const stageId = parseJsonEnv("GHL_RR_STAGE_IDS")[stage];
  if (!ghlConfigured) {
    ghlLogNoop("readiness_case", { caseId: c.id, status: c.status, stage, titleStatus: c.titleStatus, sandbox: c.sandbox });
    return { status: "skipped", detail: "GHL not configured" };
  }
  try {
    const tags = ["source-website", "product-readiness-review", "rev-readiness-review", `rr-${stage}`, ...(c.sandbox ? ["sandbox-test"] : [])];
    if (c.consents.marketing) tags.push("consent-email-marketing");
    const contactId = c.crm?.contactId || await upsertContactMinimal({
      firstName: c.contact.firstName, lastName: c.contact.lastName, email: c.contact.email, phone: c.contact.phone, country: c.contact.country,
      source: "Website — Readiness Review", tags,
      fields: {
        rr_case_id: c.id, rr_status: c.status, rr_title_status: c.titleStatus,
        rr_amount: c.payment?.amountMinor ? (c.payment.amountMinor / 100).toFixed(2) : undefined, rr_currency: c.payment?.currency,
        utm_source: c.attribution?.utm_source, utm_campaign: c.attribution?.utm_campaign, first_touch_source: c.attribution?.first_touch_source,
      },
    });
    let opportunityId: string | undefined;
    if (pipelineId && stageId) {
      const r = await upsertOpportunity({
        contactId, pipelineId, stageId, status: opportunityStatusFor(stage), source: "website-readiness-review",
        name: `Readiness Review — ${c.contact.firstName} ${c.contact.lastName} — ${c.property.region}`,
        monetaryValue: c.paymentStatus === "paid" && c.payment?.amountMinor ? c.payment.amountMinor / 100 : undefined,
      });
      opportunityId = r.id;
    }
    return { status: "ok", contactId, opportunityId };
  } catch (e) {
    return { status: "error", detail: (e as Error).message.slice(0, 300) };
  }
}
