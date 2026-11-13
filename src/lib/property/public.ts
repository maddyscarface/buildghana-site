import "server-only";
import { labelFor } from "@/lib/lead/options";
import { areaUnits, opportunitiesMode, propertyKinds, propertyUses } from "@/config/property";
import { terminalStatuses } from "./model";
import { currentAuthorization, listSellers } from "./store";

/**
 * The ONLY public projection of seller inventory. Used by /property/opportunities in "listings" mode.
 * A record appears only with a current (unrevoked) authorisation that includes public listing, a completed
 * factual review and image permission. Output is an allow-list: reference, region, district, type, use, size.
 * Never: names, contacts, GhanaPost GPS, town/street, location notes, documents, prices, legal notes.
 */
export type PublicListing = { reference: string; region: string; district: string; type: string; use: string; size: string; indexable: boolean };

export async function publicListings(): Promise<PublicListing[]> {
  if (opportunitiesMode() !== "listings") return [];
  const out: PublicListing[] = [];
  for (const r of await listSellers()) {
    if (r.deletedAt || r.dedupe.duplicateOf || terminalStatuses.includes(r.status)) continue;
    const a = await currentAuthorization(r.id);
    if (!a || a.revokedAt || !a.publicListing || !a.factualReviewDone || !a.imagePermission) continue;
    out.push({
      reference: r.reference, region: r.parcel.region, district: r.parcel.district,
      type: labelFor(propertyKinds, r.parcel.propertyKind), use: labelFor(propertyUses, r.parcel.propertyUse),
      size: r.parcel.sizeValue ? `${r.parcel.sizeValue} ${labelFor(areaUnits, r.parcel.sizeUnit).toLowerCase()}` : "On request",
      indexable: a.searchIndexConsent,
    });
  }
  return out;
}
