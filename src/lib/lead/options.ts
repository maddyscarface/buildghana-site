/**
 * Single source of truth for lead form options.
 * The `value` strings are what get stored, scored and sent to GoHighLevel —
 * do not rename them without updating GHL dropdown options and lead-scoring.json.
 */
export type Option = { value: string; label: string };

export const currentCountries: Option[] = [
  { value: "US", label: "United States" },
  { value: "CA", label: "Canada" },
  { value: "GB", label: "United Kingdom" },
  { value: "IE", label: "Ireland" },
  { value: "DE", label: "Germany" },
  { value: "NL", label: "Netherlands" },
  { value: "IT", label: "Italy" },
  { value: "FR", label: "France" },
  { value: "EU_OTHER", label: "Other Europe" },
  { value: "GH", label: "Ghana" },
  { value: "OTHER", label: "Other" },
];

export const ghanaRegions: Option[] = [
  "Greater Accra", "Ashanti", "Central", "Eastern", "Western", "Western North", "Volta", "Oti",
  "Northern", "Savannah", "North East", "Upper East", "Upper West", "Bono", "Bono East", "Ahafo",
].map((r) => ({ value: r, label: r })).concat([{ value: "Not decided", label: "Not decided yet" }]);

export const landStatuses: Option[] = [
  { value: "owned_documented", label: "I own land and have documents (indenture / site plan / title)" },
  { value: "owned_incomplete", label: "I own land but documents are incomplete" },
  { value: "family_land", label: "Family or inherited land" },
  { value: "purchasing", label: "I'm in the process of buying land" },
  { value: "searching", label: "I'm still looking for land" },
  { value: "not_sure", label: "Not sure" },
];

export const projectStages: Option[] = [
  { value: "planning", label: "Early planning / research" },
  { value: "land_only", label: "I have land, no design yet" },
  { value: "design", label: "Design / drawings in progress" },
  { value: "permits", label: "Design complete, permits pending" },
  { value: "construction_active", label: "Construction underway" },
  { value: "stalled", label: "Construction has stalled or stopped" },
];

export const constructionTypes: Option[] = [
  { value: "single_family", label: "Single-family home" },
  { value: "multi_unit", label: "Rental / multi-unit residential" },
  { value: "mixed_use", label: "Mixed-use or commercial" },
  { value: "completion", label: "Completing an unfinished building" },
  { value: "renovation", label: "Renovation / extension" },
  { value: "other", label: "Other" },
];

export const budgetRanges: Option[] = [
  { value: "under_50k", label: "Under $50,000" },
  { value: "50k_100k", label: "$50,000 – $100,000" },
  { value: "100k_200k", label: "$100,000 – $200,000" },
  { value: "200k_400k", label: "$200,000 – $400,000" },
  { value: "400k_plus", label: "$400,000+" },
  { value: "not_sure", label: "Not sure yet" },
];

export const startTimelines: Option[] = [
  { value: "0_3m", label: "Within 3 months" },
  { value: "3_6m", label: "3 – 6 months" },
  { value: "6_12m", label: "6 – 12 months" },
  { value: "12m_plus", label: "More than 12 months" },
  { value: "not_sure", label: "Not sure" },
];

export const serviceOptions: Option[] = [
  { value: "land_feasibility", label: "Land due diligence & feasibility" },
  { value: "design_coordination", label: "Architectural & engineering coordination" },
  { value: "preconstruction", label: "Preconstruction planning & budgeting" },
  { value: "owners_rep", label: "Owner's representation & inspections" },
  { value: "construction_management", label: "General contracting / construction management" },
  { value: "project_rescue", label: "Unfinished project rescue" },
  { value: "development", label: "Real estate development" },
  { value: "not_sure", label: "Not sure — advise me" },
];

export const documentOptions: Option[] = [
  { value: "title_docs", label: "Land documents (indenture, title, receipts)" },
  { value: "site_plan", label: "Site plan / survey" },
  { value: "drawings", label: "Architectural or structural drawings" },
  { value: "permit", label: "Building permit" },
  { value: "photos", label: "Recent site photos or video" },
  { value: "budget", label: "Builder quote or budget" },
];

export const funnels = ["new_home", "rescue", "investor", "general"] as const;
export type Funnel = (typeof funnels)[number];

export const values = (opts: Option[]) => opts.map((o) => o.value) as [string, ...string[]];
export const labelFor = (opts: Option[], v: string) => opts.find((o) => o.value === v)?.label ?? v;
