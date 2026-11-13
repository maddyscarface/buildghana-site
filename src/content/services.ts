export type Faq = { q: string; a: string };

export type Service = {
  slug: string;
  icon: IconName;
  mode: "advisory" | "contracting" | "advisory-or-contracting";
  navLabel: string;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  lede: string;
  problem: { heading: string; body: string; points: string[] };
  explanation: string[];
  deliverables: string[];
  process: { title: string; detail: string }[];
  whoFor: string[];
  trust: string[];
  faqs: Faq[];
  cta: { heading: string; body: string; label: string; href: string };
  related: string[];
  funnel: "new_home" | "rescue" | "investor";
};

export type IconName = "map" | "compass" | "ledger" | "shield" | "crane" | "rescue" | "building";

export const modeLabel: Record<Service["mode"], string> = {
  advisory: "Independent advisory service",
  contracting: "Construction delivery service",
  "advisory-or-contracting": "Advisory or delivery — scoped per project",
};

export const services: Service[] = [
  {
    slug: "land-feasibility",
    icon: "map",
    mode: "advisory",
    funnel: "new_home",
    navLabel: "Land Due Diligence & Feasibility",
    metaTitle: "Land Due Diligence & Feasibility in Ghana",
    metaDescription:
      "Before you build in Ghana, verify the land. Title and boundary checks coordinated with Ghana-qualified professionals, site assessment, and a written feasibility report.",
    eyebrow: "Service 01 · Land Due Diligence & Feasibility",
    h1: "Know what you own — and what it can carry — before you pour a foundation.",
    lede:
      "Land problems are the most expensive problems to discover late. We coordinate title, boundary and site checks with Ghana-qualified professionals, then tell you in writing whether the plot supports the home or investment you have in mind.",
    problem: {
      heading: "Most stalled builds start with a land question nobody answered.",
      body:
        "Overseas buyers often rely on a relative, an agent or a single document. Competing claims, unregistered transfers, wrong site plans and plots that don't fit the intended building surface after money has already gone into the ground.",
      points: [
        "Ownership and documentation that can't be verified from abroad",
        "Boundaries on paper that don't match pillars on site",
        "Access, drainage, soil or zoning issues that change the design or the budget",
        "No clear picture of what the plot can legally and practically support",
      ],
    },
    explanation: [
      "We work as your independent coordinator. A Ghana-qualified lawyer conducts the legal title search and a licensed surveyor confirms the boundaries. We manage the process, collect the evidence, physically assess the site and translate the findings into a decision you can make from abroad.",
      "You receive a clear feasibility report: what was checked, by whom, what was found, what remains uncertain and what it means for your plans and budget.",
    ],
    deliverables: [
      "Document checklist and gap analysis for your plot",
      "Coordination of title search with a Ghana-qualified lawyer (lawyer engaged by you or through us)",
      "Coordination of boundary survey / site plan verification with a licensed surveyor",
      "Site visit with geo-tagged photo and video documentation",
      "Access, drainage, topography and neighbourhood observations",
      "Preliminary zoning and permit pathway notes for the relevant Assembly",
      "Written feasibility report with go / proceed-with-conditions / stop recommendation",
      "Order-of-magnitude budget range for the intended building type",
    ],
    process: [
      { title: "Intake call", detail: "We review what you have — indenture, site plan, receipts, photos — and agree the scope and fee in writing." },
      { title: "Professional instructions", detail: "We brief the lawyer and surveyor and set deadlines. You see every instruction we send." },
      { title: "Site assessment", detail: "Our team visits the plot and documents conditions, access and surroundings." },
      { title: "Findings review", detail: "We consolidate legal, survey and site findings and flag anything unresolved." },
      { title: "Report & call", detail: "You receive the report and a walkthrough call with a clear recommendation." },
    ],
    whoFor: [
      "Buyers who have paid for land, or are about to, and want independent verification",
      "Families who inherited or were gifted land and need to confirm its status",
      "Investors comparing plots for a rental or multifamily project",
    ],
    trust: [
      "We separate what is verified from what is assumed — in writing",
      "Legal opinions come from Ghana-qualified lawyers, not from us",
      "Every site observation is photo- and video-documented with dates",
      "Fixed scope and fee agreed before work starts",
    ],
    faqs: [
      { q: "Can you guarantee my land title is clean?", a: "No one can honestly guarantee that. A Ghana-qualified lawyer will search the relevant records and give an opinion; we coordinate the work and explain the findings and remaining risks in plain language." },
      { q: "Do I need to be in Ghana?", a: "No. The process is designed for owners abroad. You may need to sign authorisations or provide documents, which we can usually arrange electronically or through someone you trust locally." },
      { q: "What if the land has a problem?", a: "The report explains the issue, what it would take to resolve it, and whether we recommend proceeding. Many issues are fixable; some are reasons to stop before spending more." },
      { q: "How long does it take?", a: "It depends on the records involved and the professionals' schedules. We give you an estimated timeline when we confirm scope, and update you if anything changes." },
    ],
    cta: { heading: "Verify the land before you commit more money.", body: "Tell us about your plot. We'll confirm whether a feasibility assessment is the right first step.", label: "Request a Land Assessment", href: "/assessment?service=land_feasibility" },
    related: ["design-coordination", "preconstruction-budgeting", "owners-representation"],
  },
  {
    slug: "design-coordination",
    icon: "compass",
    mode: "advisory",
    funnel: "new_home",
    navLabel: "Architectural & Engineering Coordination",
    metaTitle: "Architecture & Engineering Coordination",
    metaDescription:
      "We coordinate Ghana-registered architects and engineers so your drawings are buildable, permit-ready and aligned with your budget — managed for you from abroad.",
    eyebrow: "Service 02 · Architectural & Engineering Coordination",
    h1: "Drawings that can be permitted, priced and actually built.",
    lede:
      "We manage the design team on your behalf — brief, schedule, reviews and approvals — so the house you approve on screen is the house your budget and your site can deliver.",
    problem: {
      heading: "Incomplete drawings are where budgets quietly break.",
      body:
        "Many projects start with an architectural sketch and no structural, electrical or plumbing design. Builders fill the gaps on site, costs drift, and quality depends on whoever is there that day.",
      points: [
        "Architectural drawings without structural, MEP or site drainage design",
        "Designs that exceed the budget before anyone has priced them",
        "Slow back-and-forth across time zones with no one owning the schedule",
        "Uncertainty about what the Assembly requires for a building permit",
      ],
    },
    explanation: [
      "Design work is carried out by Ghana-registered architects and engineers. Our role is to brief them properly, keep the design aligned with your budget, run structured reviews and make sure the drawing set is complete enough to permit, price and build.",
      "If you already have an architect, we coordinate with them. If you don't, we help you select one.",
    ],
    deliverables: [
      "Written design brief: rooms, sizes, finishes level, future expansion, budget",
      "Shortlist and selection support for Ghana-registered architect and engineers (if needed)",
      "Design review at concept, developed and construction-drawing stages",
      "Drawing-set completeness check (architectural, structural, MEP, drainage, site)",
      "Budget alignment check at each stage with a cost estimator",
      "Permit submission package coordination with the design team",
      "Decision log so every change is recorded and approved by you",
    ],
    process: [
      { title: "Brief", detail: "We turn your goals and budget into a written design brief." },
      { title: "Team", detail: "We confirm or appoint the architect and engineers and agree fees and timelines." },
      { title: "Design reviews", detail: "Structured reviews at each stage, with cost checks before you approve." },
      { title: "Permit package", detail: "We coordinate the complete submission for the relevant Assembly." },
      { title: "Construction-ready set", detail: "A complete drawing set and specification ready for pricing." },
    ],
    whoFor: [
      "Owners with a sketch or concept who need a complete, buildable design",
      "Owners whose architect is in Ghana and who need someone managing the process locally",
      "Investors standardising a design for multiple units",
    ],
    trust: [
      "Design is done by registered professionals; we manage, review and document",
      "Every design decision is logged with your approval",
      "Cost is checked before each approval, not after",
    ],
    faqs: [
      { q: "Can I use an architect I already know?", a: "Yes. We coordinate with your architect and add the reviews, cost checks and engineering coordination that are often missing." },
      { q: "Do you design the house yourselves?", a: "No. Design and engineering are performed by registered professionals in Ghana. We manage the brief, schedule, reviews and budget alignment." },
      { q: "Can I use a design from the U.S.?", a: "A foreign design usually needs to be adapted and sealed by Ghana-registered professionals for local codes, materials, climate and permit requirements. We can coordinate that adaptation." },
    ],
    cta: { heading: "Get a design you can build on budget.", body: "Share what you have — even if it's just an idea. We'll recommend the right next step.", label: "Request a Project Assessment", href: "/assessment?service=design_coordination" },
    related: ["land-feasibility", "preconstruction-budgeting", "construction-management-ghana"],
  },
  {
    slug: "preconstruction-budgeting",
    icon: "ledger",
    mode: "advisory",
    funnel: "new_home",
    navLabel: "Preconstruction Planning & Budgeting",
    metaTitle: "Preconstruction Budgeting in Ghana",
    metaDescription:
      "Line-item budgets, schedules and procurement plans for building in Ghana — so you know what your project costs and how money will move before construction starts.",
    eyebrow: "Service 03 · Preconstruction Planning & Budgeting",
    h1: "Know the real cost, the schedule and the cash flow before construction starts.",
    lede:
      "We build a line-item budget, a realistic schedule and a payment plan tied to verified progress — so you fund work that has been done, not work that has been promised.",
    problem: {
      heading: "\"Send money for blocks\" is not a budget.",
      body:
        "Without a priced scope, owners abroad fund construction one request at a time. There is no way to know whether a request is fair, whether the money was used as intended, or what it will take to finish.",
      points: [
        "No line-item budget or contingency",
        "Payments disconnected from verified progress",
        "Material prices and exchange-rate movements not planned for",
        "No schedule, so delays are invisible until they're serious",
      ],
    },
    explanation: [
      "We take your drawings and specification and produce a budget broken down by phase and trade, with explicit allowances, contingency and assumptions. We build a schedule and a milestone-based payment plan so each disbursement is tied to documented progress.",
      "Where you are inviting builders to price the work, we prepare the tender package and help you compare bids line by line.",
    ],
    deliverables: [
      "Line-item construction budget by phase and trade, with stated assumptions",
      "Contingency and allowance schedule",
      "Construction schedule with key milestones",
      "Milestone-based payment plan linked to inspection sign-off",
      "Procurement plan for long-lead and owner-supplied items",
      "Tender package and side-by-side bid comparison (if tendering)",
      "Currency and price-escalation risk notes",
    ],
    process: [
      { title: "Scope review", detail: "We review drawings, specifications and your finishes expectations." },
      { title: "Estimate", detail: "Quantities and pricing developed with local cost input." },
      { title: "Schedule & cash flow", detail: "A schedule and payment plan you can fund against." },
      { title: "Tender (optional)", detail: "Bid package, builder questions and line-by-line comparison." },
      { title: "Go / no-go", detail: "Final budget review and recommendation before contract." },
    ],
    whoFor: [
      "Owners with drawings who need to know the true cost to complete",
      "Owners comparing quotes from builders in Ghana",
      "Investors underwriting a development and needing a defensible cost base",
    ],
    trust: [
      "Every number states its assumptions",
      "Payments tied to inspected milestones, not requests",
      "We disclose any relationship we have with builders we recommend",
    ],
    faqs: [
      { q: "How accurate is the budget?", a: "Accuracy depends on how complete the design is. We state the estimate class and assumptions clearly, and refine it as the design develops." },
      { q: "Can you tell me what a house costs in Ghana?", a: "Not responsibly without a scope. Costs vary widely with location, size, design, finishes and timing. Our assessment gives you a range for your specific project and a line-item budget once the design is defined." },
      { q: "Do you handle the money?", a: "Our default is that you pay suppliers and builders directly against milestones we have verified. Any other arrangement is agreed in writing." },
    ],
    cta: { heading: "Fund your build against a real plan.", body: "Tell us where your project stands and we'll scope the preconstruction work.", label: "Request a Project Assessment", href: "/assessment?service=preconstruction" },
    related: ["design-coordination", "owners-representation", "construction-management-ghana"],
  },
  {
    slug: "owners-representation",
    icon: "shield",
    mode: "advisory",
    funnel: "new_home",
    navLabel: "Owner's Representation & Inspections",
    metaTitle: "Owner's Rep & Construction Inspections",
    metaDescription:
      "Independent eyes on your Ghana construction site. Scheduled inspections, photo and video reporting, payment verification and quality checks for owners abroad.",
    eyebrow: "Service 04 · Owner's Representation & Construction Inspections",
    h1: "Independent eyes on your site — reporting to you, not the builder.",
    lede:
      "We represent you on site. We inspect the work, verify progress before you pay, track the schedule and budget, and send you reports you can actually act on.",
    problem: {
      heading: "From abroad, you only see what you're shown.",
      body:
        "When the person reporting progress is also the person being paid, problems surface late. Owners abroad end up relying on WhatsApp photos with no context, no measurements and no way to tell good work from cover-up.",
      points: [
        "Progress reports from the builder, about the builder",
        "Payments released without independent verification",
        "Quality issues hidden by the next stage of work",
        "No single record of decisions, changes and costs",
      ],
    },
    explanation: [
      "As your owner's representative we are independent of the builder on your project. We visit on an agreed schedule and at critical stages — foundations, columns and slabs, roofing, services rough-in, finishes — and verify work against the drawings and the payment plan.",
      "You receive a structured report after every visit: progress against schedule, payment recommendation, quality observations with photos and video, open issues and decisions needed from you.",
    ],
    deliverables: [
      "Inspection schedule aligned to critical construction stages",
      "Site visit reports with dated, geo-tagged photo and video",
      "Payment-request verification and release recommendation",
      "Quality observations against drawings and specification",
      "Issue and change-order log with cost and schedule impact",
      "Monthly budget and schedule status summary",
      "Owner portal / dashboard access (where enabled)",
    ],
    process: [
      { title: "Baseline", detail: "We review contract, drawings, budget and current site condition." },
      { title: "Inspection plan", detail: "Visit frequency and hold points agreed with you and the builder." },
      { title: "Site visits", detail: "Scheduled and stage-based inspections with full documentation." },
      { title: "Payment verification", detail: "We check each payment request against verified progress." },
      { title: "Reporting", detail: "Structured reports and a standing call so you always know where things stand." },
    ],
    whoFor: [
      "Owners who already have a builder and want independent oversight",
      "Owners funding construction from abroad who need payment verification",
      "Investors and lenders who require third-party progress reporting",
    ],
    trust: [
      "We don't act as builder on a project where we are your owner's rep",
      "Reports show evidence, not opinions alone",
      "Inspection checklists are shared with you in advance",
    ],
    faqs: [
      { q: "Will my builder accept an owner's representative?", a: "Most professional builders do, and a builder who resists independent inspection is useful information in itself. We agree access and hold points at the start." },
      { q: "How often do you visit?", a: "Frequency is set by stage and budget — typically more often during structural work. We propose a schedule in the scope." },
      { q: "Are your inspectors engineers?", a: "Inspections are carried out by our site team. Where a structural or specialist judgement is required, it is referred to a qualified Ghana-registered professional and reported as such." },
    ],
    cta: { heading: "Stop paying on trust alone.", body: "Tell us about your builder and your project stage. We'll propose an inspection plan.", label: "Request a Project Assessment", href: "/assessment?service=owners_rep" },
    related: ["construction-management-ghana", "ghana-project-rescue", "preconstruction-budgeting"],
  },
  {
    slug: "construction-management-ghana",
    icon: "crane",
    mode: "contracting",
    funnel: "new_home",
    navLabel: "General Contracting & Construction Management",
    metaTitle: "Construction Management in Ghana",
    metaDescription:
      "End-to-end construction delivery for overseas owners building homes in Ghana: one accountable team, a fixed scope, milestone payments and transparent reporting.",
    eyebrow: "Service 05 · General Contracting & Construction Management",
    h1: "One accountable team delivering your home in Ghana — with reporting you can trust.",
    lede:
      "We take responsibility for delivering the build: procurement, trades, schedule, quality and safety, with milestone payments and regular reporting to you abroad.",
    problem: {
      heading: "Managing a build across an ocean shouldn't be your second job.",
      body:
        "Owners abroad often become the de facto project manager — chasing labourers, approving purchases by voice note and guessing at progress. It is exhausting, and it rarely produces the house they paid for.",
      points: [
        "Too many people to coordinate, none fully accountable",
        "Material purchases and labour costs that can't be verified",
        "Schedule slips with no explanation",
        "Quality that depends on who happened to be on site",
      ],
    },
    explanation: [
      "Under a construction management or general contracting agreement, we take responsibility for delivering the agreed scope. Construction work in Ghana is carried out through an appropriately registered Ghanaian entity and qualified local professionals and trades, under the permits issued by the relevant Assembly.",
      "You get a defined scope, a line-item budget, a schedule, milestone-based payments and structured reporting. Changes are priced and approved by you before they happen.",
    ],
    deliverables: [
      "Construction agreement with defined scope, price basis and milestones",
      "Procurement and management of materials and trades",
      "Site supervision, quality control and safety management",
      "Weekly progress updates and monthly reports with photo and video",
      "Budget tracking with change-order approvals",
      "Permit and inspection coordination with the relevant Assembly",
      "Handover package: as-built notes, warranties, snag list closure",
    ],
    process: [
      { title: "Assessment", detail: "Feasibility, design readiness and budget confirmed." },
      { title: "Agreement", detail: "Scope, price basis, schedule and payment milestones agreed in writing." },
      { title: "Mobilisation", detail: "Permits confirmed, site set up, procurement started." },
      { title: "Construction", detail: "Delivery by stage with hold-point inspections and reporting." },
      { title: "Handover", detail: "Snagging, documentation and formal handover." },
    ],
    whoFor: [
      "Owners with land and a design who want one accountable delivery partner",
      "Owners who no longer want to manage builders directly from abroad",
      "Families building a primary or retirement home in Ghana",
    ],
    trust: [
      "Written scope and change-order control",
      "Milestone payments tied to documented progress",
      "Ghana registrations and team credentials listed on our About page",
      "You can add an independent inspector at any time",
    ],
    faqs: [
      { q: "Are you licensed to build in Ghana?", a: "Construction is carried out through an appropriately registered Ghanaian entity and qualified local professionals. We publish registrations and licences on our About page only once they are verified, so ask us for them in writing before you sign anything. U.S. licences held by our team do not authorise construction in Ghana." },
      { q: "Is it a fixed price?", a: "That depends on how complete the design is. We offer fixed-price stages where the scope is defined, and cost-plus or managed-cost arrangements where it isn't. The basis is always stated in the agreement." },
      { q: "How do I pay?", a: "Against agreed milestones, after progress is documented. Payment routes and controls are set out in the agreement." },
      { q: "What about materials quality?", a: "Specifications are agreed upfront. Key materials are documented on delivery and installation in your reports." },
    ],
    cta: { heading: "Build with one accountable partner.", body: "Start with a project assessment so we can confirm scope, budget and timing.", label: "Request a Project Assessment", href: "/assessment?service=construction_management" },
    related: ["preconstruction-budgeting", "owners-representation", "ghana-project-rescue"],
  },
  {
    slug: "ghana-project-rescue",
    icon: "rescue",
    mode: "advisory-or-contracting",
    funnel: "rescue",
    navLabel: "Unfinished Project Rescue",
    metaTitle: "Stalled Construction Rescue in Ghana",
    metaDescription:
      "If your Ghana building project has stalled, we document its true condition, estimate the cost to complete and build a recovery plan you can fund with confidence.",
    eyebrow: "Service 06 · Unfinished Construction Project Rescue",
    h1: "Your project stalled. Let's find out exactly where it stands — and what it takes to finish.",
    lede:
      "We document the real condition of your building, assess the work already done, estimate the cost to complete and give you a recovery plan — without blame and without guesswork.",
    problem: {
      heading: "A stalled build costs money every month it sits.",
      body:
        "Exposed blocks and rebar deteriorate, materials disappear, and the longer a site sits the harder it is to know what's sound. Many owners have stopped sending money because they no longer trust the information they're getting.",
      points: [
        "No reliable picture of what was actually built",
        "Uncertainty about whether existing work is structurally sound",
        "Money spent with no record of where it went",
        "A builder who has gone quiet — or a relationship that has broken down",
      ],
    },
    explanation: [
      "A Project Review is a paid, fixed-scope engagement. We visit the site, document everything, review the drawings and records you have, and refer structural questions to a qualified Ghana-registered engineer.",
      "You receive a condition report, a cost-to-complete estimate and a recovery scope. You then decide: complete with us, complete with another builder under our oversight, or pause with a plan to protect the site.",
    ],
    deliverables: [
      "Full site documentation: photo, video and measured observations",
      "Work-in-place assessment against available drawings",
      "Structural concerns referred to a Ghana-registered engineer and reported",
      "Site security and weather-protection recommendations",
      "Cost-to-complete estimate with stated assumptions",
      "Recovery scope and phased completion plan",
      "Options summary: complete, re-tender, or pause and protect",
    ],
    process: [
      { title: "Condition intake", detail: "You share what you have — photos, drawings, receipts, builder contacts." },
      { title: "Site review", detail: "Our team documents the site in full." },
      { title: "Technical review", detail: "Engineer input where structural questions arise." },
      { title: "Cost to complete", detail: "Scope and estimate for finishing the building." },
      { title: "Recovery plan", detail: "Report, options and a walkthrough call." },
    ],
    whoFor: [
      "Owners whose construction has stopped or slowed dramatically",
      "Owners who have lost confidence in their builder or caretaker",
      "Families who inherited an unfinished building",
      "Buyers considering purchasing an unfinished property",
    ],
    trust: [
      "We document first and recommend second",
      "Structural opinions come from qualified engineers, clearly labelled",
      "You can take the report to any builder — no obligation to use us",
    ],
    faqs: [
      { q: "Is my building salvageable?", a: "Often, but not always. Exposure, workmanship and design all matter. The Project Review tells you what is sound, what needs testing or remediation and what it will cost." },
      { q: "Do I have to use you to finish the project?", a: "No. The report is yours. Many owners use it to re-tender the work or to supervise another builder." },
      { q: "Can you deal with my previous builder?", a: "We can request information and documents from them on your behalf. Legal disputes should be handled by a Ghana-qualified lawyer; we can provide factual documentation to support that process." },
      { q: "How much does a Project Review cost?", a: "It is a fixed fee based on the building size and location, quoted before you commit." },
    ],
    cta: { heading: "Get the facts on your stalled project.", body: "Tell us about the site. We'll confirm whether a Project Review is the right first step.", label: "Request a Project Review", href: "/assessment?service=project_rescue&funnel=rescue" },
    related: ["owners-representation", "construction-management-ghana", "preconstruction-budgeting"],
  },
  {
    slug: "ghana-property-development",
    icon: "building",
    mode: "advisory-or-contracting",
    funnel: "investor",
    navLabel: "Ghana Real Estate Development",
    metaTitle: "Real Estate Development in Ghana",
    metaDescription:
      "Feasibility, design, cost planning and construction oversight for rental and multifamily development in Ghana — managed with institutional discipline for investors abroad.",
    eyebrow: "Service 07 · Ghana Real Estate Development",
    h1: "Develop rental and multifamily property in Ghana with institutional discipline.",
    lede:
      "From site selection and feasibility to design, budgeting and delivery, we help investors abroad develop income-producing property with the controls they'd expect at home.",
    problem: {
      heading: "Good returns on paper don't survive weak execution.",
      body:
        "Development pro formas often assume costs, timelines and rents that nobody has tested on the ground. Cost overruns and delays erode returns long before the first tenant moves in.",
      points: [
        "Unverified construction costs and timelines",
        "Rent and demand assumptions without local evidence",
        "No independent control over contractor spending",
        "Design not optimised for the target tenant or buyer",
      ],
    },
    explanation: [
      "We help you test the opportunity before you commit capital, then manage design, budgeting and delivery against your investment criteria. We are not investment, legal or tax advisers; we work alongside yours and give you construction and development evidence they can rely on.",
      "Engagements can be advisory only (feasibility and oversight) or include construction delivery through registered Ghanaian entities.",
    ],
    deliverables: [
      "Site and market feasibility summary (with local inputs clearly sourced)",
      "Unit mix and design brief aligned to target tenants",
      "Development budget and construction cost plan",
      "Development schedule and draw schedule",
      "Construction delivery or independent oversight",
      "Investor-grade monthly reporting",
      "Handover and lease-up readiness checklist",
    ],
    process: [
      { title: "Investment brief", detail: "Your criteria, capital plan and risk tolerance." },
      { title: "Feasibility", detail: "Site, cost and market inputs assembled and tested." },
      { title: "Design & budget", detail: "Unit mix, design and a defensible cost plan." },
      { title: "Delivery", detail: "Construction managed or independently overseen." },
      { title: "Handover", detail: "Completion, documentation and lease-up readiness." },
    ],
    whoFor: [
      "Diaspora investors building rental units, apartments or mixed-use property",
      "Investor groups and family offices evaluating Ghana development",
      "Owners converting family land into income-producing property",
    ],
    trust: [
      "Assumptions are sourced and labelled — no invented market data",
      "Investor-grade reporting with budget and schedule variance",
      "Clear separation between advisory and construction roles",
    ],
    faqs: [
      { q: "Do you provide investment returns projections?", a: "We provide construction cost, schedule and development inputs and can assemble locally sourced market inputs. Return projections and investment advice should come from your financial advisers." },
      { q: "Can you find land for me?", a: "We can evaluate plots you are considering and coordinate due diligence. We don't act as a land broker." },
      { q: "What size projects do you take on?", a: "From a small block of rental units to larger multifamily schemes. Fit is confirmed in the feasibility consultation." },
    ],
    cta: { heading: "Test your development before you fund it.", body: "Share your investment brief and we'll set up a feasibility consultation.", label: "Request a Feasibility Consultation", href: "/assessment?service=development&funnel=investor" },
    related: ["land-feasibility", "preconstruction-budgeting", "construction-management-ghana"],
  },
];

export const serviceBySlug = (slug: string) => services.find((s) => s.slug === slug);
