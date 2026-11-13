/**
 * Off-market property introductions — option lists and owner-controlled settings.
 *
 * The `value` strings are stored, matched and sent (as labels) to GoHighLevel. Do not rename
 * them without updating the GHL dropdowns and docs/20-property-introductions.md.
 *
 * Nothing here is legal advice. Land tenure, buyer eligibility and brokerage licensing in Ghana
 * must be confirmed by Ghanaian counsel before the service charges fees or commissions.
 */
import type { Option } from "@/lib/lead/options";
import { ghanaRegions } from "@/lib/lead/options";

export { ghanaRegions };
export const propertyRegions = ghanaRegions.filter((r) => r.value !== "Not decided");

/** Countries of residence. Ghana is listed first so local owners are never treated as an afterthought. */
export const residenceCountries: Option[] = [
  { value: "GH", label: "Ghana" },
  { value: "US", label: "United States" },
  { value: "GB", label: "United Kingdom" },
  { value: "CA", label: "Canada" },
  { value: "DE", label: "Germany" },
  { value: "NL", label: "Netherlands" },
  { value: "IT", label: "Italy" },
  { value: "IE", label: "Ireland" },
  { value: "FR", label: "France" },
  { value: "NG", label: "Nigeria" },
  { value: "ZA", label: "South Africa" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "AU", label: "Australia" },
  { value: "OTHER", label: "Another country" },
];

export const contactMethods: Option[] = [
  { value: "whatsapp", label: "WhatsApp" },
  { value: "phone", label: "Phone call" },
  { value: "email", label: "Email" },
];

/** English only until other languages have had editorial review (spec §P0). */
export const languages: Option[] = [{ value: "en", label: "English" }];

export const sellerRoles: Option[] = [
  { value: "owner", label: "I am the owner" },
  { value: "family_rep", label: "I represent the family / stool that owns it" },
  { value: "agent", label: "I am an agent for the owner" },
  { value: "representative", label: "I hold a power of attorney or act for the owner" },
];

export const propertyKinds: Option[] = [
  { value: "land", label: "Land / plot only" },
  { value: "land_with_structure", label: "Land with an unfinished structure" },
  { value: "house", label: "House / completed home" },
  { value: "apartment", label: "Apartment / flat" },
  { value: "multi_unit", label: "Multi-unit / rental building" },
  { value: "commercial", label: "Commercial or mixed-use property" },
];

export const propertyUses: Option[] = [
  { value: "residential", label: "Residential" },
  { value: "rental", label: "Rental / investment" },
  { value: "commercial", label: "Commercial" },
  { value: "mixed", label: "Mixed use" },
  { value: "agricultural", label: "Agricultural" },
  { value: "undecided", label: "Not decided / open" },
];

export const occupancyOptions: Option[] = [
  { value: "vacant", label: "Vacant" },
  { value: "owner_occupied", label: "Owner or family living there" },
  { value: "tenanted", label: "Tenants in place" },
  { value: "caretaker", label: "Caretaker on site" },
  { value: "unknown", label: "Not sure" },
];

export const areaUnits: Option[] = [
  { value: "plots", label: "Plots" },
  { value: "acres", label: "Acres" },
  { value: "hectares", label: "Hectares" },
  { value: "sqm", label: "Square metres" },
  { value: "sqft", label: "Square feet" },
];
/** Approximate m² per unit, used ONLY to compare sizes during matching. A Ghana "plot" varies by area — commonly ~100 × 70 ft. */
export const sqmPerUnit: Record<string, number> = { plots: 650, acres: 4047, hectares: 10000, sqm: 1, sqft: 0.0929 };

export const currencies: Option[] = [
  { value: "GHS", label: "GHS (Ghana cedi)" },
  { value: "USD", label: "USD (US dollar)" },
];

export const negotiability: Option[] = [
  { value: "negotiable", label: "Negotiable" },
  { value: "firm", label: "Firm" },
  { value: "open_offers", label: "Open to offers" },
];

/** Self-reported only. BuildGhana does not verify these; counsel does, on instruction. */
export const titleStatusSelfReport: Option[] = [
  { value: "land_title_certificate", label: "Registered land title certificate" },
  { value: "registered_lease", label: "Registered lease / leasehold" },
  { value: "indenture_unregistered", label: "Indenture, not yet registered" },
  { value: "customary_allocation", label: "Customary / stool / family allocation note" },
  { value: "registration_in_progress", label: "Registration in progress" },
  { value: "no_documents", label: "No documents yet" },
  { value: "not_sure", label: "Not sure" },
];

export const planningStatuses: Option[] = [
  { value: "site_plan", label: "Site plan available" },
  { value: "building_permit", label: "Building permit granted" },
  { value: "permit_pending", label: "Permit applied for / pending" },
  { value: "none", label: "No permit / not applicable yet" },
  { value: "not_sure", label: "Not sure" },
];

export const encumbranceAnswers: Option[] = [
  { value: "none_known", label: "None that I know of" },
  { value: "yes", label: "Yes — there is a dispute, claim, mortgage or other issue" },
  { value: "not_sure", label: "Not sure" },
];

export const inspectionAvailability: Option[] = [
  { value: "anytime", label: "Can be inspected with notice" },
  { value: "arranged", label: "Inspection must be arranged with a caretaker / family" },
  { value: "not_yet", label: "Not available for inspection yet" },
];

export const representationRequests: Option[] = [
  { value: "nonexclusive", label: "Non-exclusive — I may sell through others too" },
  { value: "exclusive_interest", label: "Interested in discussing exclusive representation" },
  { value: "undecided", label: "Not sure yet" },
];

/** Optional document inventory (what exists, not uploads). */
export const sellerDocumentInventory: Option[] = [
  { value: "indenture", label: "Indenture" },
  { value: "site_plan", label: "Site plan / cadastral plan" },
  { value: "land_title", label: "Land title certificate" },
  { value: "search_report", label: "Lands Commission search report" },
  { value: "building_permit", label: "Building permit" },
  { value: "receipts", label: "Purchase receipts" },
  { value: "power_of_attorney", label: "Power of attorney / authority to sell" },
];

export const buyerRoles: Option[] = [
  { value: "individual", label: "Buying for myself / my family" },
  { value: "investor", label: "Investor" },
  { value: "company", label: "Buying through a company" },
  { value: "representative", label: "Acting for someone else" },
];

/** Self-report only — used to route counsel referrals, never to accept or reject a buyer. */
export const buyerEligibility: Option[] = [
  { value: "ghanaian_citizen", label: "Ghanaian citizen" },
  { value: "dual_citizen", label: "Dual citizen (Ghanaian and another nationality)" },
  { value: "non_ghanaian", label: "Not a Ghanaian citizen" },
  { value: "company", label: "Company / organisation" },
  { value: "not_sure", label: "Not sure / prefer counsel to advise" },
];

export const tenurePreferences: Option[] = [
  { value: "leasehold_ok", label: "Leasehold is fine" },
  { value: "freehold_preferred", label: "Prefer freehold where legally available to me" },
  { value: "advise", label: "Not sure — I need counsel's advice" },
];

export const buyerTimelines: Option[] = [
  { value: "0_3", label: "Within 3 months" },
  { value: "3_6", label: "3–6 months" },
  { value: "6_12", label: "6–12 months" },
  { value: "12_plus", label: "More than 12 months" },
  { value: "exploring", label: "Just exploring" },
];

export const financingStatuses: Option[] = [
  { value: "cash_ready", label: "Funds available" },
  { value: "saving", label: "Saving / funds being arranged" },
  { value: "mortgage", label: "Mortgage / financing needed" },
  { value: "prefer_not", label: "Prefer not to say" },
];

export const intendedUses: Option[] = [
  { value: "own_home", label: "Home for me / my family" },
  { value: "retirement", label: "Retirement / return home" },
  { value: "rental", label: "Rental investment" },
  { value: "development", label: "Build and sell / develop" },
  { value: "commercial", label: "Business / commercial use" },
];

export const siteVisitPrefs: Option[] = [
  { value: "in_person", label: "I will visit in person" },
  { value: "representative", label: "A trusted representative will visit" },
  { value: "video", label: "Video walkthrough first" },
  { value: "buildghana", label: "I'd like BuildGhana to inspect" },
];

export const counselStatuses: Option[] = [
  { value: "have_counsel", label: "I already have a Ghanaian lawyer" },
  { value: "need_referral", label: "I would like a referral" },
  { value: "later", label: "Not yet" },
];

/** Media: photos/videos the seller may share. Documents: private, admin/legal-reviewer only. */
export const propertyUploadPolicy = {
  media: { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "video/mp4": "mp4", "video/quicktime": "mov" } as Record<string, string>,
  documents: { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" } as Record<string, string>,
  maxFilesPerRecord: 20,
  signedUrlTtlSec: 10 * 60,
  /** Uploads are accepted for this long after submission using the submission's private link. */
  uploadWindowHours: 72,
  /** Retention for withdrawn / lost / closed records before assets are purged (owner/legal to confirm). */
  retentionDays: Number(process.env.PROPERTY_RETENTION_DAYS || 365),
};

/**
 * `/property/opportunities` mode. "waitlist" (default) shows no inventory at all. "listings" shows
 * ONLY records with explicit public-listing authorisation, factual review, image permission and
 * separate search-index consent. Private inventory never appears in either mode.
 */
export const opportunitiesMode = (): "waitlist" | "listings" =>
  process.env.NEXT_PUBLIC_PROPERTY_OPPORTUNITIES_MODE === "listings" ? "listings" : "waitlist";

/** Owner/legal gate checklist rendered in the admin (spec: Ghana compliance/business model gate). */
export const complianceChecklist = [
  { key: "agency_licensing", label: "Counsel confirms whether real estate agency licensing / registration applies (Real Estate Agency Act, 2020 (Act 1047)) and BuildGhana's status" },
  { key: "service_model", label: "Counsel approves the 'off-market introduction' service model and how it differs from brokerage, title or escrow services" },
  { key: "agent_principal", label: "Agent / principal relationships and seller authorisation terms approved" },
  { key: "advertising", label: "Property advertising rules (incl. any public listings) reviewed" },
  { key: "contracts", label: "Seller authorisation, buyer inquiry and introduction terms drafted by counsel" },
  { key: "cross_border", label: "Cross-border marketing to diaspora / international buyers reviewed (incl. non-citizen tenure limits)" },
  { key: "data_protection", label: "Data Protection Act, 2012 (Act 843) obligations confirmed (registration, retention, transfers abroad)" },
  { key: "fees", label: "Any fee or commission approved in writing before it is charged or published" },
] as const;
