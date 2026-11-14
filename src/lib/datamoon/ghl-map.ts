import "server-only";
import { ghlConfigured, upsertContactMinimal } from "@/lib/server/ghl";
import { isSuppressed } from "@/lib/ops/store";
import { dmConfig } from "./config";
import { getContact, getRecipe, saveContact, type VendorContact } from "./store";
import type { Recipe } from "./recipes";

/**
 * DataMoon prospect → GoHighLevel (BuildGhana sub-account) mapping. Prospects are third-party records:
 *  - tagged `datamoon-prospect` + `no-auto-outreach`; NO consent tags; NO phone; NO opportunity is created;
 *  - only when DATAMOON_GHL_SYNC_ENABLED, the recipe has an owner CRM-sync approval and a GHL destination,
 *    and the person is not suppressed (checked again at send time).
 * GHL workflows must not enrol `no-auto-outreach` contacts into SMS/email sequences (owner to configure).
 */
export function vendorGhlPayload(v: VendorContact, r: Pick<Recipe, "id" | "persona">) {
  return {
    tags: ["source-datamoon", "datamoon-prospect", "no-auto-outreach", `dm-recipe-${r.id.slice(0, 8)}`, `dm-persona-${r.persona}`, ...(v.synthetic ? ["sandbox-test"] : [])],
    fields: { dm_contact_id: v.contactId, dm_recipe_id: r.id, dm_import_id: v.importId, dm_provenance: "DataMoon (third-party, no opt-in)", dm_imported_at: v.importedAt, dm_state: v.state?.toUpperCase() },
  };
}

export function syncBlockers(v: VendorContact | null, r: Recipe | null, cfg = dmConfig()): string | null {
  if (!v) return "Vendor contact not found";
  if (!r) return "Recipe not found";
  if (!cfg.ghlSyncEnabled) return "DATAMOON_GHL_SYNC_ENABLED is off";
  if (!r.crmSyncApproval) return "Recipe has no owner CRM-sync approval";
  if (!r.destinations.includes("ghl_buildghana_subaccount")) return "Recipe destination excludes GHL";
  if (v.synthetic && process.env.VERCEL_ENV === "production") return "Synthetic fixtures never sync on production";
  if (!v.email) return "No email to match on (phones are never sent)";
  if (v.status === "suppressed" || v.status === "rejected" || v.status === "deleted") return `Contact status is ${v.status}`;
  return null;
}

export async function syncVendorContact(id: string): Promise<{ status: "ok" | "skipped" | "error"; detail?: string }> {
  const v = await getContact(id);
  const r = v ? await getRecipe(v.recipeId) : null;
  const block = syncBlockers(v, r);
  if (block) return { status: "skipped", detail: block };
  if (await isSuppressed({ email: v!.email, contactId: v!.contactId })) { v!.status = "suppressed"; await saveContact(v!); return { status: "skipped", detail: "suppressed" }; }
  if (!ghlConfigured) return { status: "skipped", detail: "GHL not configured" };
  try {
    const { tags, fields } = vendorGhlPayload(v!, r!);
    const contactId = await upsertContactMinimal({ firstName: v!.firstName || "", lastName: v!.lastName || "", email: v!.email!, source: "DataMoon prospect (no opt-in)", tags, fields });
    v!.status = "synced"; v!.crm = { status: "ok", contactId, at: new Date().toISOString() }; await saveContact(v!);
    return { status: "ok" };
  } catch (e) { return { status: "error", detail: (e as Error).message.slice(0, 300) }; }
}
