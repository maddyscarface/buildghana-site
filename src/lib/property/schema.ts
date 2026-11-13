import { z } from "zod";
import { attributionSchema } from "@/lib/lead/schema";
import type { Option } from "@/lib/lead/options";
import {
  areaUnits, buyerEligibility, buyerRoles, buyerTimelines, contactMethods, counselStatuses, currencies, encumbranceAnswers,
  financingStatuses, inspectionAvailability, intendedUses, languages, negotiability, occupancyOptions, planningStatuses,
  propertyKinds, propertyRegions, propertyUses, representationRequests, residenceCountries, sellerDocumentInventory, sellerRoles,
  siteVisitPrefs, tenurePreferences, titleStatusSelfReport,
} from "@/config/property";

const vals = (o: Option[]) => o.map((x) => x.value) as [string, ...string[]];
const en = (o: Option[], msg: string) => z.enum(vals(o), { message: msg });
const text = (max: number) => z.string().trim().max(max);
const optText = (max: number) => text(max).optional().or(z.literal("").transform(() => undefined));
const num = z.union([z.number(), z.string(), z.null()]).transform((v) => (v === "" || v === null ? null : Number(v)))
  .refine((v) => v === null || (Number.isFinite(v) && v >= 0 && v < 1e12), "Enter a valid number");
const optNum = num.optional().transform((v) => (v === undefined ? null : v));

/** International phone. Accepts +233 024 123 4567, 0241234567 (Ghana local), +1 617 555 0100, +44 7700 900123. */
export const phoneRegex = /^\+?[0-9 ()\-.]{7,22}$/;
const phone = z.string().trim().regex(phoneRegex, "Please include your country code, e.g. +233 24 123 4567");

/** GhanaPost digital address, e.g. GA-183-8164 or AK-039-5028. Optional and PRIVATE. */
export const ghanaPostRegex = /^[A-Z]{2}-?\d{3,4}-?\d{3,5}$/i;

const common = {
  submission_id: z.string().uuid({ message: "Invalid submission id" }),
  first_name: text(80).min(1, "Please enter your first name"),
  last_name: text(80).min(1, "Please enter your last name"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(254),
  phone,
  whatsapp: phone.optional().or(z.literal("").transform(() => undefined)),
  preferred_contact: en(contactMethods, "Choose how we should contact you"),
  residence_country: en(residenceCountries, "Select where you live"),
  language: en(languages, "Select a language").default("en"),
  consent_contact: z.literal(true, { errorMap: () => ({ message: "We need your permission to contact you about this inquiry" }) }),
  consent_marketing: z.boolean().default(false),
  ads_consent: z.boolean().default(false),
  attribution: attributionSchema,
  page_url: z.string().url().max(2000).optional(),
  form_started_at: z.number().int().positive(),
  company_website: z.string().max(0, "spam").optional().default(""), // honeypot
  turnstile_token: z.string().max(4000).optional(),
};

export const sellerSchema = z.object({
  ...common,
  seller_role: en(sellerRoles, "Tell us your relationship to the property"),
  region: en(propertyRegions, "Select a region"),
  district: text(80).min(2, "Enter the district or municipality"),
  town: text(80).min(2, "Enter the town or area"),
  ghana_post_gps: optText(16).refine((v) => !v || ghanaPostRegex.test(v), "Use the GhanaPost GPS format, e.g. GA-183-8164"),
  location_notes: optText(300),
  size_value: optNum,
  size_unit: en(areaUnits, "Select a unit").default("plots"),
  property_kind: en(propertyKinds, "Select the type of property"),
  property_use: en(propertyUses, "Select the current or permitted use"),
  occupancy: en(occupancyOptions, "Select the occupancy"),
  asking_price: optNum,
  currency: z.enum(vals(currencies)).optional().or(z.literal("").transform(() => undefined)),
  negotiability: en(negotiability, "Select one").default("negotiable"),
  title_self_report: en(titleStatusSelfReport, "Select what documents you hold"),
  planning_status: en(planningStatuses, "Select the planning / permit status"),
  encumbrance: en(encumbranceAnswers, "Tell us about any disputes or claims"),
  encumbrance_notes: optText(600),
  document_inventory: z.array(z.enum(vals(sellerDocumentInventory))).max(10).default([]),
  inspection: en(inspectionAvailability, "Select inspection availability"),
  representation: en(representationRequests, "Select one").default("undecided"),
  notes: optText(1200),
}).superRefine((v, ctx) => {
  if (v.asking_price && !v.currency) ctx.addIssue({ code: "custom", path: ["currency"], message: "Select GHS or USD for the asking price" });
  if (v.encumbrance === "yes" && !v.encumbrance_notes) ctx.addIssue({ code: "custom", path: ["encumbrance_notes"], message: "Briefly describe the issue so counsel can review it" });
});
export type SellerInput = z.infer<typeof sellerSchema>;

export const buyerSchema = z.object({
  ...common,
  buyer_role: en(buyerRoles, "Select who is buying"),
  eligibility: en(buyerEligibility, "Select one (self-reported)"),
  regions: z.array(z.enum(vals(propertyRegions))).min(1, "Choose at least one region").max(16),
  areas: optText(300),
  property_kinds: z.array(z.enum(vals(propertyKinds))).min(1, "Choose at least one property type").max(6),
  property_use: en(propertyUses, "Select the intended use"),
  size_min: optNum,
  size_max: optNum,
  size_unit: en(areaUnits, "Select a unit").default("plots"),
  budget_min: optNum,
  budget_max: num.refine((v) => v !== null && v > 0, "Enter your maximum budget"),
  currency: en(currencies, "Select GHS or USD"),
  timeline: en(buyerTimelines, "Select a timeline"),
  financing: z.enum(vals(financingStatuses)).optional().or(z.literal("").transform(() => undefined)),
  intended_use: en(intendedUses, "Select how you will use it"),
  tenure: en(tenurePreferences, "Select a tenure preference"),
  must_haves: optText(800),
  site_visit: en(siteVisitPrefs, "Select a site visit preference"),
  counsel: en(counselStatuses, "Select your legal counsel status"),
}).superRefine((v, ctx) => {
  if (v.budget_min !== null && v.budget_max !== null && v.budget_min > v.budget_max) ctx.addIssue({ code: "custom", path: ["budget_min"], message: "Minimum must be below maximum" });
  if (v.size_min !== null && v.size_max !== null && v.size_min > v.size_max) ctx.addIssue({ code: "custom", path: ["size_min"], message: "Minimum must be below maximum" });
});
export type BuyerInput = z.infer<typeof buyerSchema>;

export const privacyRequestSchema = z.object({
  type: z.enum(["deletion", "withdrawal", "abuse_report", "access_revocation"]),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(254),
  reference: optText(40),
  message: text(1500).min(5, "Please add a short description"),
  company_website: z.string().max(0).optional().default(""),
});

export const uploadRequestSchema = z.object({
  token: z.string().min(10).max(200),
  category: z.enum(["media", "document"]),
  doc_type: optText(40),
  filename: text(200).min(1),
  content_type: z.string().max(100),
  size: z.number().int().positive(),
});

export const MIN_FILL_MS = 4000;

/** Flattens zod issues into { field: message }. */
export function fieldErrors(err: z.ZodError) {
  const out: Record<string, string> = {};
  for (const i of err.issues) { const k = i.path.join(".") || "_"; out[k] ??= i.message; }
  return out;
}
