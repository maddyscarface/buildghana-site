import type { Funnel } from "@/lib/lead/options";
import type { Faq } from "./services";

export type FunnelPage = {
  slug: string;
  funnel: Funnel;
  metaTitle: string;
  metaDescription: string;
  eyebrow: string;
  h1: string;
  sub: string;
  cta: string;
  offer: { name: string; summary: string; includes: string[]; priceNote: string; next: string };
  pains: string[];
  objections: Faq[];
  steps: { title: string; body: string }[];
  defaultService: string;
  defaultStage?: string;
  formHeading: string;
  visual: "home" | "rescue" | "investor";
};

/** Fee placeholders — set real fixed fees before launch. Never show a price that hasn't been approved. */
export const FEES = {
  feasibility: "Fixed fee, quoted in writing before you commit",
  review: "Fixed fee based on building size and location, quoted before you commit",
  consultation: "Fixed fee, credited toward a development engagement if you proceed",
};

export const funnelPages: FunnelPage[] = [
  {
    slug: "new-home",
    funnel: "new_home",
    visual: "home",
    metaTitle: "Build Your Home in Ghana, Managed for You",
    metaDescription: "Planning to build a home in Ghana from the U.S.? Start with a Feasibility Assessment: land checks, budget range and a clear plan before you spend more.",
    eyebrow: "For families building a home in Ghana",
    h1: "Build the home you've planned for — without managing it by WhatsApp.",
    sub: "Before you send another dollar, get a professional Feasibility Assessment: your land checked, your budget tested and a written plan for building from abroad.",
    cta: "Check My Project Fit",
    offer: {
      name: "Feasibility Assessment",
      summary: "A fixed-scope first engagement that gives you the facts to decide how — and whether — to proceed.",
      includes: [
        "Review of your land documents and coordination of legal and survey checks",
        "Site visit with dated photo and video documentation",
        "Design and permit pathway for your Assembly",
        "Budget range for your home size and finish level",
        "Written report and a walkthrough call",
      ],
      priceNote: FEES.feasibility,
      next: "If you proceed, we prepare a construction management proposal with scope, budget, schedule and payment milestones.",
    },
    pains: [
      "You've heard the stories — money sent, little built",
      "You can't be on site, and family shouldn't have to be your project manager",
      "You don't know what a fair price looks like",
      "You want quality you'd accept at home",
    ],
    objections: [
      { q: "Isn't this more expensive than using a local builder directly?", a: "You'll still use local trades and materials. What you add is planning, verification and control — which is what prevents the overruns and rework that make builds expensive." },
      { q: "I already have a builder.", a: "Then you may only need owner's representation: independent inspections and payment verification. We'll tell you on the call." },
      { q: "What if my land has problems?", a: "Better to find out now. The assessment is designed to surface land issues before construction money is committed." },
      { q: "Do I need to fly to Ghana?", a: "No. The process is designed for owners abroad. Some legal steps may need your signature or a trusted representative." },
    ],
    steps: [
      { title: "Answer 4 quick questions", body: "Tell us about your land, plans and budget." },
      { title: "Free discovery call", body: "30 minutes to confirm fit and scope." },
      { title: "Feasibility Assessment", body: "Fixed fee. Facts, budget range and a plan." },
      { title: "Construction proposal", body: "Scope, budget, schedule and milestones." },
    ],
    defaultService: "land_feasibility",
    formHeading: "See if your project is a fit.",
  },
  {
    slug: "stalled-project",
    funnel: "rescue",
    visual: "rescue",
    metaTitle: "Stalled Building in Ghana? Get a Review",
    metaDescription: "Find out exactly where your stalled Ghana construction stands. A Project Review documents the site, estimates the cost to complete and gives you a recovery plan.",
    eyebrow: "For owners with a stalled or unfinished build",
    h1: "Your build in Ghana stopped. Get the facts before you send more money.",
    sub: "A Project Review documents your building's real condition, flags structural concerns for a qualified engineer, estimates the cost to complete and lays out your options.",
    cta: "Get My Project Reviewed",
    offer: {
      name: "Project Review",
      summary: "A fixed-scope independent review of your stalled or unfinished building.",
      includes: [
        "Full photo and video documentation of the site",
        "Work-in-place assessment against your drawings",
        "Structural concerns referred to a Ghana-registered engineer",
        "Cost-to-complete estimate with assumptions",
        "Recovery scope and options: complete, re-tender, or pause and protect",
      ],
      priceNote: FEES.review,
      next: "You can use the report with any builder. If you'd like us to lead recovery, we prepare a recovery scope and proposal.",
    },
    pains: [
      "You don't know what was actually built with your money",
      "Your builder or caretaker has gone quiet",
      "You're unsure if existing work is safe to build on",
      "Every month of delay, the site deteriorates",
    ],
    objections: [
      { q: "I've already lost money. Why spend more?", a: "Because sending more money without facts is how losses grow. The review is fixed-fee and tells you exactly what it will take to finish — or whether to stop." },
      { q: "Will you blame my family or builder?", a: "No. We document the site objectively. What you do with the findings is your decision." },
      { q: "Do I have to hire you to finish it?", a: "No. The report is yours to use with any builder." },
      { q: "Can my existing structure be saved?", a: "Often, but not always. Where structural questions arise, a qualified engineer assesses them and we report their opinion clearly." },
    ],
    steps: [
      { title: "Tell us about the site", body: "Location, stage, what you have on file." },
      { title: "Free discovery call", body: "We confirm the review scope and fee." },
      { title: "Project Review", body: "Site documentation, engineering input, cost to complete." },
      { title: "Recovery scope", body: "A plan you can fund with confidence." },
    ],
    defaultService: "project_rescue",
    defaultStage: "stalled",
    formHeading: "Request a Project Review.",
  },
  {
    slug: "investors",
    funnel: "investor",
    visual: "investor",
    metaTitle: "Develop Rental Property in Ghana",
    metaDescription: "Feasibility, cost planning and construction oversight for diaspora investors developing rental and multifamily property in Ghana. Start with a feasibility consultation.",
    eyebrow: "For investors developing in Ghana",
    h1: "Develop income property in Ghana with the controls you'd expect at home.",
    sub: "Test your site, budget and timeline before you commit capital — then build with line-item cost control and investor-grade reporting.",
    cta: "Book a Feasibility Consultation",
    offer: {
      name: "Feasibility Consultation",
      summary: "A structured working session and written summary that tests your development thesis on construction cost, schedule and site.",
      includes: [
        "Review of your investment brief and site",
        "Construction cost and schedule ranges for your concept",
        "Unit mix and design considerations for target tenants",
        "Key risks and the diligence still required",
        "Written summary and recommended next steps",
      ],
      priceNote: FEES.consultation,
      next: "If the project is viable, we prepare a development proposal covering feasibility, design management, budgeting and delivery.",
    },
    pains: [
      "Pro formas built on construction costs nobody has tested",
      "No independent control over contractor spending",
      "Timelines that slip and erode returns",
      "Reporting that wouldn't satisfy a lender or partner",
    ],
    objections: [
      { q: "Do you provide return projections?", a: "We provide construction cost, schedule and development inputs. Investment returns and advice should come from your financial advisers — we work alongside them." },
      { q: "Can you source land or deals?", a: "We evaluate sites you are considering and coordinate due diligence; we don't act as a land broker." },
      { q: "What's the minimum project size?", a: "There's no fixed minimum. Fit is confirmed in the consultation based on scope, location and your objectives." },
    ],
    steps: [
      { title: "Share your brief", body: "Capital plan, site, target product." },
      { title: "Feasibility Consultation", body: "Cost, schedule and risk tested." },
      { title: "Development proposal", body: "Scope for feasibility, design and delivery." },
      { title: "Build with control", body: "Line-item budgets and investor reporting." },
    ],
    defaultService: "development",
    formHeading: "Request a Feasibility Consultation.",
  },
];

export const funnelBySlug = (slug: string) => funnelPages.find((f) => f.slug === slug);
