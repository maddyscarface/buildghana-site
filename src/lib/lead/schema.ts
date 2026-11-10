import { z } from "zod";
import {
  budgetRanges, constructionTypes, currentCountries, documentOptions, funnels, ghanaRegions,
  landStatuses, projectStages, serviceOptions, startTimelines, values,
} from "./options";

const trimmed = (max: number) => z.string().trim().max(max);

/** Attribution captured client-side (first-party) and forwarded with the lead. */
export const attributionSchema = z
  .object({
    utm_source: trimmed(150).optional(),
    utm_medium: trimmed(150).optional(),
    utm_campaign: trimmed(200).optional(),
    utm_term: trimmed(200).optional(),
    utm_content: trimmed(200).optional(),
    gclid: trimmed(300).optional(),
    gbraid: trimmed(300).optional(),
    wbraid: trimmed(300).optional(),
    fbclid: trimmed(500).optional(),
    fbc: trimmed(600).optional(),
    fbp: trimmed(200).optional(),
    landing_page: trimmed(1000).optional(),
    referrer: trimmed(1000).optional(),
    first_touch_source: trimmed(200).optional(),
    first_touch_campaign: trimmed(200).optional(),
    first_touch_at: trimmed(40).optional(),
    openai_obref: trimmed(300).optional(),
    openai_oppref: trimmed(300).optional(),
  })
  .partial()
  .default({});

const phoneRegex = /^\+?[0-9 ()\-.]{7,22}$/;

export const leadSchema = z
  .object({
    submission_id: z.string().uuid({ message: "Invalid submission id" }),
    funnel: z.enum(funnels).default("general"),

    // Step 1 — contact
    first_name: trimmed(80).min(1, "Please enter your first name"),
    last_name: trimmed(80).min(1, "Please enter your last name"),
    email: z.string().trim().toLowerCase().email("Please enter a valid email").max(254),
    phone: z
      .string()
      .trim()
      .regex(phoneRegex, "Please include your country code, e.g. +1 617 555 0100")
      .optional()
      .or(z.literal("").transform(() => undefined)),
    whatsapp_same: z.boolean().default(true),
    current_country: z.enum(values(currentCountries), { message: "Select your country" }),

    // Step 2 — project
    ghana_region: z.enum(values(ghanaRegions), { message: "Select a region" }),
    ghana_city: trimmed(120).optional(),
    land_status: z.enum(values(landStatuses), { message: "Select land status" }),
    project_stage: z.enum(values(projectStages), { message: "Select the project stage" }),
    construction_type: z.enum(values(constructionTypes), { message: "Select a construction type" }),

    // Step 3 — scope
    budget_range: z.enum(values(budgetRanges), { message: "Select a budget range" }),
    start_timeline: z.enum(values(startTimelines), { message: "Select a timeline" }),
    services: z.array(z.enum(values(serviceOptions))).min(1, "Choose at least one service").max(8),
    project_description: trimmed(3000).optional(),
    documents_available: z.array(z.enum(values(documentOptions))).max(6).default([]),

    // Step 4 — consent (contact consent required; marketing optional and separate)
    consent_contact: z.literal(true, { errorMap: () => ({ message: "We need your permission to contact you about this request" }) }),
    consent_marketing: z.boolean().default(false),
    consent_sms_whatsapp: z.boolean().default(false),

    // Anti-spam
    company_website: z.string().max(0, "Spam detected").optional().default(""), // honeypot
    form_started_at: z.number().int().positive(),
    turnstile_token: z.string().max(4096).optional(),

    attribution: attributionSchema,
    page_url: trimmed(1000).optional(),

    /** Pre-consultation answers (size, add-ons, visit time, style, saw pricing). Sanitised server-side. */
    qualifiers: z.record(z.unknown()).optional(),
    /** Advertising consent at submit time. Gates OpenAI Ads server events. */
    ads_consent: z.boolean().optional(),
  })
  .strict();

export type LeadInput = z.input<typeof leadSchema>;
export type Lead = z.output<typeof leadSchema>;

/** Field groups used by the multi-step form for per-step validation. */
export const stepFields: Record<number, (keyof Lead)[]> = {
  0: ["first_name", "last_name", "email", "phone", "current_country"],
  1: ["ghana_region", "ghana_city", "land_status", "project_stage", "construction_type"],
  2: ["budget_range", "start_timeline", "services", "project_description", "documents_available"],
  3: ["consent_contact", "consent_marketing", "consent_sms_whatsapp"],
};

/** Minimum human time on form (ms). Faster submissions are treated as bots. */
export const MIN_FILL_MS = 4000;
