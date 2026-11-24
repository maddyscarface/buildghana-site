/**
 * Transparency service layer: every read and mutation goes through here with the acting user.
 * Order on every call: tenant + project grant → action permission → object ownership → state transition →
 * write → audit event (+ neutral outbox notification). Unknown or forbidden objects both return 404 so ids
 * cannot be probed across projects or tenants.
 */
import { createHash, randomUUID } from "node:crypto";
import { buildSeed, seedBlobs, ATTESTATION_TEXT } from "./seed";
import { ConflictError, MemoryStore, SupabaseStore, type TransparencyStore } from "./store";
import { tpConfig } from "./config";
import { can, canGrantRole, grantFor, type Action, type Grant } from "./rbac";
import { assertTransition, clientVisibleStatuses, evidenceState, milestoneTransitions, paymentTransitions, reportTransitions, TransitionError } from "./states";
import { summarizeLedger, validateDisbursement } from "./ledger";
import { CHUNK_BYTES, LIMITS, MAX_MEDIA_PER_REPORT, declaredKind, sniff } from "./media";
import type { AuditEvent, ChangeOrder, DecisionRequest, Disbursement, Inspection, MediaAsset, MediaStage, Membership, Milestone, OutboxEvent, PaymentRequest, Project, Quantity, ReportContent, ReportReview, ReviewDecision, Scope, SiteReport, User } from "./types";
import { scopes as ALL_SCOPES } from "./types";

export class ServiceError extends Error { constructor(public status: number, message: string) { super(message); } }
const notFound = () => new ServiceError(404, "Not found");
const forbidden = (m = "Your role cannot do this") => new ServiceError(403, m);
const bad = (m: string) => new ServiceError(400, m);
const conflict = (m: string) => new ServiceError(409, m);

type G = typeof globalThis & { __bgTpStore?: TransparencyStore };
export function getStore(): TransparencyStore {
  const g = globalThis as G;
  if (!g.__bgTpStore) g.__bgTpStore = tpConfig().storeKind === "supabase" ? new SupabaseStore() : new MemoryStore(buildSeed(), seedBlobs());
  return g.__bgTpStore;
}
/** Tests + admin "reset demo". */
export function resetStore() { (globalThis as G).__bgTpStore = new MemoryStore(buildSeed(), seedBlobs()); }

const now = () => new Date().toISOString();
const id = (p: string) => `${p}-${randomUUID().slice(0, 8)}`;
const clip = (s: unknown, n: number) => (typeof s === "string" ? s.trim().slice(0, n) : "");
const isDate = (s: unknown): s is string => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s));
const isStaff = (g: Grant) => ["ops_admin", "project_manager", "field_supervisor", "inspector", "accountant"].includes(g.role);

export type Ctx = { user: User; project: Project; grant: Grant };

async function audit(ctx: { user: User; grant?: Grant; project?: Project }, action: string, objectType: string, objectId: string, extra: Partial<AuditEvent> = {}) {
  await getStore().insert("audit_events", { id: id("ae"), tenantId: ctx.user.tenantId, projectId: ctx.project?.id, actorId: ctx.user.id, actorRole: ctx.grant?.role ?? ctx.user.staffRole ?? "client", action, objectType, objectId, occurredAt: now(), ...extra });
}

/** Resolve project + grant or throw 404 (no existence leak). */
export async function projectCtx(user: User, projectId: string, action: Action = "project.view", ipHash?: string): Promise<Ctx> {
  const s = getStore();
  const project = await s.get("projects", projectId);
  const grant = grantFor(user, project, project ? await s.list("memberships", { projectId: project.id }) : []);
  if (!project || !grant) {
    if (project && project.tenantId === user.tenantId) await audit({ user }, "access.denied", "project", projectId, { ipHash, detail: { action } });
    throw notFound();
  }
  if (!can(grant, action, project)) {
    await audit({ user, grant, project }, "access.denied", "project", projectId, { ipHash, detail: { action } });
    throw action === "project.view" ? notFound() : forbidden();
  }
  return { user, project, grant };
}

export async function listMyProjects(user: User) {
  const s = getStore();
  const all = (await s.list("projects")).filter((p) => p.tenantId === user.tenantId);
  const out: { project: Project; grant: Grant }[] = [];
  for (const p of all) {
    const g = grantFor(user, p, await s.list("memberships", { projectId: p.id }));
    if (g && can(g, "project.view", p)) out.push({ project: p, grant: g });
  }
  return out;
}

// ───────────────────────── Visibility ─────────────────────────

export async function visibleReports(ctx: Ctx): Promise<SiteReport[]> {
  const all = await getStore().list("site_reports", { projectId: ctx.project.id });
  if (can(ctx.grant, "reports.view_all")) {
    // Field supervisors see their own drafts plus all submitted work; staff reviewers see everything but other people's drafts.
    return all.filter((r) => r.status !== "DRAFT" || r.authorId === ctx.user.id);
  }
  if (!can(ctx.grant, "reports.view_published", ctx.project)) return [];
  const wp = ctx.grant.role === "contractor" ? ctx.grant.membership?.workPackageIds ?? [] : null;
  return all.filter((r) => clientVisibleStatuses.includes(r.status) && (!wp || wp.includes(r.workPackageId)));
}

/** Media is visible only through a visible report (or to its uploader), on the same tenant + project. */
export async function mediaAccess(user: User, mediaId: string): Promise<{ asset: MediaAsset; ctx: Ctx }> {
  const s = getStore();
  const asset = await s.get("media_assets", mediaId);
  if (!asset || asset.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, asset.projectId).catch(() => { throw notFound(); });
  const report = await s.get("site_reports", asset.reportId);
  if (!report || report.projectId !== ctx.project.id) throw notFound();
  if (asset.uploaderId === user.id) return { asset, ctx };
  if (asset.uploadState !== "complete") throw notFound();
  if (asset.visibilityClass === "staff_only" && !isStaff(ctx.grant)) throw notFound();
  const vis = await visibleReports(ctx);
  const r = vis.find((x) => x.id === report.id);
  if (!r) throw notFound();
  const staff = can(ctx.grant, "reports.view_all");
  if (!staff && !can(ctx.grant, "gallery.view", ctx.project) && !can(ctx.grant, "reports.view_published", ctx.project)) throw notFound();
  // Clients only see media attached to submitted revisions, never the working draft.
  const inRevision = r.revisions.some((rev) => rev.mediaIds.includes(asset.id));
  if (!staff && !inRevision) throw notFound();
  return { asset, ctx };
}

// ───────────────────────── Field reports ─────────────────────────

const blankContent = (): ReportContent => ({ summary: "", workReported: "", quantities: [], crewCount: null, materials: "", weather: "", siteAccess: "", issues: "", safetyIssues: "", nextSteps: "", mediaIds: [] });

export async function createDraft(user: User, input: { projectId: string; milestoneId: string; confirmProjectCode: string; idempotencyKey?: string }) {
  const ctx = await projectCtx(user, input.projectId);
  if (!can(ctx.grant, "report.create")) throw forbidden();
  if (input.confirmProjectCode !== ctx.project.code) throw bad("Project code does not match. Check you selected the right project before uploading.");
  const s = getStore();
  const ms = await s.get("milestones", input.milestoneId);
  if (!ms || ms.projectId !== ctx.project.id) throw notFound();
  if (input.idempotencyKey) {
    const existing = (await s.list("site_reports", { projectId: ctx.project.id, authorId: user.id })).find((r) => r.idempotencyKeys.includes(`create:${input.idempotencyKey}`));
    if (existing) return existing;
  }
  const r: SiteReport = {
    id: id("r"), tenantId: ctx.project.tenantId, projectId: ctx.project.id, milestoneId: ms.id, workPackageId: ms.workPackageId, authorId: user.id,
    status: "DRAFT", revisions: [], draft: { ...blankContent(), capturedAt: null, updatedAt: now() }, createdAt: now(), version: 1, synthetic: true,
    idempotencyKeys: input.idempotencyKey ? [`create:${input.idempotencyKey}`] : [],
  };
  await s.insert("site_reports", r);
  await audit(ctx, "report.draft_created", "site_report", r.id);
  return r;
}

async function ownEditableReport(user: User, reportId: string) {
  const s = getStore();
  const r = await s.get("site_reports", reportId);
  if (!r || r.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, r.projectId);
  if (!can(ctx.grant, "report.create") || r.authorId !== user.id) throw notFound();
  if (r.status !== "DRAFT" && r.status !== "NEEDS_CORRECTION") throw conflict("Submitted evidence can't be edited. Corrections create a new revision when the office returns the report.");
  return { r, ctx };
}

function cleanQuantities(q: unknown): Quantity[] {
  if (!Array.isArray(q)) return [];
  return q.slice(0, 10).map((x) => x as Record<string, unknown>).filter((x) => clip(x.item, 80) && Number.isFinite(Number(x.qty)) && Number(x.qty) >= 0)
    .map((x) => ({ item: clip(x.item, 80), qty: Math.round(Number(x.qty) * 100) / 100, unit: clip(x.unit, 12) || "unit", basis: "field_reported" as const }));
}

export async function updateDraft(user: User, reportId: string, patch: Partial<ReportContent> & { capturedAt?: string | null }, version?: number) {
  const { r, ctx } = await ownEditableReport(user, reportId);
  const d = r.draft;
  const next = {
    ...d,
    summary: patch.summary !== undefined ? clip(patch.summary, 140) : d.summary,
    workReported: patch.workReported !== undefined ? clip(patch.workReported, 2000) : d.workReported,
    quantities: patch.quantities !== undefined ? cleanQuantities(patch.quantities) : d.quantities,
    crewCount: patch.crewCount !== undefined ? (patch.crewCount === null || Number.isNaN(Number(patch.crewCount)) ? null : Math.max(0, Math.min(500, Math.round(Number(patch.crewCount))))) : d.crewCount,
    materials: patch.materials !== undefined ? clip(patch.materials, 1000) : d.materials,
    weather: patch.weather !== undefined ? clip(patch.weather, 200) : d.weather,
    siteAccess: patch.siteAccess !== undefined ? clip(patch.siteAccess, 200) : d.siteAccess,
    issues: patch.issues !== undefined ? clip(patch.issues, 1500) : d.issues,
    safetyIssues: patch.safetyIssues !== undefined ? clip(patch.safetyIssues, 1000) : d.safetyIssues,
    nextSteps: patch.nextSteps !== undefined ? clip(patch.nextSteps, 1000) : d.nextSteps,
    capturedAt: patch.capturedAt !== undefined ? (patch.capturedAt && !Number.isNaN(Date.parse(patch.capturedAt)) ? new Date(patch.capturedAt).toISOString() : null) : d.capturedAt,
    updatedAt: now(),
  };
  try {
    const latest = await getStore().get("site_reports", r.id);
    next.mediaIds = latest?.draft.mediaIds ?? next.mediaIds; // media list is owned by the upload flow
    const out = await getStore().update("site_reports", r.id, { draft: next }, version);
    await audit(ctx, "report.draft_saved", "site_report", r.id, { oldVersion: r.version, newVersion: out.version });
    return out;
  } catch (e) { if (e instanceof ConflictError) throw conflict(e.message); throw e; }
}

export async function initMedia(user: User, reportId: string, input: { stage: MediaStage; caption?: string; sizeBytes: number; mime: string; deviceCapturedAt?: string | null; idempotencyKey?: string }) {
  const { r, ctx } = await ownEditableReport(user, reportId);
  const s = getStore();
  const mine = (await s.list("media_assets", { reportId: r.id })).filter((m) => m.uploadState !== "rejected");
  if (input.idempotencyKey) { const ex = mine.find((m) => m.idempotencyKey === input.idempotencyKey); if (ex) return { asset: ex, chunkBytes: CHUNK_BYTES }; }
  if (r.draft.mediaIds.length + mine.filter((m) => m.uploadState === "pending").length >= MAX_MEDIA_PER_REPORT) throw bad(`Up to ${MAX_MEDIA_PER_REPORT} files per report.`);
  const kind = declaredKind(input.mime);
  if (!kind) throw bad("Only photos (JPEG, PNG, WebP, HEIC) and videos (MP4, MOV, WebM) can be uploaded.");
  const size = Number(input.sizeBytes);
  if (!Number.isInteger(size) || size <= 0) throw bad("Empty file.");
  if (size > LIMITS[kind]) throw bad(`${kind === "image" ? "Photos" : "Videos"} must be under ${Math.round(LIMITS[kind] / 1024 / 1024)} MB in this demo.`);
  const stages: MediaStage[] = ["overview", "before", "during", "after", "detail"];
  const asset: MediaAsset = {
    id: id("md"), tenantId: r.tenantId, projectId: r.projectId, reportId: r.id, revision: r.revisions.length + 1, stage: stages.includes(input.stage) ? input.stage : "during",
    caption: clip(input.caption, 120), objectKey: `tp/${r.tenantId}/${r.projectId}/${r.id}/${randomUUID()}`, mime: input.mime, sizeBytes: size, receivedBytes: 0, sha256: null,
    uploadState: "pending", scanStatus: "not_scanned", deviceCapturedAt: input.deviceCapturedAt && !Number.isNaN(Date.parse(input.deviceCapturedAt)) ? new Date(input.deviceCapturedAt).toISOString() : null,
    serverReceivedAt: null, uploaderId: user.id, provenance: "device_upload", locationLabel: "Device-reported location not collected", visibilityClass: "project", idempotencyKey: input.idempotencyKey, createdAt: now(),
  };
  await s.insert("media_assets", asset);
  await audit(ctx, "media.init", "media_asset", asset.id, { detail: { sizeBytes: size } });
  return { asset, chunkBytes: CHUNK_BYTES };
}

async function ownPendingMedia(user: User, mediaId: string) {
  const s = getStore();
  const a = await s.get("media_assets", mediaId);
  if (!a || a.tenantId !== user.tenantId || a.uploaderId !== user.id) throw notFound();
  await ownEditableReport(user, a.reportId);
  return a;
}

export async function writeChunk(user: User, mediaId: string, offset: number, bytes: Uint8Array) {
  const a = await ownPendingMedia(user, mediaId);
  if (a.uploadState !== "pending") return { receivedBytes: a.receivedBytes, uploadState: a.uploadState };
  if (bytes.length > CHUNK_BYTES) throw bad("Chunk too large.");
  if (!Number.isInteger(offset) || offset < 0) throw bad("Bad offset.");
  if (offset + bytes.length > a.sizeBytes) throw bad("More bytes than declared.");
  const s = getStore();
  const received = await s.blobs.write(a.objectKey, offset, bytes); // non-sequential offsets are ignored; client resumes from `received`
  await s.update("media_assets", a.id, { receivedBytes: received });
  return { receivedBytes: received, uploadState: "pending" as const };
}

export async function mediaStatus(user: User, mediaId: string) {
  const s = getStore();
  const a = await s.get("media_assets", mediaId);
  if (!a || a.tenantId !== user.tenantId || a.uploaderId !== user.id) throw notFound();
  return { id: a.id, receivedBytes: await s.blobs.size(a.objectKey).catch(() => a.receivedBytes), sizeBytes: a.sizeBytes, uploadState: a.uploadState, sha256: a.sha256, rejectReason: a.rejectReason };
}

export async function completeMedia(user: User, mediaId: string) {
  const a = await ownPendingMedia(user, mediaId);
  const s = getStore();
  if (a.uploadState === "complete") return a;
  const bytes = await s.blobs.read(a.objectKey);
  const reject = async (reason: string) => { await s.blobs.remove(a.objectKey); await s.update("media_assets", a.id, { uploadState: "rejected", rejectReason: reason }); throw bad(reason); };
  if (!bytes || bytes.length !== a.sizeBytes) throw conflict(`Upload incomplete (${bytes?.length ?? 0} of ${a.sizeBytes} bytes). Resume the upload.`);
  const sn = sniff(bytes.slice(0, 16));
  if (!sn) return reject("File contents are not a supported photo or video (checked by file signature).");
  if (sn.kind !== declaredKind(a.mime)) return reject("File contents don't match the declared type.");
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const r = await s.get("site_reports", a.reportId);
  const dup = (await s.list("media_assets", { reportId: a.reportId })).find((m) => m.id !== a.id && m.sha256 === sha256 && m.uploadState === "complete" && r?.draft.mediaIds.includes(m.id));
  if (dup) return reject("This exact file is already attached to the report (duplicate).");
  const done = await s.update("media_assets", a.id, { uploadState: "complete", mime: sn.mime, sha256, serverReceivedAt: now(), receivedBytes: bytes.length });
  if (r) await s.update("site_reports", r.id, { draft: { ...r.draft, mediaIds: [...r.draft.mediaIds, a.id], updatedAt: now() } });
  await audit({ user }, "media.complete", "media_asset", a.id, { projectId: a.projectId, detail: { sha256: sha256.slice(0, 16), scan: "not_scanned" } });
  return done;
}

export async function removeDraftMedia(user: User, mediaId: string) {
  const a = await ownPendingMedia(user, mediaId);
  const s = getStore();
  const r = await s.get("site_reports", a.reportId);
  if (r) await s.update("site_reports", r.id, { draft: { ...r.draft, mediaIds: r.draft.mediaIds.filter((x) => x !== a.id) } });
  // Media already in a submitted revision is preserved: it is only detached from the next revision.
  if (r && r.revisions.some((rev) => rev.mediaIds.includes(a.id))) { await audit({ user }, "media.detached", "media_asset", a.id, { projectId: a.projectId }); return { ok: true, preserved: true }; }
  await s.update("media_assets", a.id, { uploadState: "rejected", rejectReason: "Removed by uploader before submission" });
  await s.blobs.remove(a.objectKey);
  return { ok: true };
}

/** Advisory quality flags. "Needs review", never proof of wrongdoing (spec 01 §C Evidence validation). */
export async function evidenceFlags(report: SiteReport, content: ReportContent & { capturedAt?: string | null }) {
  const media = (await getStore().list("media_assets", { reportId: report.id })).filter((m) => content.mediaIds.includes(m.id));
  const flags: string[] = [];
  if (!media.some((m) => m.stage === "overview")) flags.push("No overview shot");
  if (!media.some((m) => m.stage === "detail" || m.stage === "before" || m.stage === "after")) flags.push("No close-up / before / after shot");
  const hashes = new Set<string>();
  for (const m of media) { if (m.sha256 && hashes.has(m.sha256)) flags.push("Suspected duplicate media"); if (m.sha256) hashes.add(m.sha256); }
  for (const m of media) if (m.deviceCapturedAt && m.serverReceivedAt && Date.parse(m.serverReceivedAt) - Date.parse(m.deviceCapturedAt) > 3 * 86_400_000) { flags.push("Device capture date is more than 3 days before upload"); break; }
  if (media.some((m) => m.scanStatus === "not_scanned")) flags.push("Not malware-scanned (no scanner connected)");
  return flags;
}

export async function submitReport(user: User, reportId: string, input: { attestation: boolean; idempotencyKey?: string; version?: number }) {
  const s = getStore();
  const pre = await s.get("site_reports", reportId);
  if (pre && input.idempotencyKey && pre.authorId === user.id && pre.idempotencyKeys.includes(`submit:${input.idempotencyKey}`)) return pre; // duplicate retry
  const { r, ctx } = await ownEditableReport(user, reportId);
  if (input.version !== undefined && input.version !== r.version) throw conflict("This report changed in another tab. Reload before submitting.");
  if (input.attestation !== true) throw bad("Please confirm the attestation before submitting.");
  const d = r.draft;
  if (!d.summary) throw bad("Add a short summary.");
  if (!d.workReported) throw bad("Describe the work reported.");
  const media = (await s.list("media_assets", { reportId: r.id })).filter((m) => d.mediaIds.includes(m.id) && m.uploadState === "complete");
  if (!media.length) throw bad("Attach at least one completed photo or video.");
  const pending = (await s.list("media_assets", { reportId: r.id })).filter((m) => m.uploadState === "pending");
  if (pending.length) throw bad("Some uploads are still in progress. Finish or remove them first.");
  assertTransition(reportTransitions, r.status, "SUBMITTED", "Report");
  const t = now();
  const revision = r.revisions.length + 1;
  const prior = new Set(r.revisions.flatMap((x) => x.mediaIds));
  for (const m of media) if (!prior.has(m.id) && m.revision !== revision) await s.update("media_assets", m.id, { revision });
  const { updatedAt: _u, capturedAt, ...content } = d; void _u;
  const rev = { ...content, mediaIds: media.map((m) => m.id), revision, capturedAt, submittedAt: t, serverReceivedAt: t, submittedBy: user.id, attestation: { accepted: true as const, text: ATTESTATION_TEXT, at: t } };
  const next = await s.update("site_reports", r.id, {
    status: "SUBMITTED", revisions: [...r.revisions, rev], draft: { ...blankContent(), mediaIds: [], capturedAt: null, updatedAt: t },
    idempotencyKeys: [...r.idempotencyKeys, ...(input.idempotencyKey ? [`submit:${input.idempotencyKey}`] : [])],
  }, r.version);
  const ms = await s.get("milestones", r.milestoneId);
  if (ms && ms.status === "NOT_STARTED") await s.update("milestones", ms.id, { status: "REPORTED_IN_PROGRESS" });
  await audit(ctx, revision > 1 ? "report.resubmitted" : "report.submitted", "site_report", r.id, { oldVersion: r.version, newVersion: next.version, detail: { revision, media: media.length } });
  return next;
}

// ───────────────────────── Office review / inspection / disputes ─────────────────────────

async function reportForStaff(user: User, reportId: string, action: Action) {
  const s = getStore();
  const r = await s.get("site_reports", reportId);
  if (!r || r.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, r.projectId);
  if (!can(ctx.grant, action, ctx.project)) throw forbidden();
  return { r, ctx };
}

export async function reviewReport(user: User, reportId: string, input: { decision: ReviewDecision; notes?: string }) {
  const { r, ctx } = await reportForStaff(user, reportId, "report.review");
  const s = getStore();
  if (r.authorId === user.id) throw forbidden("You can't review your own report.");
  const notes = clip(input.notes, 1000);
  const map: Record<ReviewDecision, SiteReport["status"]> = { approve: "OFFICE_REVIEWED", request_correction: "NEEDS_CORRECTION", require_inspection: "INSPECTION_PENDING", publish: "PUBLISHED" };
  const to = map[input.decision];
  if (!to) throw bad("Unknown decision.");
  if (input.decision === "request_correction" && !notes) throw bad("Say what needs correcting (e.g. a closer shot of the spacer blocks).");
  if (input.decision === "publish" && !can(ctx.grant, "report.publish")) throw forbidden();
  try { assertTransition(reportTransitions, r.status, to, "Report"); } catch (e) { if (e instanceof TransitionError) throw conflict(e.message); throw e; }
  const revision = r.revisions.length;
  const review: ReportReview = { id: id("rv"), tenantId: r.tenantId, projectId: r.projectId, reportId: r.id, revision, reviewerId: user.id, decision: input.decision, notes, createdAt: now() };
  await s.insert("report_reviews", review);
  const patch: Partial<SiteReport> = { status: to };
  if (to === "PUBLISHED") patch.publishedAt = now();
  if (to === "NEEDS_CORRECTION") { const last = r.revisions[r.revisions.length - 1]; patch.draft = { summary: last.summary, workReported: last.workReported, quantities: last.quantities, crewCount: last.crewCount, materials: last.materials, weather: last.weather, siteAccess: last.siteAccess, issues: last.issues, safetyIssues: last.safetyIssues, nextSteps: last.nextSteps, mediaIds: [...last.mediaIds], capturedAt: last.capturedAt, updatedAt: now() }; }
  const next = await s.update("site_reports", r.id, patch);
  const ms = await s.get("milestones", r.milestoneId);
  if (ms && to === "OFFICE_REVIEWED" && ms.status === "REPORTED_IN_PROGRESS") await s.update("milestones", ms.id, { status: "UNDER_REVIEW" });
  await audit(ctx, `report.${input.decision}`, "site_report", r.id, { oldVersion: r.version, newVersion: next.version, detail: { revision } });
  if (to === "PUBLISHED") await notifyClients(ctx, "report_published", `report:${r.id}:${revision}`, "A new project update has been reviewed. Sign in to your BuildGhana portal.", "reports");
  return next;
}

export async function recordInspection(user: User, milestoneId: string, input: { result: Inspection["result"]; scope: string; methods: string; limitations: string; reportIds: string[]; signature: string }) {
  const s = getStore();
  const ms = await s.get("milestones", milestoneId);
  if (!ms || ms.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, ms.projectId);
  if (!can(ctx.grant, "inspection.record")) throw forbidden();
  if (!["pass", "fail", "pass_with_conditions"].includes(input.result)) throw bad("Choose a result.");
  const scope = clip(input.scope, 500), methods = clip(input.methods, 500), limitations = clip(input.limitations, 800), signature = clip(input.signature, 80);
  if (!scope || !methods || !limitations) throw bad("Scope, methods and limitations are required for every inspection.");
  if (!signature) throw bad("Type your name to sign the inspection record.");
  const reports = (await s.list("site_reports", { milestoneId: ms.id })).filter((r) => (input.reportIds || []).includes(r.id));
  if (!reports.length) throw bad("Link at least one reviewed report for this milestone.");
  if (reports.some((r) => r.authorId === user.id)) throw forbidden("You can't inspect work you reported yourself.");
  if (reports.some((r) => !["OFFICE_REVIEWED", "INSPECTION_PENDING", "PUBLISHED", "VERIFIED"].includes(r.status))) throw conflict("Only office-reviewed reports can be linked to an inspection.");
  const org = await s.get("organizations", user.orgId);
  const independence = org?.type === "independent_inspection" ? "independent_third_party" as const : "internal_review" as const;
  const insp: Inspection = { id: id("in"), tenantId: ms.tenantId, projectId: ms.projectId, milestoneId: ms.id, inspectorId: user.id, independence, credentialReference: "Synthetic demo inspector — credential not verified", credentialVerified: false, result: input.result, scope, methods, limitations, reportIds: reports.map((r) => r.id), inspectedAt: now(), signature: `typed: ${signature}`, createdAt: now(), synthetic: true };
  await s.insert("inspections", insp);
  if (input.result !== "fail") {
    for (const r of reports) if (r.status === "INSPECTION_PENDING" || r.status === "PUBLISHED") await s.update("site_reports", r.id, { status: "VERIFIED", publishedAt: r.publishedAt ?? now() });
  } else {
    await s.insert("issues", { id: id("is"), tenantId: ms.tenantId, projectId: ms.projectId, milestoneId: ms.id, title: `Inspection failed: ${scope.slice(0, 80)}`, severity: "high", ownerId: ctx.project.pmUserId, status: "open", createdAt: now() });
  }
  await audit(ctx, `inspection.${input.result}`, "milestone", ms.id, { detail: { inspection: insp.id, independence } });
  await notifyClients(ctx, "inspection_recorded", `inspection:${insp.id}`, "An inspection record has been added to your project. Sign in to your BuildGhana portal.", "reports");
  return insp;
}

export async function raiseDispute(user: User, reportId: string, reason: string) {
  const s = getStore();
  const r = await s.get("site_reports", reportId);
  if (!r || r.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, r.projectId);
  const vis = await visibleReports(ctx);
  if (!vis.some((x) => x.id === r.id)) throw notFound();
  if (!can(ctx.grant, "dispute.raise")) throw forbidden();
  const why = clip(reason, 1000);
  if (why.length < 10) throw bad("Explain what you're questioning (at least a sentence).");
  if (r.status === "DISPUTED") throw conflict("This report already has an open dispute.");
  assertTransition(reportTransitions, r.status, "DISPUTED", "Report");
  const d = { id: id("dp"), tenantId: r.tenantId, projectId: r.projectId, reportId: r.id, raisedBy: user.id, reason: why, status: "open" as const, createdAt: now() };
  await s.insert("disputes", d);
  await s.update("site_reports", r.id, { status: "DISPUTED", statusBeforeDispute: r.status });
  const ms = await s.get("milestones", r.milestoneId);
  if (ms && !ms.overlays.includes("DISPUTED")) await s.update("milestones", ms.id, { overlays: [...ms.overlays, "DISPUTED"] });
  await audit(ctx, "dispute.raised", "site_report", r.id, { detail: { dispute: d.id } });
  return d;
}

export async function resolveDispute(user: User, disputeId: string, resolution: string) {
  const s = getStore();
  const d = await s.get("disputes", disputeId);
  if (!d || d.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, d.projectId);
  if (!can(ctx.grant, "dispute.resolve")) throw forbidden();
  if (d.status !== "open") throw conflict("Already resolved.");
  const text = clip(resolution, 1000);
  if (text.length < 10) throw bad("Record how the dispute was resolved.");
  await s.update("disputes", d.id, { status: "resolved", resolution: text, resolvedBy: user.id, resolvedAt: now() });
  const r = await s.get("site_reports", d.reportId);
  if (r && r.status === "DISPUTED") await s.update("site_reports", r.id, { status: r.statusBeforeDispute ?? "PUBLISHED" });
  const open = (await s.list("disputes", { projectId: d.projectId })).filter((x) => x.status === "open" && x.id !== d.id);
  const ms = r ? await s.get("milestones", r.milestoneId) : null;
  if (ms && !open.some((x) => x.reportId && x.reportId !== d.reportId)) await s.update("milestones", ms.id, { overlays: ms.overlays.filter((o) => o !== "DISPUTED") });
  await audit(ctx, "dispute.resolved", "dispute", d.id);
  return { ok: true };
}

export async function assessMilestone(user: User, milestoneId: string, to: Milestone["status"], note: string) {
  const s = getStore();
  const ms = await s.get("milestones", milestoneId);
  if (!ms || ms.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, ms.projectId);
  if (!can(ctx.grant, "milestone.assess")) throw forbidden();
  try { assertTransition(milestoneTransitions, ms.status, to, "Milestone"); } catch (e) { if (e instanceof TransitionError) throw conflict(e.message); throw e; }
  if (to === "COMPLETE_VERIFIED") {
    const ins = (await s.list("inspections", { milestoneId: ms.id })).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    const last = ins[ins.length - 1];
    if (ms.requiresInspection && (!last || last.result === "fail")) throw conflict("This milestone needs a recorded passing inspection before it can be marked complete.");
    if (ms.overlays.includes("DISPUTED")) throw conflict("Resolve open disputes first.");
  }
  const next = await s.update("milestones", ms.id, { status: to });
  await audit(ctx, "milestone.assessed", "milestone", ms.id, { detail: { to, note: clip(note, 200) } });
  return next;
}

export async function updateForecast(user: User, milestoneId: string, input: { forecastStart: string; forecastEnd: string; reason: string }) {
  const s = getStore();
  const ms = await s.get("milestones", milestoneId);
  if (!ms || ms.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, ms.projectId);
  if (!can(ctx.grant, "schedule.edit")) throw forbidden();
  if (!isDate(input.forecastStart) || !isDate(input.forecastEnd) || input.forecastEnd < input.forecastStart) throw bad("Enter valid forecast dates.");
  const reason = clip(input.reason, 400);
  if (!reason) throw bad("A reason is required for every forecast change.");
  const n = (await s.list("schedule_revisions", { milestoneId: ms.id })).length + 1;
  await s.insert("schedule_revisions", { id: id("sr"), tenantId: ms.tenantId, projectId: ms.projectId, milestoneId: ms.id, revision: n, kind: "forecast", from: { start: ms.forecastStart, end: ms.forecastEnd }, to: { start: input.forecastStart, end: input.forecastEnd }, reason, approvedBy: user.id, createdAt: now() });
  const next = await s.update("milestones", ms.id, { forecastStart: input.forecastStart, forecastEnd: input.forecastEnd });
  await audit(ctx, "schedule.forecast_revised", "milestone", ms.id, { oldVersion: ms.version, newVersion: next.version });
  return next;
}

// ───────────────────────── Decisions + change orders ─────────────────────────

export async function respondDecision(user: User, decisionId: string, input: { action: "approve" | "reject" | "clarify"; comments?: string; confirmation: string; payloadVersion: number }) {
  const s = getStore();
  const d = await s.get("decision_requests", decisionId);
  if (!d || d.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, d.projectId);
  if (!can(ctx.grant, "decisions.view", ctx.project)) throw notFound();
  if (!can(ctx.grant, "decisions.respond") || d.assignedTo !== user.id) throw forbidden("Only the assigned decision-maker can respond.");
  if (d.status !== "OPEN" && d.status !== "CLARIFICATION_REQUESTED") throw conflict("This decision is closed. Approved decisions can't be changed; ask for a superseding amendment.");
  if (input.payloadVersion !== d.payloadVersion) throw conflict("The request changed since you opened it. Reload and review it again.");
  if (input.confirmation !== ctx.project.code) throw bad(`Type the project code ${ctx.project.code} to confirm.`);
  const comments = clip(input.comments, 1000);
  if (input.action === "clarify" && !comments) throw bad("Say what you need clarified.");
  const status: DecisionRequest["status"] = input.action === "approve" ? "APPROVED" : input.action === "reject" ? "REJECTED" : "CLARIFICATION_REQUESTED";
  const vote = { userId: user.id, action: input.action, comments, actedAt: now(), payloadVersion: d.payloadVersion, confirmation: "project-code" };
  const next = await s.update("decision_requests", d.id, { status, votes: [...d.votes, vote] });
  if (d.changeOrderId && input.action !== "clarify") {
    const co = await s.get("change_orders", d.changeOrderId);
    if (co && co.status === "AWAITING_OWNER") {
      await s.update("change_orders", co.id, input.action === "approve" ? { status: "APPROVED", approvedDeltaMinor: co.proposedDeltaMinor, approvedAt: now(), approvedBy: user.id } : { status: "REJECTED" });
      await audit(ctx, `change_order.${input.action}`, "change_order", co.id, { oldVersion: co.version, newVersion: co.version + 1 });
    }
  }
  if (comments) await s.insert("comments", { id: id("cm"), tenantId: d.tenantId, projectId: d.projectId, parentRef: `decision:${d.id}`, authorId: user.id, text: comments, visibilityClass: "project", createdAt: now() });
  await audit(ctx, `decision.${input.action}`, "decision_request", d.id, { oldVersion: d.version, newVersion: next.version });
  return next;
}

export async function proposeChangeOrder(user: User, projectId: string, input: { description: string; sourceDoc: string; proposedDeltaMinor: number; costCode: string; deadline: string }) {
  const ctx = await projectCtx(user, projectId);
  if (!can(ctx.grant, "change_order.propose")) throw forbidden();
  const s = getStore();
  const description = clip(input.description, 500), sourceDoc = clip(input.sourceDoc, 200);
  if (!description || !sourceDoc) throw bad("Description and source document are required.");
  if (!Number.isInteger(input.proposedDeltaMinor)) throw bad("Amount must be whole minor units.");
  if (!isDate(input.deadline)) throw bad("Set a decision deadline.");
  const owner = (await s.list("memberships", { projectId })).find((m) => m.role === "owner" && !m.revokedAt);
  if (!owner) throw conflict("No owner on this project.");
  const n = (await s.list("change_orders", { projectId })).length + 1;
  const co: ChangeOrder = { id: id("co"), tenantId: ctx.project.tenantId, projectId, number: `CO-${String(n).padStart(3, "0")}`, description, sourceDoc, proposedDeltaMinor: input.proposedDeltaMinor, approvedDeltaMinor: null, currency: "GHS", costCode: clip(input.costCode, 8) || "00", status: "AWAITING_OWNER", createdAt: now(), version: 1 };
  await s.insert("change_orders", co);
  const dr: DecisionRequest = { id: id("dr"), tenantId: co.tenantId, projectId, type: "change_order", title: `Decide ${co.number}`, description, requestedBy: user.id, assignedTo: owner.userId, deadline: input.deadline, status: "OPEN", payloadVersion: 1, changeOrderId: co.id, votes: [], createdAt: now(), version: 1 };
  await s.insert("decision_requests", dr);
  await audit(ctx, "change_order.proposed", "change_order", co.id);
  await notifyClients(ctx, "decision_requested", `decision:${dr.id}`, "A decision is waiting for you. Sign in to your BuildGhana portal.", "decisions", [owner.userId]);
  return { co, dr };
}

// ───────────────────────── Payment governance (no money moves) ─────────────────────────

async function paymentCtx(user: User, prId: string) {
  const s = getStore();
  const pr = await s.get("payment_requests", prId);
  if (!pr || pr.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, pr.projectId);
  return { pr, ctx };
}

async function movePayment(ctx: Ctx, pr: PaymentRequest, to: PaymentRequest["status"], note: string) {
  try { assertTransition(paymentTransitions, pr.status, to, "Payment request"); } catch (e) { if (e instanceof TransitionError) throw conflict(e.message); throw e; }
  const next = await getStore().update("payment_requests", pr.id, { status: to, history: [...pr.history, { status: to, by: ctx.user.id, at: now(), note: clip(note, 300) }] }, pr.version);
  await audit(ctx, `payment.${to.toLowerCase()}`, "payment_request", pr.id, { oldVersion: pr.version, newVersion: next.version });
  return next;
}

export async function createPaymentRequest(user: User, projectId: string, input: { milestoneId: string; amountMinor: number; costCode: string; supportingEvidence: string[] }) {
  const ctx = await projectCtx(user, projectId);
  if (!can(ctx.grant, "payment.request.create")) throw forbidden();
  const s = getStore();
  const ms = await s.get("milestones", input.milestoneId);
  if (!ms || ms.projectId !== projectId) throw notFound();
  if (ctx.grant.role === "contractor" && !(ctx.grant.membership?.workPackageIds ?? []).includes(ms.workPackageId)) throw forbidden("Contractors can only request payment for their own work package.");
  if (!Number.isInteger(input.amountMinor) || input.amountMinor <= 0) throw bad("Amount must be a positive whole number of minor units.");
  const ev = (input.supportingEvidence || []).map((x) => clip(x, 200)).filter(Boolean).slice(0, 10);
  if (!ev.length) throw bad("Attach supporting evidence (invoice reference and linked reports).");
  const n = (await s.list("payment_requests", { projectId })).length + 1;
  const pr: PaymentRequest = { id: id("pr"), tenantId: ctx.project.tenantId, projectId, milestoneId: ms.id, number: `PR-${String(n).padStart(3, "0")}`, amountMinor: input.amountMinor, currency: "GHS", payee: "Synthetic Builder Ltd (demo)", costCode: clip(input.costCode, 8) || "00", supportingEvidence: ev, status: "SUBMITTED", submittedBy: user.id, history: [{ status: "SUBMITTED", by: user.id, at: now(), note: "" }], createdAt: now(), version: 1 };
  await s.insert("payment_requests", pr);
  await audit(ctx, "payment.submitted", "payment_request", pr.id);
  return pr;
}

export async function reviewPayment(user: User, prId: string, input: { action: "start_review" | "recommend" | "reject" | "cancel"; reason?: string }) {
  const { pr, ctx } = await paymentCtx(user, prId);
  if (!can(ctx.grant, "payment.evidence_review")) throw forbidden();
  if (pr.submittedBy === user.id && input.action === "recommend") throw forbidden("You can't review a payment request you submitted.");
  const reason = clip(input.reason, 300);
  const to = ({ start_review: "EVIDENCE_REVIEW", recommend: "AWAITING_OWNER_APPROVAL", reject: "REJECTED", cancel: "CANCELLED" } as const)[input.action];
  if (!to) throw bad("Unknown action.");
  if ((input.action === "reject" || input.action === "cancel") && !reason) throw bad("A reason is required.");
  const next = await movePayment(ctx, pr, to, reason);
  if (input.action !== "start_review") await getStore().insert("payment_approvals", { id: id("pa"), tenantId: pr.tenantId, projectId: pr.projectId, paymentRequestId: pr.id, approverId: user.id, stage: "evidence_review", decision: input.action === "recommend" ? "approve" : "reject", reason, createdAt: now() });
  if (to === "AWAITING_OWNER_APPROVAL") await notifyClients(ctx, "payment_awaiting_owner", `payment:${pr.id}`, "A payment request is waiting for your review. Sign in to your BuildGhana portal.", "budget", (await getStore().list("memberships", { projectId: pr.projectId })).filter((m) => m.role === "owner" && !m.revokedAt).map((m) => m.userId));
  return next;
}

export async function ownerAuthorizePayment(user: User, prId: string, input: { action: "approve" | "reject" | "clarify"; reason?: string; confirmation: string }) {
  const { pr, ctx } = await paymentCtx(user, prId);
  if (!can(ctx.grant, "payment.owner_authorize", ctx.project)) throw forbidden();
  if (input.confirmation !== ctx.project.code) throw bad(`Type the project code ${ctx.project.code} to confirm.`);
  const reason = clip(input.reason, 300);
  if (input.action !== "approve" && !reason) throw bad("Add a reason.");
  const to = ({ approve: "APPROVED_FOR_PAYMENT", reject: "REJECTED", clarify: "EVIDENCE_REVIEW" } as const)[input.action];
  const next = await movePayment(ctx, pr, to, reason || "Authorised by owner. No payment is initiated by this portal.");
  await getStore().insert("payment_approvals", { id: id("pa"), tenantId: pr.tenantId, projectId: pr.projectId, paymentRequestId: pr.id, approverId: user.id, stage: "owner_authorization", decision: input.action, reason, createdAt: now() });
  return next;
}

export async function recordDisbursement(user: User, prId: string, input: { paidMinor: number; paidAt: string; sourceReference: string; evidenceDocId: string }) {
  const { pr, ctx } = await paymentCtx(user, prId);
  if (!can(ctx.grant, "payment.record_disbursement")) throw forbidden();
  const d = { paidMinor: input.paidMinor, currency: pr.currency, sourceReference: clip(input.sourceReference, 80), evidenceDocId: clip(input.evidenceDocId, 80), paidAt: clip(input.paidAt, 10) };
  const err = validateDisbursement(pr, d);
  if (err) throw bad(err);
  const doc = await getStore().get("documents", d.evidenceDocId);
  if (!doc || doc.projectId !== pr.projectId || !["bank_evidence", "invoice"].includes(doc.documentType)) throw bad("Evidence must be a bank-evidence or invoice document on this project.");
  const disb: Disbursement = { id: id("db"), tenantId: pr.tenantId, projectId: pr.projectId, paymentRequestId: pr.id, ...d, source: "manual_bank_evidence", recordedBy: user.id, recordedAt: now() };
  await getStore().insert("disbursements", disb);
  return movePayment(ctx, pr, "PAID_PENDING_RECONCILIATION", `Disbursement recorded from evidence ${d.sourceReference}`);
}

export async function reconcilePayment(user: User, prId: string, input: { note?: string }) {
  const { pr, ctx } = await paymentCtx(user, prId);
  if (!can(ctx.grant, "payment.reconcile")) throw forbidden();
  const s = getStore();
  const disb = (await s.list("disbursements", { paymentRequestId: pr.id })).find((d) => !d.reconciledAt);
  if (!disb) throw conflict("No recorded disbursement to reconcile.");
  if (!disb.sourceReference || !disb.evidenceDocId) throw conflict("Reconciliation needs payment evidence.");
  await s.update("disbursements", disb.id, { reconciledBy: user.id, reconciledAt: now() });
  return movePayment(ctx, pr, "RECONCILED", clip(input.note, 300) || "Reconciled against bank evidence.");
}

export async function ledgerFor(ctx: Ctx) {
  if (!can(ctx.grant, "budget.view", ctx.project)) throw forbidden("Financial information is not shared with your access level.");
  const s = getStore(), p = ctx.project.id;
  const [lines, changeOrders, requests, disbursements] = await Promise.all([s.list("budget_lines", { projectId: p }), s.list("change_orders", { projectId: p }), s.list("payment_requests", { projectId: p }), s.list("disbursements", { projectId: p })]);
  return { summary: summarizeLedger("GHS", { lines, changeOrders, requests, disbursements }), lines, changeOrders, requests, disbursements };
}

// ───────────────────────── Access management ─────────────────────────

export async function grantViewer(user: User, projectId: string, input: { name: string; email: string; scopes: Scope[]; expiryDays: number }) {
  const ctx = await projectCtx(user, projectId);
  if (!canGrantRole(ctx.grant, "co_owner")) throw forbidden();
  const email = clip(input.email, 120).toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.invalid$/.test(email)) throw bad("Demo invitations accept synthetic addresses ending in .invalid only (no real invitations are sent).");
  const name = clip(input.name, 60);
  if (!name) throw bad("Name required.");
  const allowed = ctx.grant.scopes;
  const sc = (input.scopes || []).filter((x): x is Scope => (ALL_SCOPES as readonly string[]).includes(x) && allowed.includes(x as Scope));
  const days = Math.max(1, Math.min(365, Math.round(Number(input.expiryDays) || 30)));
  const s = getStore();
  const newUser: User = { id: id("u"), tenantId: ctx.project.tenantId, orgId: ctx.project.clientOrgId, name, email, title: "Invited viewer (synthetic)", staffRole: null, timezone: "Africa/Accra", disabled: false, sessionsRevokedBefore: 0, mfa: "not_configured", synthetic: true };
  await s.insert("users", newUser);
  const mb: Membership = { id: id("mb"), tenantId: ctx.project.tenantId, projectId, userId: newUser.id, role: "co_owner", scopes: sc, invitedBy: user.id, grantedAt: now(), invitationExpiry: new Date(Date.now() + days * 86_400_000).toISOString(), version: 1 };
  await s.insert("memberships", mb);
  await audit(ctx, "access.granted", "membership", mb.id, { detail: { scopes: sc.join(",") } });
  await logOutbox(ctx, "invitation", `membership:${mb.id}`, newUser.id, "You've been invited to view a BuildGhana project. Sign in to your BuildGhana portal.");
  return mb;
}

async function manageableMembership(user: User, membershipId: string) {
  const s = getStore();
  const mb = await s.get("memberships", membershipId);
  if (!mb || mb.tenantId !== user.tenantId) throw notFound();
  const ctx = await projectCtx(user, mb.projectId);
  if (!canGrantRole(ctx.grant, mb.role)) throw forbidden();
  if (mb.userId === user.id) throw forbidden("You can't change your own access.");
  return { mb, ctx };
}

export async function setScopes(user: User, membershipId: string, sc: Scope[]) {
  const { mb, ctx } = await manageableMembership(user, membershipId);
  const clean = (sc || []).filter((x): x is Scope => (ALL_SCOPES as readonly string[]).includes(x) && ctx.grant.scopes.includes(x as Scope));
  const next = await getStore().update("memberships", mb.id, { scopes: clean }, mb.version);
  await audit(ctx, "access.scopes_changed", "membership", mb.id, { oldVersion: mb.version, newVersion: next.version, detail: { scopes: clean.join(",") } });
  return next;
}

export async function revokeAccess(user: User, membershipId: string) {
  const { mb, ctx } = await manageableMembership(user, membershipId);
  if (mb.revokedAt) return mb;
  const next = await getStore().update("memberships", mb.id, { revokedAt: now() });
  await audit(ctx, "access.revoked", "membership", mb.id);
  return next;
}

export async function addComment(user: User, projectId: string, parentRef: string, text: string) {
  const ctx = await projectCtx(user, projectId);
  if (!can(ctx.grant, "comments.write")) throw forbidden();
  const [kind, refId] = parentRef.split(":");
  const s = getStore();
  if (kind === "report") { const vis = await visibleReports(ctx); if (!vis.some((r) => r.id === refId)) throw notFound(); }
  else if (kind === "decision") { const d = await s.get("decision_requests", refId); if (!d || d.projectId !== projectId || !can(ctx.grant, "decisions.view", ctx.project)) throw notFound(); }
  else throw bad("Unknown thread.");
  const t = clip(text, 1000);
  if (!t) throw bad("Write a question or comment.");
  const c = { id: id("cm"), tenantId: ctx.project.tenantId, projectId, parentRef, authorId: user.id, text: t, visibilityClass: "project" as const, createdAt: now() };
  await s.insert("comments", c);
  await audit(ctx, "comment.added", "comment", c.id);
  return c;
}

// ───────────────────────── Notifications (log mode) ─────────────────────────

async function logOutbox(ctx: { project: Project }, type: OutboxEvent["type"], aggregateRef: string, recipientUserId: string, text: string) {
  const s = getStore();
  const key = `${type}:${aggregateRef}:${recipientUserId}`;
  if ((await s.list("outbox_events", { idempotencyKey: key })).length) return;
  await s.insert("outbox_events", { id: id("ob"), tenantId: ctx.project.tenantId, projectId: ctx.project.id, type, aggregateRef, idempotencyKey: key, recipientUserId, channel: "email", text, status: "logged_not_sent", createdAt: now() });
}

async function notifyClients(ctx: Ctx, type: OutboxEvent["type"], ref: string, text: string, scope: Scope, only?: string[]) {
  const mbs = (await getStore().list("memberships", { projectId: ctx.project.id })).filter((m) => !m.revokedAt && (m.role === "owner" || m.role === "co_owner") && m.scopes.includes(scope));
  for (const m of mbs) if (!only || only.includes(m.userId)) await logOutbox(ctx, type, ref, m.userId, text);
}

export { evidenceState };
