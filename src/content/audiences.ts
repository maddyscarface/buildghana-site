import type { StockKey } from "./images";
import type { Faq } from "./services";

/**
 * /who-we-serve — one section per buyer type (blueprint v1, vertical pack C).
 * Copy states process only. No coverage, licence, price or outcome claims; coverage for a parcel is
 * confirmed per case, and title is always counsel-led.
 */
export type AudienceSection = {
  id: string; title: string; image: StockKey; intro: string; needs: string[]; howWeWork: string[];
  cta: { label: string; href: string }; secondary?: { label: string; href: string };
};

export const audienceSections: AudienceSection[] = [
  {
    id: "diaspora",
    title: "Diaspora building from abroad",
    image: "ghanaian_family_gathering",
    intro: "You want to build at home without flying back for every decision, and without relying on progress photos from the person being paid.",
    needs: ["Land documents checked before money is committed", "A complete design and a line-item budget", "Evidence you can trust from another time zone", "Payments released against verified progress"],
    howWeWork: ["Scheduled video calls in your time zone, plus written reports", "Dated photo and video evidence at each milestone", "One accountable contact by WhatsApp, phone or email", "Help arranging a trusted local representative for steps that need a signature"],
    cta: { label: "Start a Readiness Review", href: "/ghana-build-readiness-review/start" },
    secondary: { label: "Building from abroad", href: "/build-in-ghana" },
  },
  {
    id: "returning-residents",
    title: "Returning residents",
    image: "walled_home_residential_area",
    intro: "You are planning to move back, or have just arrived, and want the house, land or completion plan settled before you rely on it.",
    needs: ["A clear view of the land and its documents before you relocate", "A realistic schedule that fits your move", "A budget in cedis and dollars with the exchange rate written down", "A plan for an unfinished building you already own"],
    howWeWork: ["A documented site visit and a permit checklist for your assembly", "A provisional cost range, not a quote, with every assumption listed", "A recommendation to proceed, proceed after conditions, or pause", "Optional oversight once you decide to build"],
    cta: { label: "Start a Readiness Review", href: "/ghana-build-readiness-review/start" },
    secondary: { label: "Unfinished project rescue", href: "/ghana-project-rescue" },
  },
  {
    id: "ghana-residents",
    title: "Owners living in Ghana",
    image: "woman_mason_northern_ghana",
    intro: "You live in Ghana and want an independent second pair of eyes on the land, drawings, permits and budget before construction starts.",
    needs: ["An independent check of the plot and paperwork", "Permit requirements for your district or municipal assembly", "A cost range you can compare builder quotes against", "Inspections that work for you, not the builder"],
    howWeWork: ["Meet on site or by phone; your answers are saved as you go", "Readiness Review fees in cedis or US dollars, shown before you pay", "Title, tenure and encumbrance questions referred to Ghanaian counsel", "We confirm coverage for your location before any fee"],
    cta: { label: "Start a Readiness Review", href: "/ghana-build-readiness-review/start" },
    secondary: { label: "Owner's representation", href: "/owners-representation" },
  },
  {
    id: "international-investors",
    title: "International property investors",
    image: "accra_apartments_east_legon",
    intro: "You are evaluating rental, multi-unit or mixed-use development in Ghana and need a defensible cost base and independent reporting before you fund it.",
    needs: ["Site feasibility before acquisition", "A cost plan with stated assumptions and currency basis", "Clear separation between advisor and builder", "Reporting you can share with partners or lenders"],
    howWeWork: ["Feasibility, design coordination and preconstruction budgeting", "Independent monitoring with budget and schedule variance", "Counsel-led title checks, tracked separately from our review", "Private, owner-mediated property introductions, never public listings"],
    cta: { label: "Request a Feasibility Consultation", href: "/assessment?service=development&funnel=investor" },
    secondary: { label: "Ghana real estate development", href: "/ghana-property-development" },
  },
];

export const audienceFaqs: Faq[] = [
  { q: "Do I have to live in the U.S. to work with BuildGhana?", a: "No. We work with owners living in Ghana, returning residents, the diaspora in any country and international investors. The process and paperwork standards are the same wherever you live; only the way we meet and report changes." },
  { q: "Why do your forms ask which describes me best?", a: "It is optional. It helps us tailor follow-up, for example call times or whether a site meeting makes sense. It never affects whether we can help you, and we never use it for advertising audiences." },
  { q: "Can I see costs in cedis and dollars?", a: "Yes. Readiness Review cost ranges are shown in GHS and USD with the exchange rate used, its source and the date it was checked. They are provisional planning ranges, not quotes." },
  { q: "Do you guarantee land title or ownership?", a: "No. Title, tenure and encumbrance checks are carried out by appointed Ghanaian counsel and tracked separately from our review. Until counsel reports, title is shown as pending." },
];
