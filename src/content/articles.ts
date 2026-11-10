/**
 * Launch articles. `reviewed` must be set to a named Ghana-qualified reviewer + date
 * before regulatory statements are treated as verified. Until then, the page shows a review notice.
 */
export type Article = {
  slug: string;
  title: string;
  metaDescription: string;
  summary: string;
  updated: string;
  reviewed: null | { by: string; credential: string; date: string };
  answer: string; // direct answer for answer engines (AEO)
  sections: { h: string; p?: string[]; list?: string[] }[];
  cta: { label: string; href: string };
  related: string[];
};

export const articles: Article[] = [
  {
    slug: "build-house-in-ghana-from-usa",
    title: "How to Build a House in Ghana While Living in the U.S.",
    metaDescription: "A step-by-step guide for Americans and diaspora families building a home in Ghana from abroad: land, design, permits, budget, payments and oversight.",
    summary: "The sequence that protects your money when you can't be on site — from land checks to handover.",
    updated: "2026-11-01",
    reviewed: null,
    answer: "To build a house in Ghana from the U.S., verify your land title and boundaries first, commission a complete design from Ghana-registered professionals, obtain a building permit from the relevant Metropolitan, Municipal or District Assembly, price the work line by line, then fund construction in milestones that an independent representative verifies before each payment.",
    sections: [
      { h: "1. Start with the land, not the house", p: ["Most failed builds trace back to land that was never independently verified. Before design or construction, have a Ghana-qualified lawyer search the land records and a licensed surveyor confirm the boundaries match your site plan. Keep copies of every document — indenture, site plan, receipts and search results."] },
      { h: "2. Get a complete design", p: ["An architectural floor plan is not enough to build from. You also need structural design, electrical and plumbing layouts, and site drainage. Design work and sealed drawings should come from Ghana-registered architects and engineers, who will also prepare what the Assembly needs for a permit."] },
      { h: "3. Obtain the building permit", p: ["Building permits are issued by the Metropolitan, Municipal or District Assembly where the land sits, under Ghana's land-use and spatial planning framework. Requirements and timelines vary by Assembly. Your design team should prepare the submission; confirm current requirements with the Assembly before you budget time for approval."] },
      { h: "4. Price it line by line", p: ["Ask for a priced scope broken down by phase and trade, with stated assumptions and a contingency. If you are inviting builders to quote, give them all the same drawings and specification so you can compare like for like."] },
      { h: "5. Pay against verified progress", p: ["Agree payment milestones tied to physical progress — foundations complete, ground-floor columns cast, roof on. Before each payment, have someone independent of the builder verify the work with dated photos and video."], list: ["Never fund a stage before the previous one is verified", "Keep a single record of every payment and what it bought", "Approve changes in writing before they happen"] },
      { h: "6. Plan for reporting from day one", p: ["Decide upfront how often you'll receive updates, what they'll contain and who produces them. Consistent, structured reporting is the difference between managing a project and hoping for one."] },
    ],
    cta: { label: "Request a Project Assessment", href: "/assessment?funnel=new_home" },
    related: ["land-feasibility", "preconstruction-budgeting", "owners-representation"],
  },
  {
    slug: "ghana-land-due-diligence-checklist",
    title: "Land Due Diligence in Ghana: What to Check Before You Build",
    metaDescription: "What overseas buyers should verify about land in Ghana before building: documents, title search, boundaries, access, and the professionals involved.",
    summary: "The checks that separate a buildable plot from an expensive dispute.",
    updated: "2026-11-01",
    reviewed: null,
    answer: "Before building on land in Ghana, have a Ghana-qualified lawyer conduct an official search of the land records, have a licensed surveyor verify that the boundaries on site match the site plan, confirm who had authority to sell or grant the land, check access and drainage, and confirm the zoning and permit pathway with the local Assembly.",
    sections: [
      { h: "Why land comes first", p: ["Land in Ghana can be held under different tenure arrangements, including customary (stool, skin and family) land and state land. Who had authority to grant or sell your plot, and whether that transfer has been properly documented and registered, determines how secure your investment is. Ghana's land law was consolidated in the Land Act, 2020 (Act 1036); a Ghana-qualified lawyer should advise on how it applies to your plot."] },
      { h: "Documents to gather", list: ["Indenture or other transfer document", "Site plan prepared by a licensed surveyor", "Receipts and evidence of payment", "Any registration or title documents", "Contact details for the vendor or family/stool representative"] },
      { h: "Checks to commission", list: ["Official search at the Lands Commission, conducted or interpreted by a Ghana-qualified lawyer", "Boundary verification on site by a licensed surveyor", "Physical site visit: occupation, encroachment, access road, drainage, slope", "Zoning and permit pathway with the relevant Assembly", "Confirmation of any neighbouring disputes or claims known locally"] },
      { h: "Red flags", list: ["The vendor can't produce a surveyor-prepared site plan", "Pillars on site don't match the site plan", "Others are building or farming on the plot", "Pressure to pay in full before a search is completed"] },
      { h: "What this costs you if skipped", p: ["Land disputes can halt construction, require demolition or lead to litigation. Due diligence costs a small fraction of a foundation — and far less than losing one."] },
    ],
    cta: { label: "Request a Land Assessment", href: "/assessment?service=land_feasibility" },
    related: ["land-feasibility", "design-coordination"],
  },
  {
    slug: "stalled-construction-ghana-what-to-do",
    title: "Your Construction Project in Ghana Has Stalled. What Now?",
    metaDescription: "A calm, practical plan for overseas owners whose Ghana building project has stalled: protect the site, document it, assess the structure and plan recovery.",
    summary: "Five steps to regain control of an unfinished building — without throwing good money after bad.",
    updated: "2026-11-01",
    reviewed: null,
    answer: "If your construction project in Ghana has stalled, stop sending money, secure the site and any materials, get the building independently documented, have a qualified engineer assess any structural concerns, and obtain a cost-to-complete estimate before choosing whether to complete, re-tender or pause.",
    sections: [
      { h: "1. Pause payments, not progress on the facts", p: ["Stop releasing money until you know what has been built and what it's worth. This isn't about blame — it's about decisions based on evidence."] },
      { h: "2. Secure the site", p: ["Exposed rebar, open block walls and unsecured materials deteriorate or disappear. Basic protection — covering exposed steel, securing the perimeter, storing materials — preserves what you've already paid for."] },
      { h: "3. Document everything", p: ["Commission an independent, dated photo and video record of the whole building and compare it with your drawings and payment records. This becomes the baseline for every decision that follows — and for any dispute."] },
      { h: "4. Get structural questions answered properly", p: ["Long exposure, poor workmanship or missing design can affect whether existing work can carry the rest of the building. Those judgements belong to a qualified, Ghana-registered structural engineer, who may recommend testing."] },
      { h: "5. Price the finish, then choose", p: ["With a documented condition and a cost-to-complete estimate, your options become clear: complete with a new delivery team, re-tender the remaining work, or pause with the site protected while you plan finances."] },
    ],
    cta: { label: "Request a Project Review", href: "/assessment?service=project_rescue&funnel=rescue" },
    related: ["ghana-project-rescue", "owners-representation"],
  },
];

export const articleBySlug = (s: string) => articles.find((a) => a.slug === s);
