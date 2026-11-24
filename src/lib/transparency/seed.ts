/**
 * WHOLLY SYNTHETIC demo data (spec 03 Task B.7, 06 §C). "Demo Accra Villa" is not a real project, client,
 * site, inspector or contractor. Every amount is a synthetic demo figure — not a BuildGhana price, fee or
 * estimate. No real photographs: evidence tiles are labelled diagrams. Loaded only by the memory adapter
 * on non-production deployments.
 */
import { createHash } from "node:crypto";
import { placeholderSvg } from "./media";
import type { AuditEvent, BudgetLine, ChangeOrder, DecisionRequest, Disbursement, Dispute, DocumentRec, Inspection, Issue, MediaAsset, MediaStage, Membership, Milestone, Organization, PaymentRequest, Project, ReportContent, ReportReview, ReportRevision, ReportStatus, Scope, SiteReport, TableName, Tables, Tenant, User, WorkPackage, Comment, ScheduleRevision, PaymentApproval, OutboxEvent } from "./types";

export const DEMO_LABEL = "Demo project — illustrative information (synthetic)";
export const DEMO_AMOUNT_NOTE = "Synthetic demo figures — not a BuildGhana price, fee or cost estimate.";
export const ATTESTATION_TEXT = "I confirm this evidence was captured from a safe position and accurately represents the stated work at the stated site and work package. This is a field report, not an engineering certification.";

const T = "t-buildghana", T2 = "t-other-demo";
const P1 = "p-demo-accra-villa", P2 = "p-demo-tema-duplex", P3 = "p-other-tenant-demo";
const at = (d: string, hhmm = "09:00") => `${d}T${hhmm}:00.000Z`; // Accra = UTC+0
const ALL: Scope[] = ["reports", "gallery", "schedule", "documents", "budget", "decisions"];

const tenants: Tenant[] = [
  { id: T, brandId: "buildghana", status: "active", createdAt: at("2026-07-01") },
  { id: T2, brandId: "other-demo", status: "active", createdAt: at("2026-07-01") },
];

const organizations: Organization[] = [
  { id: "o-bg", tenantId: T, name: "BuildGhana (demo team)", type: "delivery" },
  { id: "o-client", tenantId: T, name: "Synthetic client household (demo)", type: "client" },
  { id: "o-client-b", tenantId: T, name: "Second synthetic client (demo)", type: "client" },
  { id: "o-insp", tenantId: T, name: "Synthetic Inspection Practice (demo — not a real firm)", type: "independent_inspection" },
  { id: "o-builder", tenantId: T, name: "Synthetic Builder Ltd (demo — not a real firm)", type: "contractor" },
  { id: "o-other", tenantId: T2, name: "Other tenant client (demo)", type: "client" },
];

const u = (id: string, tenantId: string, orgId: string, name: string, title: string, staffRole: User["staffRole"], timezone: string): User =>
  ({ id, tenantId, orgId, name, title, staffRole, timezone, email: `${id.replace(/^u-/, "")}@demo.buildghana.invalid`, disabled: false, sessionsRevokedBefore: 0, mfa: "not_configured", synthetic: true });

const users: User[] = [
  u("u-ops", T, "o-bg", "Demo Ops Admin", "BuildGhana operations admin (synthetic)", "ops_admin", "Africa/Accra"),
  u("u-pm", T, "o-bg", "Demo Project Manager", "Office project manager (synthetic)", "project_manager", "Africa/Accra"),
  u("u-field", T, "o-bg", "Demo Field Supervisor", "Site supervisor (synthetic)", "field_supervisor", "Africa/Accra"),
  u("u-insp", T, "o-insp", "Demo Inspector", "Inspector (synthetic — credentials not real)", "inspector", "Africa/Accra"),
  u("u-acct", T, "o-bg", "Demo Accountant", "Project accountant (synthetic)", "accountant", "Africa/Accra"),
  u("u-builder", T, "o-builder", "Demo Builder Contact", "Contractor representative (synthetic)", "contractor", "Africa/Accra"),
  u("u-owner", T, "o-client", "Demo Owner (abroad)", "Project owner (synthetic, lives in London)", null, "Europe/London"),
  u("u-coinv", T, "o-client", "Demo Co-investor", "Family co-funder (synthetic, lives in Toronto)", null, "America/Toronto"),
  u("u-owner-b", T, "o-client-b", "Demo Owner B", "Owner of a different synthetic project", null, "Africa/Accra"),
  u("u-other-owner", T2, "o-other", "Other Tenant Owner", "Owner in a different tenant (synthetic)", null, "Africa/Accra"),
];

const projects: Project[] = [
  { id: P1, tenantId: T, clientOrgId: "o-client", code: "DEMO-ACC-01", name: "Demo Accra Villa", locationPublic: "Accra, Greater Accra Region (synthetic — no real site)", timezone: "Africa/Accra", status: "active", serviceModel: "owners_representative", reportingPolicyVersion: 1, reportingCadence: "weekly", financialVisibility: "contract_authorized", pmUserId: "u-pm", baselined: true, synthetic: true, version: 1, createdAt: at("2026-07-20") },
  { id: P2, tenantId: T, clientOrgId: "o-client-b", code: "DEMO-TEM-02", name: "Demo Tema Duplex", locationPublic: "Tema, Greater Accra Region (synthetic)", timezone: "Africa/Accra", status: "active", serviceModel: "construction_delivery", reportingPolicyVersion: 1, reportingCadence: "weekly", financialVisibility: "not_authorized", pmUserId: "u-pm", baselined: false, synthetic: true, version: 1, createdAt: at("2026-10-01") },
  { id: P3, tenantId: T2, clientOrgId: "o-other", code: "DEMO-OTH-01", name: "Other Tenant Demo House", locationPublic: "Kumasi, Ashanti Region (synthetic)", timezone: "Africa/Accra", status: "active", serviceModel: "owners_representative", reportingPolicyVersion: 1, reportingCadence: "weekly", financialVisibility: "not_authorized", pmUserId: "u-other-owner", baselined: false, synthetic: true, version: 1, createdAt: at("2026-10-01") },
];

const m = (id: string, projectId: string, userId: string, role: Membership["role"], scopes: Scope[], extra: Partial<Membership> = {}): Membership =>
  ({ id, tenantId: projectId === P3 ? T2 : T, projectId, userId, role, scopes, invitedBy: "u-ops", grantedAt: at("2026-07-21"), version: 1, ...extra });

const memberships: Membership[] = [
  m("mb-1", P1, "u-pm", "project_manager", ALL), m("mb-2", P1, "u-field", "field_supervisor", ["reports", "gallery", "schedule"]),
  m("mb-3", P1, "u-insp", "inspector", ["reports", "gallery", "schedule", "documents"]), m("mb-4", P1, "u-acct", "accountant", ["budget", "documents"]),
  m("mb-5", P1, "u-builder", "contractor", ["schedule"], { workPackageIds: ["wp-3"] }), m("mb-6", P1, "u-owner", "owner", ALL),
  m("mb-7", P1, "u-coinv", "co_owner", ["reports", "gallery", "schedule"], { invitedBy: "u-owner", grantedAt: at("2026-08-01"), invitationExpiry: "2027-08-01T00:00:00.000Z" }),
  m("mb-8", P2, "u-pm", "project_manager", ALL), m("mb-9", P2, "u-field", "field_supervisor", ["reports", "gallery", "schedule"]), m("mb-10", P2, "u-owner-b", "owner", ALL),
  m("mb-11", P3, "u-other-owner", "owner", ALL),
];

const wp = (id: string, projectId: string, trade: WorkPackage["trade"], code: string, title: string, contractorOrgId?: string): WorkPackage =>
  ({ id, tenantId: projectId === P3 ? T2 : T, projectId, trade, code, title, leadId: "u-pm", contractorOrgId });
const work_packages: WorkPackage[] = [
  wp("wp-1", P1, "site_prep", "WP-01", "Site preparation & setting out", "o-builder"), wp("wp-2", P1, "foundations", "WP-02", "Foundations", "o-builder"),
  wp("wp-3", P1, "blockwork", "WP-03", "Ground-floor blockwork & columns", "o-builder"), wp("wp-4", P1, "frame", "WP-04", "First-floor slab", "o-builder"),
  wp("wp-5", P1, "roof", "WP-05", "Roofing", "o-builder"), wp("wp-6", P1, "mep", "WP-06", "MEP rough-in & finishes", "o-builder"),
  wp("wp-t1", P2, "foundations", "WP-01", "Foundations"), wp("wp-o1", P3, "foundations", "WP-01", "Foundations"),
];

const ms = (id: string, projectId: string, workPackageId: string, phase: number, title: string, b: [string, string], f: [string, string], status: Milestone["status"], requiresInspection: boolean, extra: Partial<Milestone> = {}): Milestone =>
  ({ id, tenantId: projectId === P3 ? T2 : T, projectId, workPackageId, phase, title, baselineStart: b[0], baselineEnd: b[1], forecastStart: f[0], forecastEnd: f[1], weight: 1, status, overlays: [], requiresInspection, blockers: [], responsible: "Demo Project Manager", forecastIsCommitment: false, version: 1, ...extra });
const milestones: Milestone[] = [
  ms("ms-1", P1, "wp-1", 1, "Site preparation & setting out", ["2026-08-03", "2026-08-21"], ["2026-08-03", "2026-08-21"], "APPROVED_PROGRESS", false),
  ms("ms-2", P1, "wp-2", 2, "Foundations", ["2026-08-24", "2026-09-25"], ["2026-08-24", "2026-10-02"], "COMPLETE_VERIFIED", true, { blockers: [] }),
  ms("ms-3", P1, "wp-3", 3, "Ground-floor blockwork & columns", ["2026-09-28", "2026-11-06"], ["2026-10-05", "2026-11-27"], "UNDER_REVIEW", true, { overlays: ["DISPUTED"], blockers: ["Intermittent site water supply (synthetic)", "Block supplier delivery delay (synthetic)"] }),
  ms("ms-4", P1, "wp-4", 4, "First-floor slab", ["2026-11-09", "2026-12-11"], ["2026-11-30", "2027-01-08"], "NOT_STARTED", true),
  ms("ms-5", P1, "wp-5", 5, "Roofing", ["2026-12-14", "2027-01-22"], ["2027-01-11", "2027-02-19"], "NOT_STARTED", false),
  ms("ms-6", P1, "wp-6", 6, "MEP rough-in & finishes", ["2027-01-25", "2027-04-30"], ["2027-02-22", "2027-05-28"], "NOT_STARTED", true),
  ms("ms-t1", P2, "wp-t1", 1, "Foundations", ["2026-10-05", "2026-11-13"], ["2026-10-05", "2026-11-13"], "REPORTED_IN_PROGRESS", true),
  ms("ms-o1", P3, "wp-o1", 1, "Foundations", ["2026-10-05", "2026-11-13"], ["2026-10-05", "2026-11-13"], "REPORTED_IN_PROGRESS", true),
];

const media_assets: MediaAsset[] = [];
const syntheticBlobs: Record<string, string> = {};
const sha = (s: string) => createHash("sha256").update(s).digest("hex");
let tone = 0;
function media(reportId: string, projectId: string, code: string, revision: number, stage: MediaStage, caption: string, when: string): string {
  const id = `md-${reportId.slice(2)}-${revision}-${media_assets.filter((x) => x.reportId === reportId).length + 1}`;
  const svg = placeholderSvg({ title: caption, stage, reportCode: code, tone: tone++ });
  syntheticBlobs[`synthetic:${id}`] = svg;
  media_assets.push({
    id, tenantId: projectId === P3 ? T2 : T, projectId, reportId, revision, stage, caption, objectKey: `synthetic:${id}`, mime: "image/svg+xml",
    sizeBytes: Buffer.byteLength(svg), receivedBytes: Buffer.byteLength(svg), sha256: sha(svg), uploadState: "complete", scanStatus: "clean",
    deviceCapturedAt: null, serverReceivedAt: when, uploaderId: "u-field", provenance: "synthetic_placeholder", locationLabel: "Device-reported location not collected",
    visibilityClass: "project", createdAt: when,
  });
  return id;
}

const blank: ReportContent = { summary: "", workReported: "", quantities: [], crewCount: null, materials: "", weather: "", siteAccess: "", issues: "", safetyIssues: "", nextSteps: "", mediaIds: [] };
const site_reports: SiteReport[] = [];
const report_reviews: ReportReview[] = [];
type RevIn = Partial<ReportContent> & { day: string; media: [MediaStage, string][] };
function report(id: string, projectId: string, milestoneId: string, workPackageId: string, code: string, status: ReportStatus, revs: RevIn[], reviews: { rev: number; decision: ReportReview["decision"]; notes: string; day: string; by?: string }[]) {
  const revisions: ReportRevision[] = revs.map((r, i) => {
    const when = at(r.day, "16:30"), recv = at(r.day, "16:41");
    const mediaIds = r.media.map(([stage, cap]) => media(id, projectId, code, i + 1, stage, cap, recv));
    return { ...blank, ...r, mediaIds, revision: i + 1, capturedAt: at(r.day, "15:50"), submittedAt: when, serverReceivedAt: recv, submittedBy: "u-field", attestation: { accepted: true, text: ATTESTATION_TEXT, at: when } } as ReportRevision;
  });
  const last = revisions[revisions.length - 1];
  site_reports.push({ id, tenantId: projectId === P3 ? T2 : T, projectId, milestoneId, workPackageId, authorId: "u-field", status, revisions, draft: { ...blank, capturedAt: null, updatedAt: last.submittedAt }, createdAt: revisions[0].submittedAt, publishedAt: ["PUBLISHED", "VERIFIED", "DISPUTED"].includes(status) ? at(reviews[reviews.length - 1]?.day ?? revs[0].day, "12:00") : undefined, version: 1, synthetic: true, idempotencyKeys: [], ...(status === "DISPUTED" ? { statusBeforeDispute: "PUBLISHED" as ReportStatus } : {}) });
  reviews.forEach((rv, i) => report_reviews.push({ id: `rv-${id.slice(2)}-${i + 1}`, tenantId: projectId === P3 ? T2 : T, projectId, reportId: id, revision: rv.rev, reviewerId: rv.by ?? "u-pm", decision: rv.decision, notes: rv.notes, createdAt: at(rv.day, "11:00") }));
}

// Phase 1 — site preparation
report("r-01", P1, "ms-1", "wp-1", "R-01", "PUBLISHED", [{ day: "2026-08-07", summary: "Site cleared and topsoil stripped", workReported: "Vegetation cleared and topsoil stripped across the building footprint, per field supervisor.", weather: "Dry, hot", siteAccess: "Normal", nextSteps: "Set out building lines with the surveyor.", crewCount: 6, media: [["overview", "Cleared plot — overview"], ["after", "Topsoil stockpile"]] }],
  [{ rev: 1, decision: "approve", notes: "Dates and project match. Adequate overview.", day: "2026-08-08" }, { rev: 1, decision: "publish", notes: "Published to owner.", day: "2026-08-08" }]);
report("r-02", P1, "ms-1", "wp-1", "R-02", "PUBLISHED", [
  { day: "2026-08-19", summary: "Setting out complete", workReported: "Profile boards and building lines set out, per field supervisor.", nextSteps: "Begin excavation.", media: [["detail", "Profile board — close-up"]] },
  { day: "2026-08-20", summary: "Setting out complete (with overview)", workReported: "Profile boards and building lines set out, per field supervisor. Overview added as requested.", nextSteps: "Begin excavation.", media: [["overview", "Setting-out lines — overview"]] },
], [{ rev: 1, decision: "request_correction", notes: "Please add a wide overview showing all four corners; close-up alone is not enough.", day: "2026-08-19" }, { rev: 2, decision: "approve", notes: "Overview now present.", day: "2026-08-21" }, { rev: 2, decision: "publish", notes: "Published.", day: "2026-08-21" }]);

// Phase 2 — foundations (inspection hold point; one failed inspection, one re-inspection pass)
report("r-03", P1, "ms-2", "wp-2", "R-03", "PUBLISHED", [{ day: "2026-08-28", summary: "Trench excavation", workReported: "Foundation trenches excavated; soft ground found on the north side, per field supervisor.", issues: "Soft ground on the north side — referred to the engineer (see change order CO-001).", quantities: [{ item: "Trench excavation", qty: 42, unit: "m³", basis: "field_reported" }], media: [["overview", "Excavated trenches — overview"], ["detail", "North-side soft ground"]] }],
  [{ rev: 1, decision: "approve", notes: "Escalated soil issue to engineer.", day: "2026-08-29" }, { rev: 1, decision: "publish", notes: "Published.", day: "2026-08-29" }]);
report("r-04", P1, "ms-2", "wp-2", "R-04", "PUBLISHED", [{ day: "2026-09-09", summary: "Rebar and formwork ready for pre-pour inspection", workReported: "Footing reinforcement fixed and formwork erected, per field supervisor.", nextSteps: "Pre-pour inspection booked.", media: [["before", "Reinforcement before pour"], ["detail", "Formwork corner"]] }],
  [{ rev: 1, decision: "require_inspection", notes: "Hold point: pre-pour inspection required.", day: "2026-09-09" }, { rev: 1, decision: "publish", notes: "Published with inspection pending.", day: "2026-09-10" }]);
report("r-05", P1, "ms-2", "wp-2", "R-05", "VERIFIED", [
  { day: "2026-09-15", summary: "Rebar cover corrected", workReported: "Spacer blocks added to achieve cover, per field supervisor.", media: [["overview", "Footings after rework — overview"]] },
  { day: "2026-09-16", summary: "Rebar cover corrected (close-ups added)", workReported: "Spacer blocks added to achieve cover, per field supervisor. Close-ups of spacers added.", media: [["detail", "Spacer blocks — close-up"], ["overview", "Footings after rework — overview"]] },
], [{ rev: 1, decision: "request_correction", notes: "Need close-ups of the spacer blocks for the re-inspection.", day: "2026-09-15" }, { rev: 2, decision: "require_inspection", notes: "Ready for re-inspection.", day: "2026-09-17" }, { rev: 2, decision: "publish", notes: "Published.", day: "2026-09-18" }]);
report("r-06", P1, "ms-2", "wp-2", "R-06", "PUBLISHED", [{ day: "2026-09-30", summary: "Footings poured and cured", workReported: "Concrete poured after re-inspection pass; curing in progress, per field supervisor.", materials: "Ready-mix delivery ticket photographed (synthetic).", media: [["after", "Footings after pour"]] }],
  [{ rev: 1, decision: "approve", notes: "Matches inspection outcome.", day: "2026-10-01" }, { rev: 1, decision: "publish", notes: "Published.", day: "2026-10-01" }]);

// Phase 3 — blockwork (delayed work package; one disputed report; one correction; one in the review queue)
report("r-07", P1, "ms-3", "wp-3", "R-07", "PUBLISHED", [{ day: "2026-10-08", summary: "Blockwork started", workReported: "First courses laid on the north wall, per field supervisor.", quantities: [{ item: "Blockwork", qty: 14, unit: "m²", basis: "field_reported" }], media: [["during", "First courses — north wall"]] }],
  [{ rev: 1, decision: "approve", notes: "OK.", day: "2026-10-09" }, { rev: 1, decision: "publish", notes: "Published.", day: "2026-10-09" }]);
report("r-08", P1, "ms-3", "wp-3", "R-08", "PUBLISHED", [{ day: "2026-10-15", summary: "Work paused — water shortage", workReported: "Half-shift only; no mixing water from mid-day, per field supervisor.", issues: "Water shortage delayed the second half of the shift. Block delivery postponed by supplier.", media: [["overview", "Paused work area"]] }],
  [{ rev: 1, decision: "approve", notes: "Delay logged; forecast to be revised.", day: "2026-10-16" }, { rev: 1, decision: "publish", notes: "Published.", day: "2026-10-16" }]);
report("r-09", P1, "ms-3", "wp-3", "R-09", "DISPUTED", [{ day: "2026-10-22", summary: "Ground-floor walls progressing", workReported: "Walls to lintel level on the east side, per field supervisor; not independently measured.", quantities: [{ item: "Blockwork", qty: 37, unit: "m²", basis: "field_reported" }], media: [["during", "East wall — during"], ["detail", "Corner bond"]] }],
  [{ rev: 1, decision: "approve", notes: "OK.", day: "2026-10-23" }, { rev: 1, decision: "publish", notes: "Published.", day: "2026-10-23" }]);
report("r-10", P1, "ms-3", "wp-3", "R-10", "PUBLISHED", [
  { day: "2026-10-29", summary: "Columns cast", workReported: "Ground-floor columns cast, per field supervisor.", media: [["after", "Columns — after"]] },
  { day: "2026-10-30", summary: "Columns cast (correct work package)", workReported: "Ground-floor columns cast, per field supervisor. Re-filed under the blockwork & columns package.", media: [["after", "Columns — after"], ["overview", "Column line — overview"]] },
], [{ rev: 1, decision: "request_correction", notes: "Filed with the wrong caption/package and no overview. Please resubmit with an overview.", day: "2026-10-29" }, { rev: 2, decision: "approve", notes: "Correct now.", day: "2026-10-31" }, { rev: 2, decision: "publish", notes: "Published.", day: "2026-10-31" }]);
report("r-11", P1, "ms-3", "wp-3", "R-11", "OFFICE_REVIEWED", [{ day: "2026-11-12", summary: "Window and door openings formed", workReported: "Openings formed on the south elevation, per field supervisor.", nextSteps: "Confirm opening dimensions against drawing A-101 Rev C.", media: [["during", "South elevation openings"]] }],
  [{ rev: 1, decision: "approve", notes: "Awaiting dimension check before publication.", day: "2026-11-13" }]);
report("r-12", P1, "ms-3", "wp-3", "R-12", "SUBMITTED", [{ day: "2026-11-19", summary: "Ground-floor walls", workReported: "37 m² of blockwork, per field supervisor; not independently measured.", quantities: [{ item: "Blockwork", qty: 37, unit: "m²", basis: "field_reported" }], issues: "Water shortage delayed the second half of the shift.", nextSteps: "Confirm wall opening dimensions and arrange supervisor review.", media: [["overview", "Ground-floor walls — overview"], ["detail", "Wall opening — detail"]] }], []);

// Other projects (for cross-project / cross-tenant denial tests)
report("r-t1", P2, "ms-t1", "wp-t1", "T-01", "PUBLISHED", [{ day: "2026-10-20", summary: "Tema excavation", workReported: "Excavation in progress (synthetic).", media: [["overview", "Tema excavation"]] }], [{ rev: 1, decision: "publish", notes: "Published.", day: "2026-10-21" }]);
report("r-o1", P3, "ms-o1", "wp-o1", "O-01", "PUBLISHED", [{ day: "2026-10-20", summary: "Other tenant excavation", workReported: "Excavation (synthetic).", media: [["overview", "Other tenant excavation"]] }], [{ rev: 1, decision: "publish", notes: "Published.", day: "2026-10-21", by: "u-other-owner" }]);

const inspections: Inspection[] = [
  { id: "in-1", tenantId: T, projectId: P1, milestoneId: "ms-2", inspectorId: "u-insp", independence: "independent_third_party", credentialReference: "Synthetic demo — no real registration. Real inspector credentials must be confirmed by an admin.", credentialVerified: false, result: "fail", scope: "Pre-pour check of footing reinforcement and formwork (synthetic)", methods: "Visual check and tape measurement of cover at sampled locations (synthetic)", limitations: "Sampled locations only; no material testing. Synthetic demo record.", reportIds: ["r-04"], inspectedAt: at("2026-09-10", "10:15"), signature: "typed: Demo Inspector", createdAt: at("2026-09-10", "13:00"), synthetic: true },
  { id: "in-2", tenantId: T, projectId: P1, milestoneId: "ms-2", inspectorId: "u-insp", independence: "independent_third_party", credentialReference: "Synthetic demo — no real registration. Real inspector credentials must be confirmed by an admin.", credentialVerified: false, result: "pass", scope: "Re-inspection of reinforcement cover after rework (synthetic)", methods: "Visual check and tape measurement at the previously failed locations (synthetic)", limitations: "Does not cover concrete strength; cube test results not part of this record. Synthetic demo record.", reportIds: ["r-05"], inspectedAt: at("2026-09-18", "09:40"), signature: "typed: Demo Inspector", createdAt: at("2026-09-18", "12:00"), synthetic: true },
];

const disputes: Dispute[] = [
  { id: "dp-1", tenantId: T, projectId: P1, reportId: "r-09", raisedBy: "u-owner", reason: "The corner bond close-up doesn't show the whole corner. Can the office confirm the bonding pattern before the next payment?", status: "open", createdAt: at("2026-10-25", "19:05") },
];

const issues: Issue[] = [
  { id: "is-1", tenantId: T, projectId: P1, milestoneId: "ms-2", title: "Pre-pour inspection failed: reinforcement cover (synthetic)", severity: "high", ownerId: "u-pm", status: "closed", createdAt: at("2026-09-10", "13:05") },
  { id: "is-2", tenantId: T, projectId: P1, milestoneId: "ms-3", title: "Site water supply interruptions delaying blockwork (synthetic)", severity: "medium", ownerId: "u-pm", status: "open", dueAt: "2026-11-28", createdAt: at("2026-10-16") },
];

const change_orders: ChangeOrder[] = [
  { id: "co-1", tenantId: T, projectId: P1, number: "CO-001", description: "Deepen north-side footings after soft ground found during excavation (synthetic).", sourceDoc: "Engineer's instruction EI-01 (synthetic placeholder)", proposedDeltaMinor: 650_000, approvedDeltaMinor: 650_000, currency: "GHS", costCode: "02", status: "APPROVED", approvedAt: at("2026-09-02", "18:20"), approvedBy: "u-owner", createdAt: at("2026-08-31"), version: 2 },
  { id: "co-2", tenantId: T, projectId: P1, number: "CO-002", description: "Owner selection: aluminium instead of steel window frames (synthetic).", sourceDoc: "Supplier quotation Q-17 (synthetic placeholder)", proposedDeltaMinor: 1_400_000, approvedDeltaMinor: null, currency: "GHS", costCode: "06", status: "AWAITING_OWNER", createdAt: at("2026-11-18"), version: 1 },
];

const decision_requests: DecisionRequest[] = [
  { id: "dr-1", tenantId: T, projectId: P1, type: "change_order", title: "Approve CO-001: deepen north-side footings", description: "The engineer recommends deeper footings on the north side after soft ground was found (synthetic).", requestedBy: "u-pm", assignedTo: "u-owner", deadline: "2026-09-04", status: "APPROVED", payloadVersion: 1, changeOrderId: "co-1", votes: [{ userId: "u-owner", action: "approve", comments: "Approved — please keep the receipts.", actedAt: at("2026-09-02", "18:20"), payloadVersion: 1, confirmation: "DEMO-ACC-01" }], createdAt: at("2026-08-31"), version: 2 },
  { id: "dr-2", tenantId: T, projectId: P1, type: "change_order", title: "Decide CO-002: window frame material", description: "Aluminium frames instead of steel. Approving adds the change to the approved budget; it does not release any payment (synthetic).", requestedBy: "u-pm", assignedTo: "u-owner", deadline: "2026-12-02", status: "OPEN", payloadVersion: 1, changeOrderId: "co-2", votes: [], createdAt: at("2026-11-18"), version: 1 },
  { id: "dr-3", tenantId: T, projectId: P1, type: "milestone_acceptance", title: "Acknowledge the revised blockwork forecast (+21 days)", description: "Blockwork is now forecast to finish 21 days after the baseline because of water supply and block delivery delays. This is a forecast, not a commitment (synthetic).", requestedBy: "u-pm", assignedTo: "u-owner", deadline: "2026-11-30", status: "OPEN", payloadVersion: 1, votes: [], createdAt: at("2026-11-17"), version: 1 },
];

const bl = (id: string, costCode: string, label: string, baselineMinor: number, committedMinor: number): BudgetLine => ({ id, tenantId: T, projectId: P1, costCode, label, baselineMinor, committedMinor, currency: "GHS" });
const budget_lines: BudgetLine[] = [
  bl("bl-1", "01", "Site preparation & setting out", 1_800_000, 1_800_000), bl("bl-2", "02", "Foundations", 9_500_000, 10_150_000),
  bl("bl-3", "03", "Ground-floor blockwork & columns", 12_000_000, 12_000_000), bl("bl-4", "04", "First-floor slab", 11_000_000, 0),
  bl("bl-5", "05", "Roofing", 8_500_000, 0), bl("bl-6", "06", "MEP rough-in & finishes", 21_000_000, 0),
];

const hist = (steps: [PaymentRequest["status"], string, string][]) => steps.map(([status, by, day]) => ({ status, by, at: at(day, "12:00"), note: "" }));
const pr = (id: string, number: string, milestoneId: string, amountMinor: number, costCode: string, status: PaymentRequest["status"], steps: [PaymentRequest["status"], string, string][]): PaymentRequest =>
  ({ id, tenantId: T, projectId: P1, milestoneId, number, amountMinor, currency: "GHS", payee: "Synthetic Builder Ltd (demo)", costCode, supportingEvidence: [`Invoice ${number}-INV (synthetic placeholder)`, "Linked published site reports"], status, submittedBy: "u-builder", history: hist(steps), createdAt: at(steps[0][2], "12:00"), version: steps.length });
const payment_requests: PaymentRequest[] = [
  pr("pr-1", "PR-001", "ms-1", 1_800_000, "01", "RECONCILED", [["SUBMITTED", "u-builder", "2026-08-22"], ["EVIDENCE_REVIEW", "u-pm", "2026-08-23"], ["AWAITING_OWNER_APPROVAL", "u-pm", "2026-08-24"], ["APPROVED_FOR_PAYMENT", "u-owner", "2026-08-25"], ["PAID_PENDING_RECONCILIATION", "u-acct", "2026-08-27"], ["RECONCILED", "u-acct", "2026-08-31"]]),
  pr("pr-2", "PR-002", "ms-2", 5_000_000, "02", "RECONCILED", [["SUBMITTED", "u-builder", "2026-09-19"], ["EVIDENCE_REVIEW", "u-pm", "2026-09-19"], ["AWAITING_OWNER_APPROVAL", "u-pm", "2026-09-21"], ["APPROVED_FOR_PAYMENT", "u-owner", "2026-09-22"], ["PAID_PENDING_RECONCILIATION", "u-acct", "2026-09-24"], ["RECONCILED", "u-acct", "2026-09-30"]]),
  pr("pr-3", "PR-003", "ms-2", 5_150_000, "02", "PAID_PENDING_RECONCILIATION", [["SUBMITTED", "u-builder", "2026-10-03"], ["EVIDENCE_REVIEW", "u-pm", "2026-10-04"], ["AWAITING_OWNER_APPROVAL", "u-pm", "2026-10-05"], ["APPROVED_FOR_PAYMENT", "u-owner", "2026-10-06"], ["PAID_PENDING_RECONCILIATION", "u-acct", "2026-10-09"]]),
  pr("pr-4", "PR-004", "ms-3", 4_000_000, "03", "APPROVED_FOR_PAYMENT", [["SUBMITTED", "u-builder", "2026-10-24"], ["EVIDENCE_REVIEW", "u-pm", "2026-10-26"], ["AWAITING_OWNER_APPROVAL", "u-pm", "2026-10-27"], ["APPROVED_FOR_PAYMENT", "u-owner", "2026-10-28"]]),
  pr("pr-5", "PR-005", "ms-3", 3_000_000, "03", "AWAITING_OWNER_APPROVAL", [["SUBMITTED", "u-builder", "2026-11-14"], ["EVIDENCE_REVIEW", "u-pm", "2026-11-15"], ["AWAITING_OWNER_APPROVAL", "u-pm", "2026-11-17"]]),
  pr("pr-6", "PR-006", "ms-3", 2_000_000, "03", "SUBMITTED", [["SUBMITTED", "u-builder", "2026-11-20"]]),
];

const payment_approvals: PaymentApproval[] = payment_requests.flatMap((p) => p.history.filter((h) => h.status === "AWAITING_OWNER_APPROVAL" || h.status === "APPROVED_FOR_PAYMENT").map((h, i) => ({ id: `pa-${p.id.slice(3)}-${i}`, tenantId: T, projectId: P1, paymentRequestId: p.id, approverId: h.by, stage: h.status === "AWAITING_OWNER_APPROVAL" ? "evidence_review" as const : "owner_authorization" as const, decision: "approve" as const, reason: h.status === "AWAITING_OWNER_APPROVAL" ? "Evidence matches published reports (synthetic)." : "Authorised (synthetic).", createdAt: h.at })));

const disbursements: Disbursement[] = [
  { id: "db-1", tenantId: T, projectId: P1, paymentRequestId: "pr-1", paidMinor: 1_800_000, currency: "GHS", paidAt: "2026-08-27", source: "manual_bank_evidence", sourceReference: "SYNTH-BANK-0001", evidenceDocId: "doc-6", recordedBy: "u-acct", recordedAt: at("2026-08-27"), reconciledBy: "u-acct", reconciledAt: at("2026-08-31") },
  { id: "db-2", tenantId: T, projectId: P1, paymentRequestId: "pr-2", paidMinor: 5_000_000, currency: "GHS", paidAt: "2026-09-24", source: "manual_bank_evidence", sourceReference: "SYNTH-BANK-0002", evidenceDocId: "doc-6", recordedBy: "u-acct", recordedAt: at("2026-09-24"), reconciledBy: "u-acct", reconciledAt: at("2026-09-30") },
  { id: "db-3", tenantId: T, projectId: P1, paymentRequestId: "pr-3", paidMinor: 5_150_000, currency: "GHS", paidAt: "2026-10-09", source: "manual_bank_evidence", sourceReference: "SYNTH-BANK-0003", evidenceDocId: "doc-6", recordedBy: "u-acct", recordedAt: at("2026-10-09") },
];

const doc = (id: string, documentType: DocumentRec["documentType"], title: string, revisionLabel: string, author: string, issuedAt: string, accessClass: DocumentRec["accessClass"], approvalState: DocumentRec["approvalState"] = "published", version = 1): DocumentRec =>
  ({ id, tenantId: T, projectId: P1, documentType, title, version, revisionLabel, author, issuedAt, accessClass, approvalState, synthetic: true });
const documents: DocumentRec[] = [
  doc("doc-1", "drawing", "A-101 Ground floor plan (synthetic placeholder)", "Rev C", "Demo architect (synthetic)", "2026-07-15", "project"),
  doc("doc-1b", "drawing", "A-101 Ground floor plan (synthetic placeholder)", "Rev B", "Demo architect (synthetic)", "2026-06-30", "project", "superseded"),
  doc("doc-2", "drawing", "S-201 Foundation layout (synthetic placeholder)", "Rev B", "Demo engineer (synthetic)", "2026-09-01", "project"),
  doc("doc-3", "inspection_report", "INS-1 Pre-pour inspection — fail (synthetic)", "v1", "Demo Inspector", "2026-09-10", "project"),
  doc("doc-4", "inspection_report", "INS-2 Re-inspection — pass (synthetic)", "v1", "Demo Inspector", "2026-09-18", "project"),
  doc("doc-5", "invoice", "Contractor invoices PR-001…PR-006 (synthetic placeholders)", "v1", "Synthetic Builder Ltd (demo)", "2026-11-20", "financial"),
  doc("doc-6", "bank_evidence", "Bank evidence lines SYNTH-BANK-0001…0003 (synthetic)", "v1", "Demo Accountant", "2026-10-09", "restricted"),
];

const comments: Comment[] = [
  { id: "cm-1", tenantId: T, projectId: P1, parentRef: "report:r-08", authorId: "u-owner", text: "Is the water issue likely to continue next week?", visibilityClass: "project", createdAt: at("2026-10-16", "20:10") },
  { id: "cm-2", tenantId: T, projectId: P1, parentRef: "report:r-08", authorId: "u-pm", text: "We've arranged a water tanker as backup; the forecast will be updated (synthetic).", visibilityClass: "project", createdAt: at("2026-10-17", "08:30") },
];

const schedule_revisions: ScheduleRevision[] = [
  { id: "sr-1", tenantId: T, projectId: P1, milestoneId: "ms-2", revision: 1, kind: "forecast", from: { start: "2026-08-24", end: "2026-09-25" }, to: { start: "2026-08-24", end: "2026-10-02" }, reason: "Rework after failed pre-pour inspection (synthetic).", approvedBy: "u-pm", createdAt: at("2026-09-11") },
  { id: "sr-2", tenantId: T, projectId: P1, milestoneId: "ms-3", revision: 1, kind: "forecast", from: { start: "2026-09-28", end: "2026-11-06" }, to: { start: "2026-10-05", end: "2026-11-27" }, reason: "Water supply interruptions and block delivery delay (synthetic).", approvedBy: "u-pm", createdAt: at("2026-11-17") },
];

const audit_events: AuditEvent[] = [];
const outbox_events: OutboxEvent[] = [];
// Seed history into the audit log so the demo shows a realistic trail.
for (const r of report_reviews) if (r.tenantId === T) audit_events.push({ id: `ae-${r.id}`, tenantId: T, projectId: r.projectId, actorId: r.reviewerId, actorRole: "project_manager", action: `report.${r.decision}`, objectType: "site_report", objectId: r.reportId, occurredAt: r.createdAt, detail: { revision: r.revision, synthetic: true } });
for (const i of inspections) audit_events.push({ id: `ae-${i.id}`, tenantId: T, projectId: P1, actorId: i.inspectorId, actorRole: "inspector", action: `inspection.${i.result}`, objectType: "milestone", objectId: i.milestoneId, occurredAt: i.createdAt, detail: { synthetic: true } });
audit_events.push({ id: "ae-co-1", tenantId: T, projectId: P1, actorId: "u-owner", actorRole: "owner", action: "change_order.approve", objectType: "change_order", objectId: "co-1", occurredAt: at("2026-09-02", "18:20"), oldVersion: 1, newVersion: 2, detail: { synthetic: true } });
audit_events.sort((a, b) => a.occurredAt.localeCompare(b.occurredAt));

export function buildSeed(): { [K in TableName]: Tables[K][] } {
  return structuredClone({
    tenants, organizations, users, memberships, projects, work_packages, milestones, site_reports, media_assets, report_reviews, inspections, disputes,
    decision_requests, change_orders, budget_lines, payment_requests, payment_approvals, disbursements, documents, issues, comments, schedule_revisions,
    outbox_events, audit_events,
  });
}

/** Synthetic evidence tiles (SVG diagrams), keyed by object key. Hashes in media_assets match these bytes. */
export function seedBlobs(): Record<string, string> { return { ...syntheticBlobs }; }

/** Personas offered on the demo login screen (synthetic users only). */
export const demoPersonas: { userId: string; label: string; lands: string }[] = [
  { userId: "u-owner", label: "Owner (abroad) — Demo Accra Villa", lands: "/portal/projects" },
  { userId: "u-coinv", label: "Co-investor (gallery/schedule only)", lands: "/portal/projects" },
  { userId: "u-field", label: "Field supervisor (phone)", lands: "/field/projects" },
  { userId: "u-pm", label: "Office project manager / reviewer", lands: "/office" },
  { userId: "u-insp", label: "Inspector (synthetic)", lands: "/office/inspections" },
  { userId: "u-acct", label: "Accountant", lands: "/office/financials" },
  { userId: "u-builder", label: "Contractor (one work package)", lands: "/portal/projects" },
  { userId: "u-ops", label: "Operations admin", lands: "/office" },
  { userId: "u-owner-b", label: "Owner of a different project (IDOR test)", lands: "/portal/projects" },
  { userId: "u-other-owner", label: "Owner in another tenant (IDOR test)", lands: "/portal/projects" },
];
