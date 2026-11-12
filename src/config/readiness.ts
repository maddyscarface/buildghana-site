/**
 * Ghana Build Readiness Review — product configuration (public, no secrets).
 * PRICE IS NOT SET HERE. The owner sets it in the admin dashboard (stored server-side) or via
 * READINESS_PRICE_USD / READINESS_PRICE_GHS. Until then the site shows "Price set by owner".
 */
import type { Option } from "@/lib/lead/options";

export const readiness = {
  name: "Ghana Build Readiness Review",
  shortName: "Readiness Review",
  path: "/ghana-build-readiness-review",
  cta: "Get My Ghana Build Readiness Review",
  promise: "A written, evidence-based answer to one question: is this project ready to build — and if not, what has to happen first?",
  /** Shown wherever a price would appear until the owner configures one. */
  pricePlaceholder: "Price set by owner",
  priceNote: "The fee is confirmed on the payment screen before you pay. Nothing is charged until you check out.",
  turnaroundPlaceholder: "Turnaround confirmed when we accept your case",
};

/** What the review covers — mirrors the sections of the Readiness Report. */
export const reviewAreas = [
  { key: "site", title: "Site visit", icon: "pin", body: "A dated, documented visit: access, visible boundaries, slope and drainage, neighbours, utilities and apparent risks, with photos. Not a legal boundary certification." },
  { key: "title", title: "Land & title — Ghanaian counsel", icon: "scale", body: "A separate, counsel-owned workstream. Ghana-qualified counsel reviews your documents and the official Lands Commission search, and records their own opinion and limitations. Uploading documents never equals verified title." },
  { key: "permits", title: "Permit checklist", icon: "compass", body: "What your district or municipal assembly is likely to require for this type of building — with sources and the date we checked. We never promise permit approval." },
  { key: "cost", title: "Preliminary cost range (GHS & USD)", icon: "ledger", body: "Low / base / high, with every assumption written down, the exchange rate and its date. A planning range — not a tender or a fixed quote." },
  { key: "documents", title: "Documents & drawings", icon: "map", body: "Indenture, site plan, cadastral plan, search report and drawings checked for completeness and consistency — names, dates, plot numbers and coordinates." },
  { key: "plan", title: "Recommendation", icon: "fileCheck", body: "Proceed to detailed design, proceed only after named conditions, or pause pending investigation — with the reasons, open issues and next steps. Approved by a human reviewer before it reaches you." },
] as const;

/** Visual process (spec §1): Parcel → Documents → Paid Review → Site/Professional Review → Counsel-led Title Check → Readiness Report → Optional Project Management. */
export const reviewSteps = [
  { n: "01", key: "parcel", title: "Parcel", body: "Tell us where the land is, who controls it and what you want to build. About ten minutes; your answers are saved as you go." },
  { n: "02", key: "documents", title: "Documents", body: "Mark what you have, what's missing and what you're unsure of — then upload privately. Missing paperwork never stops you starting." },
  { n: "03", key: "paid", title: "Paid review", body: "Confirm scope and fee, then pay through a hosted checkout (Stripe or Paystack). Card details never touch our site." },
  { n: "04", key: "site", title: "Site & professional review", body: "A scheduled, documented site visit and a construction professional's review of drawings, budget and permits." },
  { n: "05", key: "title", title: "Counsel-led title check", body: "Ghana-qualified counsel conducts the official search and records findings. Nothing says 'verified' unless counsel does." },
  { n: "06", key: "report", title: "Readiness report", body: "A versioned, branded PDF on your private case page — site visit, title, permits, cost range and a clear recommendation." },
  { n: "07", key: "pm", title: "Optional project management", body: "If you want help with design, procurement or site oversight, we'll propose it. No obligation, no forced upsell." },
];

/* ───── Step A — intake option lists ───── */
export const contactMethods: Option[] = [
  { value: "email", label: "Email" }, { value: "whatsapp", label: "WhatsApp" }, { value: "phone", label: "Phone call" },
];
export const timeZones: Option[] = [
  { value: "America/New_York", label: "US Eastern" }, { value: "America/Chicago", label: "US Central" }, { value: "America/Denver", label: "US Mountain" },
  { value: "America/Los_Angeles", label: "US Pacific" }, { value: "America/Toronto", label: "Canada Eastern" }, { value: "Europe/London", label: "UK / Ireland" },
  { value: "Europe/Berlin", label: "Central Europe" }, { value: "Africa/Accra", label: "Ghana (GMT)" }, { value: "other", label: "Other" },
];
export const areaUnits: Option[] = [
  { value: "plots", label: "Plots" }, { value: "sq_ft", label: "Square feet" }, { value: "sq_m", label: "Square metres" }, { value: "acres", label: "Acres" }, { value: "unknown", label: "Not sure" },
];
export const landControllers: Option[] = [
  { value: "me", label: "Me (in my name)" }, { value: "joint", label: "Me jointly with others" }, { value: "family", label: "My family" },
  { value: "stool_skin", label: "Stool / skin / clan (customary)" }, { value: "seller", label: "Still the seller" }, { value: "company", label: "A company" }, { value: "not_sure", label: "Not sure" },
];
export const acquiredStatuses: Option[] = [
  { value: "yes", label: "Yes, already acquired" }, { value: "in_progress", label: "Purchase in progress" }, { value: "no", label: "Not yet — considering this plot" },
];
export const siteAccess: Option[] = [
  { value: "road", label: "Road access to the plot" }, { value: "track", label: "Track / footpath only" }, { value: "unknown", label: "Not sure" },
];
export const intendedUses: Option[] = [
  { value: "single_family", label: "Single-family residence" }, { value: "multifamily", label: "Multifamily / rental units" },
  { value: "commercial", label: "Commercial" }, { value: "mixed_use", label: "Mixed use" }, { value: "renovation", label: "Renovation / completion" }, { value: "other", label: "Other" },
];
export const finishLevels: Option[] = [
  { value: "basic", label: "Basic" }, { value: "standard", label: "Standard" }, { value: "high", label: "High" }, { value: "luxury", label: "Luxury" },
];
export const budgetBands: Option[] = [
  { value: "under_50k", label: "Under 50,000" }, { value: "50k_100k", label: "50,000 – 100,000" }, { value: "100k_200k", label: "100,000 – 200,000" },
  { value: "200k_400k", label: "200,000 – 400,000" }, { value: "400k_plus", label: "400,000+" }, { value: "not_sure", label: "Not sure yet" },
];
export const budgetCurrencies: Option[] = [{ value: "USD", label: "USD" }, { value: "GHS", label: "GHS" }];
export const fundsStatuses: Option[] = [
  { value: "available", label: "Funds available now" }, { value: "staged", label: "Available in stages" }, { value: "arranging", label: "Still arranging" },
];
export const designStatuses: Option[] = [
  { value: "none", label: "No design yet" }, { value: "concept", label: "Concept / sketches" }, { value: "drawings", label: "Architectural drawings" },
  { value: "structural", label: "Architectural + structural drawings" }, { value: "permit_applied", label: "Permit applied for" }, { value: "permitted", label: "Permit granted" },
];
/** Optional services the client can ask about. Quoted and approved by the client before any extra charge. */
export const addOnServices: Option[] = [
  { value: "title_verification", label: "Title verification by Ghanaian counsel (separately contracted)" },
  { value: "expedited", label: "Expedited site inspection" },
  { value: "third_party", label: "Third-party professional checks (surveyor / engineer)" },
  { value: "travel", label: "Site travel outside standard coverage" },
];

/** Land paperwork inventory (spec §2 Step A). `title: true` = needed by counsel for the title workstream. */
export const documentInventory = [
  { key: "indenture", label: "Indenture / deed / assignment", hint: "The transfer document signed by the seller or allocating authority", title: true },
  { key: "title_certificate", label: "Land title certificate", hint: "Only if the land is registered with the Lands Commission", title: true },
  { key: "site_plan", label: "Survey / site plan", hint: "Signed by a licensed surveyor, with coordinates", title: true },
  { key: "cadastral_plan", label: "Cadastral plan", hint: "From the Survey and Mapping Division, if prepared", title: true },
  { key: "allocation_letter", label: "Allocation letter", hint: "From a stool, family, developer or government body", title: true },
  { key: "search_report", label: "Lands Commission search report", hint: "Official search result, if one was done", title: true },
  { key: "permits", label: "Permits", hint: "Development / building permit or application", title: false },
  { key: "drawings", label: "Drawings", hint: "Architectural and structural drawings", title: false },
  { key: "other", label: "Other", hint: "Receipts, IDs, photos, quotes — anything relevant", title: false },
] as const;

export type DocKey = (typeof documentInventory)[number]["key"];
export const docKeys = documentInventory.map((d) => d.key) as [DocKey, ...DocKey[]];
export const docAvailability = ["available", "missing", "uncertain"] as const;
export const docAvailabilityLabel = { available: "Available", missing: "Missing", uncertain: "Uncertain" } as const;
/** Admin-only uploads (site visit evidence). */
export const adminDocKeys = ["site_photo", "counsel_evidence", "report_attachment"] as const;

/** Upload policy (enforced server-side). Local adapter is capped lower because Vercel functions accept ≤4.5 MB bodies. */
export const uploadPolicy = {
  allowedTypes: { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" } as Record<string, string>,
  maxBytesDirect: 25 * 1024 * 1024,
  maxBytesLocal: 4 * 1024 * 1024,
  maxFilesPerCase: 40,
  signedUrlTtlSec: 10 * 60,
};
