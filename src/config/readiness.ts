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
  promise: "A written, evidence-based answer to one question: is this project ready to build — and if not, what has to happen first?",
  /** Shown wherever a price would appear until the owner configures one. */
  pricePlaceholder: "Price set by owner",
  priceNote: "The fee is confirmed on the payment screen before you pay. Nothing is charged until you check out.",
  turnaroundPlaceholder: "Turnaround confirmed when we accept your case",
};

export const reviewAreas = [
  { key: "land", title: "Land & documents", icon: "map", body: "Indenture, site plan, search report and any title certificate checked for completeness and consistency — names, dates, plot numbers and coordinates." },
  { key: "title", title: "Title verification with Ghanaian counsel", icon: "scale", body: "Where your documents allow it, an independent Ghana-qualified lawyer conducts the title search and gives their own findings. We never issue a title opinion ourselves." },
  { key: "site", title: "Site & boundaries", icon: "pin", body: "Survey and pillar evidence, access, drainage and visible constraints, from your photos and the surveyor's documents." },
  { key: "design", title: "Drawings & permits", icon: "compass", body: "Whether architectural and structural drawings are complete enough to price and permit, and where the building permit stands." },
  { key: "budget", title: "Budget & contractor quotes", icon: "ledger", body: "Quotes and bills of quantities read for gaps, missing scope and payment terms that put your money at risk." },
  { key: "plan", title: "Risks & next steps", icon: "fileCheck", body: "A rated summary (ready · needs attention · not ready) with the specific actions, in order, to get to a safe start." },
] as const;

export const reviewSteps = [
  { n: "01", title: "Tell us about the project", body: "A short intake: where the land is, how it was acquired, what you hold and what worries you. About ten minutes." },
  { n: "02", title: "Confirm and pay securely", body: "Hosted checkout — card in USD via Stripe, or card / mobile money in GHS via Paystack. Card details never touch our site." },
  { n: "03", title: "Upload your documents", body: "Private, encrypted storage with short-lived links. Only the reviewer and, for title work, appointed counsel can open them." },
  { n: "04", title: "Professional review", body: "A construction professional works through every area and requests anything missing through your private case page." },
  { n: "05", title: "Counsel's title verification", body: "Ghanaian counsel conducts the search and records their findings. The report never says 'verified' unless counsel has signed off." },
  { n: "06", title: "Report and walkthrough", body: "A branded PDF report delivered to your case page, followed by a call to walk you through the findings." },
];

/** Step A — intake option lists */
export const acquisitionRoutes: Option[] = [
  { value: "individual", label: "Bought from an individual" },
  { value: "family", label: "Bought from a family" },
  { value: "stool_skin", label: "Customary land (stool / skin / clan)" },
  { value: "developer", label: "Bought from an estate developer" },
  { value: "government", label: "Government / state lease" },
  { value: "inherited", label: "Inherited or gifted" },
  { value: "not_acquired", label: "Not yet acquired — considering a plot" },
  { value: "not_sure", label: "Not sure" },
];

export const titleStatuses: Option[] = [
  { value: "title_certificate", label: "Registered land title certificate" },
  { value: "indenture_registered", label: "Indenture, registered with Lands Commission" },
  { value: "indenture_only", label: "Indenture only (not registered)" },
  { value: "site_plan_only", label: "Site plan only" },
  { value: "receipt_only", label: "Receipt or allocation note only" },
  { value: "none", label: "No documents yet" },
  { value: "not_sure", label: "Not sure" },
];

export const intendedUses: Option[] = [
  { value: "family_home", label: "Family / retirement home" },
  { value: "rental", label: "Rental or multi-unit residential" },
  { value: "mixed_use", label: "Mixed-use or commercial" },
  { value: "completion", label: "Completing an existing structure" },
  { value: "land_banking", label: "Holding the land for now" },
];

export const groundSupport: Option[] = [
  { value: "family", label: "A family member" },
  { value: "agent", label: "An agent or caretaker" },
  { value: "contractor", label: "A contractor I've hired" },
  { value: "professional", label: "An architect / engineer / surveyor" },
  { value: "none", label: "Nobody yet" },
];

export const reviewFocus: Option[] = [
  { value: "title", label: "Is the land safe to build on?" },
  { value: "boundaries", label: "Do the boundaries match the documents?" },
  { value: "drawings", label: "Are my drawings complete?" },
  { value: "permit", label: "Can I get / do I have a permit?" },
  { value: "budget", label: "Is my budget or quote realistic?" },
  { value: "contractor", label: "Is my contractor agreement safe?" },
];

/** Step B — document inventory. `title: true` docs are needed for counsel's title verification. */
export const documentInventory = [
  { key: "indenture", label: "Indenture / deed of conveyance", hint: "The transfer document signed by the seller", title: true },
  { key: "site_plan", label: "Site plan", hint: "Signed by a licensed surveyor, with coordinates", title: true },
  { key: "search_report", label: "Lands Commission search report", hint: "Official search result, if one was done", title: true },
  { key: "title_certificate", label: "Land title certificate", hint: "Only if the land is registered", title: true },
  { key: "survey_report", label: "Survey / pillar demarcation evidence", hint: "Report or photos of boundary pillars", title: false },
  { key: "owner_id", label: "Owner's government ID", hint: "Needed by counsel to run the search in your name", title: true },
  { key: "site_photos", label: "Recent site photos or video", hint: "Dated if possible", title: false },
  { key: "architectural", label: "Architectural drawings", hint: "Plans, elevations, sections", title: false },
  { key: "structural", label: "Structural drawings", hint: "From a registered engineer", title: false },
  { key: "permit", label: "Building permit or application", hint: "From the Metropolitan / Municipal / District Assembly", title: false },
  { key: "boq", label: "Bill of quantities or estimate", hint: "Itemised costs", title: false },
  { key: "contract", label: "Contractor agreement or quotes", hint: "Signed or proposed", title: false },
] as const;

export type DocKey = (typeof documentInventory)[number]["key"];
export const docKeys = documentInventory.map((d) => d.key) as [DocKey, ...DocKey[]];
export const docAvailability = ["have", "dont_have", "not_sure"] as const;

/** Upload policy (enforced server-side). Local adapter is capped lower because Vercel functions accept ≤4.5 MB bodies. */
export const uploadPolicy = {
  allowedTypes: { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" } as Record<string, string>,
  maxBytesDirect: 25 * 1024 * 1024,
  maxBytesLocal: 4 * 1024 * 1024,
  maxFilesPerCase: 40,
  signedUrlTtlSec: 10 * 60,
};
