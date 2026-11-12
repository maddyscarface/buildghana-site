import { z } from "zod";
import { values, currentCountries, ghanaRegions, projectStages, budgetRanges, startTimelines } from "@/lib/lead/options";
import { acquisitionRoutes, titleStatuses, intendedUses, groundSupport, reviewFocus, docKeys, docAvailability } from "@/config/readiness";

const trimmed = (max: number) => z.string().trim().max(max);

/** Step A + Step B payload. Mirrors the client form exactly. */
export const intakeSchema = z.object({
  submission_id: z.string().uuid(),
  form_started_at: z.number().int().positive(),
  company_website: z.string().max(0).optional().or(z.literal("")), // honeypot
  first_name: trimmed(80).min(1, "Please enter your first name"),
  last_name: trimmed(80).min(1, "Please enter your last name"),
  email: z.string().trim().toLowerCase().email("Please enter a valid email").max(200),
  phone: z.string().trim().regex(/^\+?[0-9 ()\-.]{7,20}$/, "Please include your country code, e.g. +1 617 555 0100"),
  whatsapp_same: z.boolean().default(true),
  current_country: z.enum(values(currentCountries)),
  ghana_region: z.enum(values(ghanaRegions)),
  ghana_city: trimmed(120).optional().default(""),
  land_size: trimmed(80).optional().default(""),
  acquisition: z.enum(values(acquisitionRoutes)),
  title_status: z.enum(values(titleStatuses)),
  intended_use: z.enum(values(intendedUses)),
  project_stage: z.enum(values(projectStages)),
  budget_range: z.enum(values(budgetRanges)),
  start_timeline: z.enum(values(startTimelines)),
  ground_support: z.array(z.enum(values(groundSupport))).max(10).default([]),
  focus: z.array(z.enum(values(reviewFocus))).min(1, "Choose at least one thing you want answered").max(10),
  concerns: trimmed(2000).optional().default(""),
  inventory: z.record(z.enum(docKeys), z.enum(docAvailability)).refine((r) => Object.keys(r).length === docKeys.length, "Please answer every document question"),
  consent_terms: z.literal(true, { errorMap: () => ({ message: "Please accept the review scope and terms" }) }),
  consent_data: z.literal(true, { errorMap: () => ({ message: "We need your consent to store and review your documents" }) }),
  consent_marketing: z.boolean().default(false),
  ads_consent: z.boolean().default(false),
  attribution: z.record(z.string(), z.string().max(500).optional()).optional(),
  page_url: z.string().url().max(1000).optional(),
});
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
