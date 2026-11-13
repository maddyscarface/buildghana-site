/**
 * Global site configuration.
 * Anything marked `verified: false` renders as a visible "To confirm before launch" marker.
 * Flip to true ONLY after the claim has been checked against source documents.
 */

export const site = {
  /** Brand / legal display name (owner to confirm final trading name). */
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "BuildGhana Abroad",
  /** Short brand used in titles, e.g. "Construction Management in Ghana | BuildGhana". */
  shortName: process.env.NEXT_PUBLIC_BRAND_SHORT || "BuildGhana",
  url: (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  /** Canonical host for canonicals, sitemap, robots and JSON-LD. Set to the verified production domain at launch. */
  canonicalUrl: (process.env.NEXT_PUBLIC_CANONICAL_URL || process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, ""),
  tagline: "Build in Ghana With Local Oversight and Clear Decisions.",
  description:
    "Construction oversight, build readiness reviews and private land and property inquiries for owners in Ghana and abroad — diaspora, returnees and local residents.",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || "",
  bookingUrl: process.env.NEXT_PUBLIC_GHL_BOOKING_URL || "",
  // Leave empty until confirmed. Never publish an address that isn't real.
  email: process.env.NEXT_PUBLIC_CONTACT_EMAIL || "",
  phone: "",
  address: "",
};

export type Claim = { label: string; value: string; verified: boolean };

/** Only verified claims are ever rendered publicly. Unverified ones stay in config as an owner to-do list. */
export const verifiedOnly = (claims: Claim[]) => claims.filter((c) => c.verified);

/** Founder profile. Values come from the founder; each must be confirmed before launch. */
export const founder = {
  name: "Gary Acquah",
  role: "Founder & Principal",
  photo: null as string | null, // add /public/images/founder.jpg when available
  bio: [
    "Gary leads every engagement as the owner's single point of accountability. His work sits where construction delivery, development finance and affordable housing meet.",
    "His background is in residential property ownership and management in Greater Boston, development finance and affordable housing.",
    "BuildGhana Abroad applies the U.S. discipline he uses at home to projects in Ghana: written scopes, verified budgets, documented inspections and reporting you can rely on from another time zone.",
  ],
  /** Named organisations / roles. Published only once verified (affiliation claims). */
  namedRoles: [
    { label: "Founder, Flex Investments LLC", value: "Owns and manages residential property in Greater Boston", verified: false },
    { label: "Senior finance, development and marketing consultant", value: "Habitat for Humanity Greater Boston", verified: false },
  ] satisfies Claim[],
  credentials: [
    { label: "MBA", value: "Cornell University", verified: false },
    { label: "MS, Construction Project Management", value: "Worcester Polytechnic Institute (WPI)", verified: false },
    { label: "Massachusetts Construction Supervisor / Contractor credential", value: "Licence type and number to be confirmed", verified: false },
    { label: "OSHA 30", value: "Certificate on file", verified: false },
  ] satisfies Claim[],
};

/**
 * Ghana operating credentials. These MUST be completed and verified before the
 * site describes direct construction contracting in Ghana.
 */
export const ghanaCredentials: Claim[] = [
  { label: "Ghana business registration (ORC)", value: "Registration number to be added", verified: false },
  { label: "Ghana construction contractor classification (Ministry of Works & Housing)", value: "Class and category to be added", verified: false },
  { label: "Ghana Institution of Engineering / Ghana Institute of Architects affiliations (team)", value: "Named professionals to be added", verified: false },
  { label: "Professional indemnity / liability insurance", value: "Carrier and cover to be added", verified: false },
];

export const disclaimers = {
  licensing:
    "U.S. licences and certifications held by our team do not authorise construction work in Ghana. Construction in Ghana is carried out by appropriately registered Ghanaian entities and professionals, and requires permits from the relevant Metropolitan, Municipal or District Assembly.",
  advisory:
    "Independent advisory services (feasibility, owner's representation, inspections) are separate from construction contracting. When we act as your owner's representative we do not also act as your builder on the same scope, so our reporting stays independent.",
  regulatory:
    "Regulatory information on this site is general guidance, not legal advice. Requirements vary by Assembly and change over time; confirm them with a Ghana-qualified lawyer, surveyor or the relevant authority.",
};

export const nav = {
  services: [
    { href: "/land-feasibility", label: "Land Due Diligence & Feasibility" },
    { href: "/design-coordination", label: "Architectural & Engineering Coordination" },
    { href: "/preconstruction-budgeting", label: "Preconstruction Planning & Budgeting" },
    { href: "/owners-representation", label: "Owner's Representation & Inspections" },
    { href: "/construction-management-ghana", label: "General Contracting & Construction Management" },
    { href: "/ghana-project-rescue", label: "Unfinished Project Rescue" },
    { href: "/ghana-property-development", label: "Ghana Real Estate Development" },
  ],
  main: [
    { href: "/build-in-ghana", label: "Build in Ghana" },
    { href: "/ghana-build-readiness-review", label: "Readiness Review" },
    { href: "/property", label: "Property" },
    { href: "/our-process", label: "Our Process" },
    { href: "/resources", label: "Resources" },
    { href: "/about", label: "About" },
  ],
  property: [
    { href: "/property", label: "Off-market property introductions" },
    { href: "/property/sell", label: "Sell land or property privately" },
    { href: "/property/buy", label: "Tell us what you want to buy" },
    { href: "/property/how-it-works", label: "How introductions work" },
    { href: "/property/opportunities", label: "Opportunities" },
  ],
  footerCompany: [
    { href: "/build-in-ghana", label: "Build in Ghana" },
    { href: "/ghana-build-readiness-review", label: "Readiness Review" },
    { href: "/our-process", label: "Our Process" },
    { href: "/property", label: "Property introductions" },
    { href: "/projects", label: "Projects" },
    { href: "/resources", label: "Resources" },
    { href: "/about", label: "About" },
    { href: "/book-consultation", label: "Book a Consultation" },
  ],
};
