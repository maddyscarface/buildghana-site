import "server-only";
import { ghlConfigured, ghlLogNoop, upsertContactMinimal, upsertOpportunity } from "@/lib/server/ghl";
import { opportunityStatusFor, parseJsonEnv, rrStageFor } from "@/config/ghl-pipelines";
import { leadScore, type ReadinessCase } from "./model";
import { documentInventory } from "@/config/readiness";

const titleDocKeys = documentInventory.filter((d) => d.title).map((d) => d.key as string);
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://buildghana-site.vercel.app").replace(/\/$/, "");

/**
 * Readiness Review → GoHighLevel. Sends the minimum needed to run the pipeline and follow-ups:
 * contact basics, project type, coarse location (region), budget band, lead score, source and an admin case URL
 * (no client token). NEVER sends deeds, documents, document names, concerns text, counsel reports or notes.
 */
export async function syncCaseToGhl(c: ReadinessCase): Promise<{ status: "ok" | "skipped" | "error"; detail?: string; contactId?: string; opportunityId?: string }> {
  const stage = rrStageFor({ status: c.status, engagement: c.engagement, siteScheduled: Boolean(c.siteVisit?.scheduledFor) });
  const pipelineId = process.env.GHL_RR_PIPELINE_ID;
  const stageId = parseJsonEnv("GHL_RR_STAGE_IDS")[stage];
  if (!ghlConfigured) {
    ghlLogNoop("readiness_case", { caseId: c.id, caseNumber: c.caseNumber, status: c.status, stage, titleStatus: c.titleStatus, sandbox: c.sandbox, leadScore: leadScore(c, titleDocKeys) });
    return { status: "skipped", detail: "GHL not configured" };
  }
  try {
    const tags = ["source-website", "product-readiness-review", "rev-readiness-review", `rr-${stage}`, ...(c.sandbox ? ["sandbox-test"] : [])];
    if (c.consents.marketing) tags.push("consent-email-marketing");
    const contactId = c.crm?.contactId || await upsertContactMinimal({
      firstName: c.contact.firstName, lastName: c.contact.lastName, email: c.contact.email, phone: c.contact.phone, country: c.contact.country,
      source: "Website — Readiness Review", tags,
      fields: {
        rr_case_id: c.id, rr_case_number: c.caseNumber, rr_status: c.status, rr_title_status: c.titleStatus,
        rr_project_type: c.project.use, rr_location: c.parcel.region, rr_budget_band: `${c.project.budgetBand} ${c.project.budgetCurrency}`,
        rr_lead_score: String(leadScore(c, titleDocKeys)), rr_case_url: `${siteUrl()}/admin/readiness?case=${c.id}`,
        rr_amount: c.payment?.amountMinor ? (c.payment.amountMinor / 100).toFixed(2) : undefined, rr_currency: c.payment?.currency,
        utm_source: c.attribution?.utm_source, utm_campaign: c.attribution?.utm_campaign, first_touch_source: c.attribution?.first_touch_source,
      },
    });
    let opportunityId: string | undefined;
    if (pipelineId && stageId) {
      const r = await upsertOpportunity({
        contactId, pipelineId, stageId, status: opportunityStatusFor(stage), source: "website-readiness-review",
        name: `Readiness Review — ${c.contact.firstName} ${c.contact.lastName} — ${c.parcel.region}`,
        monetaryValue: c.paymentStatus === "paid" && c.payment?.amountMinor ? c.payment.amountMinor / 100 : undefined,
      });
      opportunityId = r.id;
    }
    return { status: "ok", contactId, opportunityId };
  } catch (e) {
    return { status: "error", detail: (e as Error).message.slice(0, 300) };
  }
}
