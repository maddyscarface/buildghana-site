import "server-only";
import { ghlConfigured, ghlLogNoop, upsertContactMinimal, upsertOpportunity } from "@/lib/server/ghl";
import { parseJsonEnv } from "@/config/ghl-pipelines";
import { labelFor } from "@/lib/lead/options";
import { propertyKinds } from "@/config/property";
import { coarseLocation, type AnyRecord, type LeadStatus } from "./model";

/**
 * Property introductions → GoHighLevel (dedicated BuildGhana sub-account).
 *  Pipelines: "Property sellers" (GHL_PROP_SELLER_PIPELINE_ID + GHL_PROP_SELLER_STAGE_IDS JSON)
 *             "Property buyers"  (GHL_PROP_BUYER_PIPELINE_ID  + GHL_PROP_BUYER_STAGE_IDS JSON)
 *  Stage JSON is keyed by the lifecycle status (submitted, contact_verified, … withdrawn).
 *
 * Sends ONLY: contact basics, internal record id + reference, role, coarse region/district, property type,
 * status, budget band text and source. NEVER sends GhanaPost GPS, location notes, document names or files,
 * encumbrance notes, asking prices or seller details to a buyer's record.
 */
const siteUrl = () => (process.env.NEXT_PUBLIC_SITE_URL || "https://buildghana-site.vercel.app").replace(/\/$/, "");

const statusToOpp = (s: LeadStatus): "open" | "won" | "lost" => (s === "closed" ? "won" : s === "lost" || s === "withdrawn" ? "lost" : "open");

export function ghlPayload(r: AnyRecord) {
  const isSeller = r.kind === "seller";
  const tags = ["source-website", isSeller ? "property-seller" : "property-buyer", `pp-${r.status}`, ...(r.sandbox ? ["sandbox-test"] : [])];
  if (r.contact.residenceCountry === "GH") tags.push("resident-ghana"); else tags.push("resident-abroad");
  if (r.consents.marketing) tags.push("consent-email-marketing");
  const fields: Record<string, string | undefined> = {
    pp_record_id: r.id,
    pp_reference: r.reference,
    pp_kind: r.kind,
    pp_status: r.status,
    pp_legal_state: r.legalState,
    pp_residence_country: r.contact.residenceCountry,
    pp_preferred_contact: r.contact.preferredContact,
    pp_admin_url: `${siteUrl()}/admin/property?${r.kind}=${r.id}`,
    utm_source: r.attribution?.utm_source, utm_campaign: r.attribution?.utm_campaign, first_touch_source: r.attribution?.first_touch_source,
  };
  if (r.kind === "seller") {
    fields.pp_region = r.parcel.region;
    fields.pp_district = r.parcel.district;
    fields.pp_property_type = labelFor(propertyKinds, r.parcel.propertyKind);
  } else {
    fields.pp_region = r.wants.regions.join(", ");
    fields.pp_property_type = r.wants.propertyKinds.map((k) => labelFor(propertyKinds, k)).join(", ");
    fields.pp_budget_band = `${r.wants.currency} up to ${Math.round((r.wants.budgetMaxMinor ?? 0) / 100).toLocaleString("en-US")}`;
    fields.pp_buyer_eligibility = r.eligibility;
  }
  const where = r.kind === "seller" ? coarseLocation(r.parcel) : r.wants.regions.slice(0, 3).join("/");
  const name = `${isSeller ? "Seller" : "Buyer"} ${r.reference} — ${where}`;
  return { tags, fields, name };
}

export async function syncPropertyToGhl(r: AnyRecord): Promise<{ status: "ok" | "skipped" | "error"; detail?: string; contactId?: string; opportunityId?: string }> {
  const pre = r.kind === "seller" ? "GHL_PROP_SELLER" : "GHL_PROP_BUYER";
  const pipelineId = process.env[`${pre}_PIPELINE_ID`];
  const stageId = parseJsonEnv(`${pre}_STAGE_IDS`)[r.status];
  const { tags, fields, name } = ghlPayload(r);
  if (!ghlConfigured) {
    ghlLogNoop(`property_${r.kind}`, { recordId: r.id, reference: r.reference, status: r.status, pipeline: pipelineId ? "set" : "unset", stage: r.status, tags: tags.length });
    return { status: "skipped", detail: "GHL not configured" };
  }
  try {
    const contactId = r.crm?.contactId || await upsertContactMinimal({
      firstName: r.contact.firstName, lastName: r.contact.lastName, email: r.contact.email, phone: r.contact.phone,
      country: r.contact.residenceCountry.length === 2 ? r.contact.residenceCountry : undefined,
      source: r.kind === "seller" ? "Website — Property seller" : "Website — Property buyer", tags, fields,
    });
    let opportunityId: string | undefined;
    if (pipelineId && stageId) {
      const o = await upsertOpportunity({ contactId, pipelineId, stageId, name, status: statusToOpp(r.status), source: `website-property-${r.kind}` });
      opportunityId = o.id;
    }
    return { status: "ok", contactId, opportunityId };
  } catch (e) {
    return { status: "error", detail: (e as Error).message.slice(0, 300) };
  }
}

/** Staff notification for a suggested match — internal ids + coarse fields only. Log mode when GHL isn't set. */
export async function notifyStaffOfMatch(m: { matchId: string; propertyRef: string; buyerRef: string; score: number; region: string }) {
  const hook = process.env.GHL_PROP_MATCH_WEBHOOK_URL; // optional GHL inbound-webhook workflow trigger
  if (!hook) { ghlLogNoop("property_match_suggested", m); return { status: "skipped" as const }; }
  try {
    const r = await fetch(hook, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ event: "property_match_suggested", ...m, admin_url: `${siteUrl()}/admin/property?match=${m.matchId}` }) });
    return { status: r.ok ? ("ok" as const) : ("error" as const) };
  } catch { return { status: "error" as const }; }
}
