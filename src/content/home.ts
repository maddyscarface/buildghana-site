import type { Faq } from "./services";

export const homeFaqs: Faq[] = [
  { q: "Do I need to travel to Ghana to build with you?", a: "No. Our process is designed for owners who live abroad. Most decisions happen on scheduled video calls and through written reports. Some legal steps may require your signature or a trusted local representative, which we help you arrange." },
  { q: "Are you a builder or a consultant?", a: "Both services exist, and we keep them separate. As an independent owner's representative we inspect and report on another builder's work. Under a construction management or contracting agreement we take responsibility for delivery. We never act as your independent inspector and your builder on the same scope." },
  { q: "Are your U.S. licences valid in Ghana?", a: "No, and we don't claim they are. Construction in Ghana is carried out by appropriately registered Ghanaian entities and professionals with permits from the relevant Assembly. Our U.S. background shapes how we manage projects — scopes, budgets, inspections and reporting." },
  { q: "How do payments work?", a: "Payments are tied to milestones that we have documented and verified. Our default is that you pay suppliers and builders directly against those milestones. Any other arrangement is agreed in writing." },
  { q: "How will I know what's happening on site?", a: "Through structured reports with dated, geo-tagged photos and video, progress against schedule, budget status, issues and decisions needed. You also get a standing call cadence agreed at the start." },
  { q: "My project has stalled. Can you help?", a: "Yes. A Project Review documents the site's real condition, refers structural questions to a qualified engineer, estimates the cost to complete and lays out recovery options. You're not obliged to use us to finish." },
  { q: "What does a project assessment cost?", a: "The initial discovery call is free. Paid assessments — Feasibility Assessment, Project Review or Feasibility Consultation — are fixed-fee, quoted in writing before you commit." },
  { q: "Which parts of Ghana do you work in?", a: "Tell us where your project is. We confirm coverage for your location during the discovery call before any fee is agreed." },
];

export const benefits = [
  { title: "Independent visibility", body: "Dated photo and video reporting, progress against plan and a clear list of decisions you need to make." },
  { title: "Money tied to progress", body: "Line-item budgets and payments released against verified milestones — not requests." },
  { title: "One accountable team", body: "A single point of contact who owns the schedule, the scope and the answers." },
];

export const commitments = [
  { title: "Verified before reported", body: "We separate what has been checked from what has been assumed — in writing, every time." },
  { title: "Qualified where it matters", body: "Legal, survey, design and structural opinions come from Ghana-registered professionals and are labelled as theirs." },
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
  { n: "01", title: "Discovery call", body: "A free 30-minute call to understand your goals, land, budget and timeline — and whether we're the right fit." },
  { n: "02", title: "Paid assessment", body: "A fixed-fee Feasibility Assessment, Project Review or Feasibility Consultation that gives you facts to decide on." },
  { n: "03", title: "Plan & agreement", body: "Design, budget, schedule and payment milestones agreed in writing. You know the rules before work starts." },
  { n: "04", title: "Build & report", body: "Construction or independent oversight with structured reporting, hold-point inspections and change control." },
  { n: "05", title: "Handover", body: "Snag list, documentation and a formal handover — so you receive the building you paid for." },
];
