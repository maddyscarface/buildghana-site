/**
 * Matching v1 — admin-assisted, deterministic. Pure functions (no I/O) so they are unit-tested.
 *
 * Hard filters (any failure = not a candidate): both records active and not deleted, seller not
 * withdrawn, region, property type, budget (when both sides can be compared), size range.
 * Score (0–100) only ranks candidates for a human; every point has a written reason. Nothing here
 * asserts availability, title or legal certainty.
 */
import { sqmPerUnit } from "@/config/property";
import { terminalStatuses, type BuyerRequirement, type PropertyLead } from "./model";

export type Fx = { usdToGhs: number; source: string; date: string } | null;
export type MatchResult = { eligible: boolean; score: number; reasons: string[]; blockers: string[] };

const toSqm = (v: number | null, unit: string) => (v === null || v === undefined ? null : v * (sqmPerUnit[unit] ?? 1));

/** Converts minor units to USD minor using a timestamped owner-entered rate. null = not comparable. */
export function toUsdMinor(minor: number | null, currency: "GHS" | "USD" | null, fx: Fx): number | null {
  if (minor === null || !currency) return null;
  if (currency === "USD") return minor;
  if (!fx || !(fx.usdToGhs > 0)) return null;
  return Math.round(minor / fx.usdToGhs);
}

export function isMatchable(r: PropertyLead | BuyerRequirement) {
  return !r.deletedAt && !terminalStatuses.includes(r.status) && !r.dedupe.duplicateOf;
}

export function evaluateMatch(p: PropertyLead, b: BuyerRequirement, fx: Fx): MatchResult {
  const reasons: string[] = [];
  const blockers: string[] = [];
  let score = 0;

  if (!isMatchable(p)) return { eligible: false, score: 0, reasons, blockers: ["Seller record is withdrawn, closed, deleted or a duplicate"] };
  if (!isMatchable(b)) return { eligible: false, score: 0, reasons, blockers: ["Buyer record is withdrawn, closed, deleted or a duplicate"] };

  if (!b.wants.regions.includes(p.parcel.region)) return { eligible: false, score: 0, reasons, blockers: [`Region ${p.parcel.region} not in buyer's regions`] };
  score += 25; reasons.push(`Region matches (${p.parcel.region})`);

  if (!b.wants.propertyKinds.includes(p.parcel.propertyKind)) return { eligible: false, score: 0, reasons, blockers: ["Property type not wanted by buyer"] };
  score += 20; reasons.push("Property type matches");

  // Budget
  const ask = toUsdMinor(p.pricing.askingMinor, p.pricing.currency, fx);
  const max = toUsdMinor(b.wants.budgetMaxMinor, b.wants.currency, fx);
  const min = toUsdMinor(b.wants.budgetMinMinor, b.wants.currency, fx);
  if (p.pricing.askingMinor === null) { reasons.push("No asking price given — budget fit to be confirmed by staff"); score += 5; }
  else if (ask === null || max === null) { blockers.push("Budget not comparable: GHS/USD rate not set in admin settings"); score += 5; }
  else if (ask > max * 1.1) return { eligible: false, score: 0, reasons, blockers: ["Asking price more than 10% above buyer's maximum"] };
  else if (ask > max) { score += 10; reasons.push("Asking price within 10% above buyer's maximum (negotiation needed)"); }
  else if (min !== null && ask < min * 0.5) { score += 8; reasons.push("Asking price well below buyer's minimum — check it suits the brief"); }
  else { score += 25; reasons.push("Asking price within buyer's budget"); }
  if (fx && p.pricing.currency !== b.wants.currency && p.pricing.askingMinor !== null) reasons.push(`Converted at ${fx.usdToGhs} GHS/USD (${fx.source}${fx.date ? `, ${fx.date}` : ""})`);

  // Size
  const size = toSqm(p.parcel.sizeValue, p.parcel.sizeUnit);
  const sMin = toSqm(b.wants.sizeMin, b.wants.sizeUnit);
  const sMax = toSqm(b.wants.sizeMax, b.wants.sizeUnit);
  if (size === null || (sMin === null && sMax === null)) { score += 5; reasons.push("Size not compared (missing on one side)"); }
  else if ((sMin !== null && size < sMin * 0.8) || (sMax !== null && size > sMax * 1.5)) return { eligible: false, score: 0, reasons, blockers: ["Size outside buyer's range"] };
  else { score += 10; reasons.push("Size within buyer's range (approximate unit conversion)"); }

  // Use
  if (p.parcel.propertyUse === b.wants.propertyUse || p.parcel.propertyUse === "undecided" || b.wants.propertyUse === "undecided" || p.parcel.propertyUse === "mixed") { score += 10; reasons.push("Use is compatible"); }
  else blockers.push(`Use differs (seller: ${p.parcel.propertyUse}, buyer: ${b.wants.propertyUse})`);

  // Timeline / readiness
  if (["0_3", "3_6"].includes(b.wants.timeline)) { score += 5; reasons.push("Buyer timeline within 6 months"); }

  // Legal review state is never a pass; it is shown so staff know what is outstanding.
  if (p.legalState === "counsel_flagged") blockers.push("Counsel flagged issues on this property");
  else if (p.legalState !== "counsel_cleared_with_qualifications") blockers.push("Counsel review not complete — no title assurance can be given");
  if (p.legal.encumbrance === "yes") blockers.push("Seller disclosed a dispute or encumbrance");
  if (b.eligibility === "non_ghanaian" || b.eligibility === "company" || b.eligibility === "not_sure") blockers.push("Buyer eligibility / tenure must be reviewed by Ghanaian counsel");

  return { eligible: true, score: Math.min(100, score), reasons, blockers };
}

export function rankCandidates<T extends PropertyLead | BuyerRequirement>(
  subject: PropertyLead | BuyerRequirement, pool: T[], fx: Fx,
): { record: T; result: MatchResult }[] {
  return pool
    .map((r) => ({ record: r, result: subject.kind === "seller" ? evaluateMatch(subject, r as BuyerRequirement, fx) : evaluateMatch(r as PropertyLead, subject, fx) }))
    .filter((x) => x.result.eligible)
    .sort((a, b) => b.result.score - a.result.score);
}
