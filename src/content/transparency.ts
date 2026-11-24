/**
 * /project-transparency copy (Phase 5 spec 01 §E). Answer-first and deliberately limited: nothing here claims
 * fund safety, guaranteed outcomes, certified inspectors or real client results. The portal is a pilot; the
 * public preview uses a wholly synthetic demo project.
 */
import type { Faq } from "./services";

export const tpFaqs: Faq[] = [
  { q: "Can I follow my building project from outside Ghana?", a: "Yes. Clients with an active BuildGhana project portal can review the updates, photos, milestones and decisions their project team has published, anywhere they have a secure internet connection. Each update shows whether it was reported, reviewed or independently inspected." },
  { q: "Does uploading a photo prove the work was done correctly?", a: "No. Photos and video document what someone reported at a particular time. They do not replace engineering inspections, material testing or required professional sign-off. The portal distinguishes site reports from qualified reviews and outstanding issues." },
  { q: "Will I see how money has been used?", a: "Where financial reporting is part of your signed service agreement, the portal can show approved budgets, change orders, payment requests and documented actual payments. A payment request is not recorded as paid until supported by reconciliation evidence." },
  { q: "Can my family member or investor see the project?", a: "Yes, when the project owner authorizes access. You can give a collaborator limited access to selected reports and project categories, and revoke access when needed. Financial and sensitive documentation remain restricted by default." },
  { q: "Can I access it from Ghana?", a: "Yes. The portal is designed for mobile connections and works for owners living in Ghana as well as those abroad; upload speeds and network conditions can vary, so field reporting supports retries and resumable uploads." },
];

export const tpSteps = [
  { icon: "camera", title: "The field team captures", body: "A site supervisor files a dated report from their phone: overview and close-up photos or video, work reported, crew count (never names), materials, weather and issues. A safety checklist comes first — no photos from ladders, scaffolds or roofs." },
  { icon: "doc", title: "The office reviews", body: "A project manager who didn't write the report checks it against the plan. Weak evidence goes back for correction; the original stays on record. Only reviewed reports are published to you." },
  { icon: "shield", title: "Hold points are inspected", body: "Where the work needs it — before a slab pour, before services are covered — a qualified person records what they checked, how, and what they could not check. Independence is shown, not assumed." },
  { icon: "lock", title: "You see it in a private portal", body: "Milestones with baseline vs current forecast, published reports with their evidence state, drawings and their revisions, decisions awaiting you, and — where your agreement includes it — the budget and payment ledger." },
] as const;

export const tpSections = [
  { title: "Drawings, schedules and change decisions", body: "Documents keep their revision history; superseded drawings are marked, not deleted. Schedule slips show the original date, the current forecast and the reason. Change orders come to you as a decision with the source quote — approving one adjusts the approved budget, it never releases money." },
  { title: "Payment visibility, authorisations and reconciled actuals", body: "Requested, authorised, disbursed and reconciled are shown as four separate figures and never added together. A payment shows as paid only after it is matched to bank or payment-system evidence. The portal is a reporting ledger — not a wallet, bank or escrow — and never moves money." },
  { title: "For diaspora, returnees and Ghana-based owners", body: "Times show in your own time zone. Pages are built for phones and patchy connections. You can invite a family member or co-funder with limited access — reports and schedule only, say — and revoke it at any time." },
] as const;

export const tpLimits = [
  "A photo shows what was reported at a moment. It does not prove workmanship, materials or structural adequacy.",
  "\"Office reviewed\" means a BuildGhana reviewer checked the report. It is not an engineering sign-off.",
  "\"Inspected\" applies only to the scope and method the inspector recorded, with their stated limitations.",
  "Location and capture time from a phone are recorded as device-reported, not certified.",
  "Schedule forecasts are estimates, not commitments. Budget figures come from your agreement and recorded evidence only.",
  "The portal does not hold, protect or guarantee funds, and it does not replace legal, engineering or regulatory approvals.",
];
