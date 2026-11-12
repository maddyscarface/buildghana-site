import { z } from "zod";
import { values, currentCountries, ghanaRegions } from "@/lib/lead/options";
import {
  contactMethods, timeZones, areaUnits, landControllers, acquiredStatuses, siteAccess, intendedUses, finishLevels, budgetBands,
  budgetCurrencies, fundsStatuses, designStatuses, addOnServices, docKeys, docAvailability,
} from "@/config/readiness";

const trimmed = (max: number) => z.string().trim().max(max);
const opt = (max: number) => trimmed(max).optional().default("");
const mustAccept = (message: string) => z.literal(true, { errorMap: () => ({ message }) });

/** Step A payload (spec §2). Mirrors the client form exactly. Missing documents never block submission. */
export const intakeSchema = z.object({
  submission_id: z.string().uuid(),
  form_started_at: z.number().int().positive(),
  company_website: z.string().max(0).optional().or(z.literal("")), // honeypot
  // Contact
  first_name: trimmed(80).min(1, "Please enter your first name"),
  last_name: trimmed(80).min(1, "Please enter your last name"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(200),
  phone: z.string().trim().regex(/^\+?[0-9 ()\-.]{7,20}$/, "Please include your country code, e.g. +1 617 555 0100"),
  whatsapp_same: z.boolean().default(true),
  current_country: z.enum(values(currentCountries)),
  preferred_contact: z.enum(values(contactMethods)),
  time_zone: z.enum(values(timeZones)),
  // Parcel
  ghana_region: z.enum(values(ghanaRegions)),
  district: trimmed(120).min(1, "Please enter the district or municipal assembly (or 'not sure')"),
  locality: trimmed(120).min(1, "Please enter the town or neighbourhood"),
  gps: opt(60),
  map_lat: z.number().min(4).max(12).optional(),
  map_lng: z.number().min(-4).max(2).optional(),
  plot_number: opt(60),
  land_area: opt(40),
  area_unit: z.enum(values(areaUnits)),
  access: z.enum(values(siteAccess)),
  land_controller: z.enum(values(landControllers)),
  acquired: z.enum(values(acquiredStatuses)),
  site_contact_name: opt(120),
  site_contact_phone: z.string().trim().regex(/^(\+?[0-9 ()\-.]{7,20})?$/, "Please include the country code").optional().default(""),
  site_contact_relationship: opt(80),
  // Intended use
  intended_use: z.enum(values(intendedUses)),
  use_other: opt(120),
  floor_area: opt(40),
  units: opt(20),
  floors: opt(20),
  finish: z.enum(values(finishLevels)),
  description: opt(2000),
  // Budget & timing
  budget_band: z.enum(values(budgetBands)),
  budget_currency: z.enum(values(budgetCurrencies) as ["USD", "GHS"]),
  funds: z.enum(values(fundsStatuses)),
  land_included: z.boolean().default(false),
  target_start: z.string().regex(/^(\d{4}-\d{2})?$/, "Use the month picker").optional().default(""),
  design_status: z.enum(values(designStatuses)),
  add_ons: z.array(z.enum(values(addOnServices))).max(6).default([]),
  concerns: opt(2000),
  // Document inventory
  inventory: z.record(z.enum(docKeys), z.enum(docAvailability)).refine((r) => Object.keys(r).length === docKeys.length, "Please mark every document as available, missing or uncertain"),
  // Consents
  consent_authority: mustAccept("Please confirm you're authorised to request this review"),
  consent_privacy: mustAccept("We need your consent to store and review your information and documents"),
  consent_scope: mustAccept("Please confirm you've read what the review does and doesn't cover"),
  consent_marketing: z.boolean().default(false),
  consent_site_contact: z.boolean().default(false),
  ads_consent: z.boolean().default(false),
  attribution: z.record(z.string(), z.string().max(500).optional()).optional(),
  page_url: z.string().url().max(1000).optional(),
}).refine((d) => !d.site_contact_phone || d.consent_site_contact, { path: ["consent_site_contact"], message: "Please confirm we may contact the person on site" })
  .refine((d) => d.intended_use !== "other" || d.use_other.length > 0, { path: ["use_other"], message: "Tell us briefly what you plan to build" });
export type Intake = z.infer<typeof intakeSchema>;

export const checkoutSchema = z.object({
  case_id: z.string().uuid(),
  token: z.string().min(10).max(200),
  provider: z.enum(["stripe", "paystack"]),
});

export const uploadRequestSchema = z.object({
  case_id: z.string().uuid(),
  token: z.string().min(10).max(200),
  doc_key: z.enum(docKeys),
  filename: z.string().trim().min(1).max(180),
  content_type: z.string().max(100),
  size: z.number().int().positive(),
});
