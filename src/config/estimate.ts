import type { EstimateConfig } from "@/lib/estimate/qualifiers";
import type { BriefTheme } from "@/lib/estimate/lead-brief";
import type { QualifierTheme } from "@/components/estimate/EstimateQualifiers";
import { budgetRanges, startTimelines } from "@/lib/lead/options";

/**
 * BuildGhana Abroad pre-consultation qualifiers.
 *
 * - Project type ids = constructionTypes values ("other" excluded: no range to show).
 * - Budget band ids = budgetRanges values and start ids = startTimelines values, so the existing
 *   budget_range / start_timeline fields, scoring (lead-scoring.json) and GHL dropdowns are unchanged.
 *
 * [OWNER TO CONFIRM] Every `typical` range is a USD planning placeholder for mid-standard
 * construction in Greater Accra / Kumasi. They are assumptions, not market data. Replace them
 * with your own Ghana cost data (and have them reviewed), then set rangesConfirmed: true.
 * Visit times are US Eastern because consultations are run from Boston; diaspora clients in
 * the UK/EU pick the closest slot and the team confirms in their time zone.
 */
const band = (value: string, min: number, max: number | null) => ({ id: value, label: budgetRanges.find((b) => b.value === value)!.label, min, max });

export const estimateConfig: EstimateConfig = {
  brand: "BuildGhana Abroad",
  visitLabel: "video consultation",
  timezone: "America/New_York",
  tzLabel: "US Eastern Time",
  projectTypes: [
    {
      id: "single_family", label: "Single-family home",
      sizes: [
        { id: "2bed", label: "2 bedrooms", hint: "About 100 m²", typical: [40000, 80000] },
        { id: "3bed", label: "3 bedrooms", hint: "About 150 m²", typical: [60000, 120000] },
        { id: "4bed", label: "4 bedrooms", hint: "About 220 m²", typical: [90000, 180000] },
        { id: "5bed", label: "5+ bedrooms or two storeys", typical: [150000, 350000] },
      ],
      addOns: [
        { id: "bq", label: "Boys' quarters", typical: [12000, 30000] },
        { id: "wall", label: "Perimeter wall & gate", typical: [8000, 25000] },
        { id: "borehole", label: "Borehole & water tank", typical: [3000, 8000] },
        { id: "solar", label: "Solar power", typical: [5000, 15000] },
      ],
    },
    {
      id: "multi_unit", label: "Rental / multi-unit residential",
      sizes: [
        { id: "2_4", label: "2–4 units", typical: [120000, 300000] },
        { id: "5_10", label: "5–10 units", typical: [250000, 700000] },
        { id: "10p", label: "10+ units", typical: [600000, 1500000] },
      ],
      addOns: [
        { id: "wall", label: "Perimeter wall & gate", typical: [10000, 35000] },
        { id: "borehole", label: "Borehole & water tank", typical: [3000, 10000] },
        { id: "solar", label: "Solar power", typical: [10000, 40000] },
      ],
    },
    {
      id: "mixed_use", label: "Mixed-use or commercial",
      sizes: [
        { id: "small", label: "Shops with flats above", typical: [100000, 250000] },
        { id: "large", label: "Larger commercial building", typical: [250000, 800000] },
      ],
    },
    {
      id: "completion", label: "Completing an unfinished building",
      sizes: [
        { id: "finishing", label: "Roofed, needs finishing", typical: [20000, 60000] },
        { id: "walls", label: "Walls up, no roof", typical: [40000, 100000] },
        { id: "foundation", label: "Foundation only", typical: [60000, 150000] },
      ],
      addOns: [
        { id: "wall", label: "Perimeter wall & gate", typical: [8000, 25000] },
        { id: "borehole", label: "Borehole & water tank", typical: [3000, 8000] },
      ],
    },
    {
      id: "renovation", label: "Renovation / extension",
      sizes: [
        { id: "minor", label: "Refresh or repairs", typical: [10000, 30000] },
        { id: "major", label: "Major renovation or extension", typical: [30000, 90000] },
      ],
    },
  ],
  budgetBands: [
    band("under_50k", 0, 50000),
    band("50k_100k", 50000, 100000),
    band("100k_200k", 100000, 200000),
    band("200k_400k", 200000, 400000),
    band("400k_plus", 400000, null),
    band("not_sure", 0, null),
  ],
  startOptions: startTimelines.map((o) => ({ id: o.value, label: o.label })),
  timeWindows: [
    { id: "0900", label: "9:00 AM", start: "09:00", end: "09:45" },
    { id: "1200", label: "12:00 PM", start: "12:00", end: "12:45" },
    { id: "1500", label: "3:00 PM", start: "15:00", end: "15:45" },
    { id: "1800", label: "6:00 PM", start: "18:00", end: "18:45" },
    { id: "2000", label: "8:00 PM", start: "20:00", end: "20:45" },
  ],
  minLeadDays: 1,
  favorites: {
    prompt: "Which home style do you like?",
    options: [
      { id: "modern_flat", label: "Modern flat-roof" },
      { id: "contemporary_pitched", label: "Contemporary with pitched roof" },
      { id: "classic_columns", label: "Classic with columns" },
      { id: "compact_starter", label: "Compact starter home" },
      { id: "storey", label: "Storey building" },
      { id: "rental_income", label: "Built for rental income" },
    ],
  },
  priceGuidePath: "/build-in-ghana#price-guide",
  rangeNote: "USD planning range for mid-standard finishes. Land, design and location change the number; we confirm a real budget in the feasibility stage.",
  rangesConfirmed: false,
  addressRequired: false,
  addressLabel: "Land location (town / neighbourhood)",
};

export const briefTheme: BriefTheme = { dark: "#12291f", accent: "#d6aa64", accentSoft: "#f7f3eb", ink: "#18241c", muted: "#5b6a5f" };

export const qualifierTheme: QualifierTheme = {
  input: "field-input",
  label: "field-label",
  chip: "rounded-xl border border-line bg-white px-3 py-2 text-left text-sm font-medium text-ink hover:border-forest",
  chipOn: "rounded-xl border border-forest bg-forest px-3 py-2 text-left text-sm font-medium text-ivory",
  box: "rounded-2xl border border-gold bg-ivory p-4",
  muted: "text-muted",
  link: "underline font-semibold",
};
