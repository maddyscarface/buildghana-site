import type { Faq } from "./services";

export const homeFaqs: Faq[] = [
  { q: "Do I need to travel to Ghana to build with you?", a: "No. If you live abroad, our process is designed around you. Most decisions happen on scheduled video calls and through written reports. Some legal steps may require your signature or a trusted local representative, which we help you arrange." },
  { q: "Are you a builder or a consultant?", a: "Both services exist, and we keep them separate. As an independent owner's representative we inspect and report on another builder's work. Under a construction management or contracting agreement we take responsibility for delivery. We never act as your independent inspector and your builder on the same scope." },
  { q: "Are your U.S. licences valid in Ghana?", a: "No, and we don't claim they are. Construction in Ghana is carried out by appropriately registered Ghanaian entities and professionals with permits from the relevant Assembly. Our U.S. background shapes how we manage projects — scopes, budgets, inspections and reporting." },
  { q: "How do payments work?", a: "Payments are tied to milestones that we have documented and verified. Our default is that you pay suppliers and builders directly against those milestones. Any other arrangement is agreed in writing." },
  { q: "How will I know what's happening on site?", a: "Through structured reports with dated, geo-tagged photos and video, progress against schedule, budget status, issues and decisions needed. You also get a standing call cadence agreed at the start." },
  { q: "My project has stalled. Can you help?", a: "Yes. A Project Review documents the site's real condition, refers structural questions to a qualified engineer, estimates the cost to complete and lays out recovery options. You're not obliged to use us to finish." },
  { q: "What does a project assessment cost?", a: "The initial discovery call is free. Paid assessments — Feasibility Assessment, Project Review or Feasibility Consultation — are fixed-fee, quoted in writing before you commit." },
  { q: "Which parts of Ghana do you work in?", a: "Tell us where your project is. We confirm coverage for your location during the discovery call before any fee is agreed." },
];

import type { StockKey } from "./images";

/** Question-led H2 answers on the homepage (spec hero brief). ~40–60 word direct answers; mirrored in JSON-LD. */
export const homeAnswers: { q: string; a: string; href: string; link: string }[] = [
  { q: "What does a Ghana build readiness review include?", a: "A paid, documented check before you build: a scheduled site visit, a review of your land documents, drawings and permits, a counsel-led title check if you commission it, and a preliminary cost range in GHS and USD. You receive a written recommendation — proceed, proceed after conditions, or pause — with the evidence and limits of each finding.", href: "/ghana-build-readiness-review", link: "See what the review covers" },
  { q: "Can I request a review while living in Ghana?", a: "Yes. BuildGhana works with owners living in Ghana as well as returnees and the diaspora. You can pay in cedis by card or mobile money, or in US dollars by card. Site-visit timing depends on where the parcel is, so we confirm coverage and turnaround for your location before you pay.", href: "/ghana-build-readiness-review/start", link: "Start a review" },
  { q: "How do I offer land for a private introduction?", a: "Complete the private seller form with the region, district, approximate size and the documents you hold. Nothing is published. We contact you to verify who you are and your authority to sell, and we only share property details with a matched buyer after you authorise it in writing and we approve that specific introduction.", href: "/property/sell", link: "Offer land privately" },
  { q: "Does BuildGhana verify land title?", a: "Not by itself. Title, tenure and encumbrance checks are carried out by appointed Ghanaian counsel, who conduct the official searches and record their own opinion and limitations. Until counsel reports, title is shown as pending. Uploaded deeds and seller statements are never presented as independently verified.", href: "/property/how-it-works", link: "How verification works" },
  { q: "Can buyers inquire without making an offer?", a: "Yes. A buyer inquiry is a description of what you want — regions, property type, size, budget and timing. It is not an offer and no payment is needed. If a suitable property is authorised for introduction, we contact you first; legal eligibility and tenure are reviewed with Ghanaian counsel where relevant.", href: "/property/buy", link: "Share your requirements" },
];

export const audiences: { title: string; body: string; image: StockKey; href: string; cta: string }[] = [
  { title: "Owners living in Ghana", body: "Independent oversight and documented decisions for your build — whether you're in Accra, Kumasi, Takoradi or Tamale. Readiness reviews payable in cedis.", image: "woman_mason_northern_ghana", href: "/ghana-build-readiness-review", cta: "Readiness Review" },
  { title: "Diaspora and returnees", body: "Build from London, Toronto or Houston with dated site evidence, milestone payments and one accountable contact — or plan the house you're coming home to.", image: "ghanaian_family_gathering", href: "/build-in-ghana", cta: "Building from abroad" },
  { title: "Sellers and buyers", body: "Private, off-market land and property inquiries with human review on both sides, seller-authorised introductions and counsel-led title checks.", image: "property_professional_desk", href: "/property", cta: "Property introductions" },
];

export const benefits = [
  { title: "Independent visibility", body: "Dated photo and video reporting, progress against plan and a clear list of decisions you need to make." },
  { title: "Money tied to progress", body: "Line-item budgets and payments released against verified milestones — not requests." },
  { title: "One accountable team", body: "A single point of contact who owns the schedule, the scope and the answers." },
];

export const commitments = [
  { title: "Verified before reported", body: "We separate what has been checked from what has been assumed — in writing, every time." },
  { title: "Qualified where it matters", body: "We don't give legal, survey or structural opinions ourselves. Those come from named Ghanaian professionals and are labelled as theirs." },
  { title: "Written scope, fixed fees", body: "Every paid engagement starts with a written scope and fee. No open-ended retainers." },
  { title: "Independent when we inspect", body: "When we represent you, we are not also the builder. Our reports work for you." },
];

export const problems = [
  "Money sent for materials that never arrive — or arrive in the wrong quantity",
  "Progress photos with no context, from the person being paid",
  "Land documents nobody independently checked",
  "Drawings that stop at the floor plan",
  "Builds that stall for months with no clear reason",
];

export const solutions = [
  "Verified land and a feasibility answer before you build",
  "A complete design and a line-item budget before you commit",
  "Milestone payments released only after documented progress",
  "Independent inspections at every critical stage",
  "A recovery plan grounded in facts if things have already gone wrong",
];

export const processSteps = [
  { n: "01", title: "Discovery call", body: "A free 30-minute call to understand your goals, land, budget and timeline — and whether we're the right fit.", deliverable: "A plain answer on fit and the right first step", image: "aburi_hills" },
  { n: "02", title: "Readiness Review or assessment", body: "A fixed-fee Readiness Review, Feasibility Assessment or Project Review that gives you facts to decide on — land, documents, drawings and budget.", deliverable: "A written report with ratings and next steps", image: "land_site_inspection" },
  { n: "03", title: "Plan & agreement", body: "Design, budget, schedule and payment milestones agreed in writing. You know the rules before work starts.", deliverable: "Scope, line-item budget and milestone schedule", image: "land_boundary_pillars" },
  { n: "04", title: "Build & report", body: "Construction or independent oversight with structured reporting, hold-point inspections and change control.", deliverable: "Dated photo/video reports and verified payment requests", image: "site_supervision_columns" },
  { n: "05", title: "Handover", body: "Snag list, documentation and a formal handover — so you receive the building you paid for.", deliverable: "Snag list, as-built documents and handover record", image: "house_roofed_tamale" },
] as const;
