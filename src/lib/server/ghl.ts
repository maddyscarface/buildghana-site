import { qualifierFields, type Qualifiers } from "@/lib/estimate/qualifiers";
import { estimateConfig } from "@/config/estimate";
import "server-only";
import type { Lead } from "@/lib/lead/schema";
import type { ScoreResult } from "@/lib/lead/scoring";
import {
  budgetRanges, constructionTypes, currentCountries, documentOptions, labelFor, landStatuses,
  projectStages, serviceOptions, startTimelines,
} from "@/lib/lead/options";

/**
 * GoHighLevel (LeadConnector API v2) adapter.
 * Docs: https://highlevel.stoplight.io/docs/integrations — verify endpoints against your account
 * before go-live. This adapter does NOTHING unless GHL_PRIVATE_TOKEN and GHL_LOCATION_ID are set.
 */

const BASE = process.env.GHL_API_BASE || "https://services.leadconnectorhq.com";
const VERSION = process.env.GHL_API_VERSION || "2021-07-28";
const TOKEN = process.env.GHL_PRIVATE_TOKEN;
const LOCATION = process.env.GHL_LOCATION_ID;

export const ghlConfigured = Boolean(TOKEN && LOCATION);

/** Website field key → GHL custom field ID, from env JSON. See docs/07-ghl-data-mapping.md */
function fieldIds(): Record<string, string> {
  try { return JSON.parse(process.env.GHL_CUSTOM_FIELD_IDS || "{}"); } catch { return {}; }
}

async function ghl<T>(path: string, init: RequestInit & { body?: string }): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Version: VERSION,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    cache: "no-store",
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`GHL ${init.method} ${path} → ${res.status}: ${text.slice(0, 500)}`);
  return (text ? JSON.parse(text) : {}) as T;
}

/** Build the custom-field payload. Only fields with a configured ID are sent. */
export function buildCustomFields(lead: Lead, score: ScoreResult, leadId: string) {
  const a = lead.attribution ?? {};
  const raw: Record<string, string | number | undefined> = {
    lead_id: leadId,
    funnel: lead.funnel,
    current_country: labelFor(currentCountries, lead.current_country),
    ghana_region: lead.ghana_region,
    ghana_city: lead.ghana_city,
    land_status: labelFor(landStatuses, lead.land_status),
    project_stage: labelFor(projectStages, lead.project_stage),
    construction_type: labelFor(constructionTypes, lead.construction_type),
    budget_range: labelFor(budgetRanges, lead.budget_range),
    start_timeline: labelFor(startTimelines, lead.start_timeline),
    services_requested: lead.services.map((s) => labelFor(serviceOptions, s)).join(", "),
    project_description: lead.project_description,
    documents_available: lead.documents_available.map((d) => labelFor(documentOptions, d)).join(", "),
    whatsapp_preferred: lead.whatsapp_same ? "Yes" : "No",
    consent_marketing: lead.consent_marketing ? "Yes" : "No",
    consent_sms_whatsapp: lead.consent_sms_whatsapp ? "Yes" : "No",
    consent_timestamp: new Date().toISOString(),
    lead_score: score.score,
    lead_tier: score.tier,
    utm_source: a.utm_source,
    utm_medium: a.utm_medium,
    utm_campaign: a.utm_campaign,
    utm_term: a.utm_term,
    utm_content: a.utm_content,
    gclid: a.gclid,
    gbraid: a.gbraid,
    wbraid: a.wbraid,
    fbclid: a.fbclid,
    fbc: a.fbc,
    fbp: a.fbp,
    landing_page: a.landing_page,
    referrer: a.referrer,
    first_touch_source: a.first_touch_source,
    first_touch_campaign: a.first_touch_campaign,
    openai_obref: a.openai_obref,
    openai_oppref: a.openai_oppref,
    // Pre-consultation answers: est_size, est_budget_fit, est_typical_range, est_offer_guidance, est_preferred_date…
    ...qualifierFields(estimateConfig, lead.qualifiers as Qualifiers | undefined),
  };
  const ids = fieldIds();
  return Object.entries(raw)
    .filter(([k, v]) => ids[k] && v !== undefined && v !== "")
    .map(([k, v]) => ({ id: ids[k], field_value: String(v) }));
}

export function buildTags(lead: Lead, score: ScoreResult): string[] {
  const tags = new Set<string>([
    "source-website",
    `funnel-${lead.funnel}`,
    score.tag,
    `stage-${lead.project_stage}`,
    ...lead.services.map((s) => `svc-${s}`),
  ]);
  if (lead.consent_marketing) tags.add("consent-email-marketing");
  if (lead.consent_sms_whatsapp) tags.add("consent-sms-whatsapp");
  if (lead.attribution?.gclid || lead.attribution?.gbraid || lead.attribution?.wbraid) tags.add("src-google-ads");
  if (lead.attribution?.fbclid || lead.attribution?.fbc) tags.add("src-meta-ads");
  return [...tags];
}

export type GhlResult =
  | { status: "skipped"; reason: string }
  | { status: "ok"; contactId: string; opportunityId?: string }
  | { status: "error"; error: string };

export async function syncLeadToGhl(lead: Lead, score: ScoreResult, leadId: string): Promise<GhlResult> {
  if (!ghlConfigured) return { status: "skipped", reason: "GHL_PRIVATE_TOKEN / GHL_LOCATION_ID not set" };
  try {
    // 1. Upsert contact (GHL dedupes on email/phone per location settings)
    const upsert = await ghl<{ contact?: { id: string }; new?: boolean }>("/contacts/upsert", {
      method: "POST",
      body: JSON.stringify({
        locationId: LOCATION,
        firstName: lead.first_name,
        lastName: lead.last_name,
        email: lead.email,
        phone: lead.phone,
        country: lead.current_country.length === 2 ? lead.current_country : undefined,
        source: `Website — ${lead.funnel}`,
        tags: buildTags(lead, score),
        customFields: buildCustomFields(lead, score, leadId),
      }),
    });
    const contactId = upsert.contact?.id;
    if (!contactId) throw new Error("GHL upsert returned no contact id");

    // 2. Note with full submission for the sales team
    await ghl(`/contacts/${contactId}/notes`, {
      method: "POST",
      body: JSON.stringify({
        body: [
          `Website lead ${leadId} — score ${score.score} (${score.tier})`,
          `Funnel: ${lead.funnel}`,
          `Services: ${lead.services.map((s) => labelFor(serviceOptions, s)).join(", ")}`,
          `Location: ${lead.ghana_city ? lead.ghana_city + ", " : ""}${lead.ghana_region}`,
          `Stage: ${labelFor(projectStages, lead.project_stage)} | Land: ${labelFor(landStatuses, lead.land_status)}`,
          `Budget: ${labelFor(budgetRanges, lead.budget_range)} | Start: ${labelFor(startTimelines, lead.start_timeline)}`,
          `Description: ${lead.project_description || "—"}`,
          `Score breakdown: ${JSON.stringify(score.breakdown)}`,
        ].join("\n"),
      }),
    }).catch((e) => console.warn("[ghl] note failed", e));

    // 3. Opportunity in the acquisition pipeline
    let opportunityId: string | undefined;
    const pipelineId = process.env.GHL_PIPELINE_ID;
    const stageId = score.tier === "priority" && process.env.GHL_STAGE_PRIORITY
      ? process.env.GHL_STAGE_PRIORITY
      : process.env.GHL_STAGE_NEW_LEAD;
    if (pipelineId && stageId) {
      const opp = await ghl<{ opportunity?: { id: string } }>("/opportunities/", {
        method: "POST",
        body: JSON.stringify({
          locationId: LOCATION,
          pipelineId,
          pipelineStageId: stageId,
          contactId,
          name: `${lead.first_name} ${lead.last_name} — ${lead.funnel} — ${lead.ghana_region}`,
          status: "open",
          source: "website",
        }),
      });
      opportunityId = opp.opportunity?.id;
    }
    return { status: "ok", contactId, opportunityId };
  } catch (e) {
    return { status: "error", error: (e as Error).message };
  }
}
