import { beforeEach, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { buildSeed, DEMO_LABEL } from "@/lib/transparency/seed";
import { summarizeLedger, validateDisbursement } from "@/lib/transparency/ledger";
import { evidenceState, paymentStatusLabel, varianceDays, paymentTransitions } from "@/lib/transparency/states";
import { can, grantFor, canGrantRole } from "@/lib/transparency/rbac";
import { tpConfig } from "@/lib/transparency/config";
import { sniff } from "@/lib/transparency/media";
import { isUntrackedPath, safePagePath } from "@/lib/client/safe-path";
import { privateDisallow } from "@/app/robots";
import * as svc from "@/lib/transparency/service";
import type { User } from "@/lib/transparency/types";

const S = () => svc.getStore();
const user = async (id: string) => (await S().get("users", id)) as User;
const P1 = "p-demo-accra-villa";
const png = (n: number) => { const b = new Uint8Array(n); b.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]); for (let i = 8; i < n; i++) b[i] = (i * 7) % 251; return b; };
async function status(p: Promise<unknown>) { try { await p; return 200; } catch (e) { return (e as svc.ServiceError).status ?? 500; } }

beforeEach(() => svc.resetStore());

describe("synthetic demo seed (spec 03 B.7)", () => {
  const seed = buildSeed();
  const p1 = <T extends { projectId: string }>(rows: T[]) => rows.filter((r) => r.projectId === P1);
  it("has 6 phases, 12 reports, 3 returned for correction, 2 inspections, a delay, an owner decision and a budget change", () => {
    expect(p1(seed.milestones).map((m) => m.phase)).toEqual([1, 2, 3, 4, 5, 6]);
    expect(p1(seed.site_reports)).toHaveLength(12);
    expect(new Set(p1(seed.report_reviews).filter((r) => r.decision === "request_correction").map((r) => r.reportId)).size).toBe(3);
    expect(p1(seed.inspections)).toHaveLength(2);
    expect(p1(seed.inspections).map((i) => i.result).sort()).toEqual(["fail", "pass"]);
    const delayed = p1(seed.milestones).filter((m) => varianceDays(m.baselineEnd, m.forecastEnd) > 0 && m.blockers.length);
    expect(delayed.map((m) => m.title)).toContain("Ground-floor blockwork & columns");
    expect(p1(seed.decision_requests).some((d) => d.status === "OPEN" && d.assignedTo === "u-owner")).toBe(true);
    expect(p1(seed.change_orders).some((c) => c.status === "APPROVED" && (c.approvedDeltaMinor ?? 0) !== 0)).toBe(true);
  });
  it("labels everything synthetic and never uses photographs", () => {
    expect(DEMO_LABEL).toMatch(/synthetic/i);
    expect(seed.projects.every((p) => p.synthetic && /synthetic/i.test(p.locationPublic))).toBe(true);
    expect(seed.users.every((u) => u.synthetic && u.email.endsWith(".invalid") && !u.phone)).toBe(true);
    expect(seed.media_assets.every((m) => m.provenance === "synthetic_placeholder" && m.mime === "image/svg+xml")).toBe(true);
    expect(seed.inspections.every((i) => !i.credentialVerified && /synthetic/i.test(i.credentialReference))).toBe(true);
    expect(seed.organizations.filter((o) => o.type !== "delivery").every((o) => /demo/i.test(o.name))).toBe(true);
  });
});

describe("ledger separation (spec 02 §8, 03 B.5)", () => {
  it("keeps requested, authorised, disbursed-pending and reconciled amounts in separate buckets", async () => {
    const s = buildSeed();
    const sum = summarizeLedger("GHS", { lines: s.budget_lines, changeOrders: s.change_orders, requests: s.payment_requests, disbursements: s.disbursements });
    expect(sum.requested).toEqual({ count: 2, minor: 5_000_000 });
    expect(sum.authorisedUnpaid).toEqual({ count: 1, minor: 4_000_000 });
    expect(sum.disbursedPendingReconciliation).toEqual({ count: 1, minor: 5_150_000 });
    expect(sum.reconciledPaid).toEqual({ count: 2, minor: 6_800_000 });
    expect(sum.approvedChangesMinor).toBe(650_000);
    expect(sum.currentApprovedBudgetMinor).toBe(sum.baselineMinor + 650_000);
    expect(sum.pendingChangeOrders.minor).toBe(1_400_000);
  });
  it("only RECONCILED is ever labelled Paid", () => {
    for (const [k, v] of Object.entries(paymentStatusLabel)) expect(/\bPaid\b/.test(v)).toBe(k === "RECONCILED");
  });
  it("no transition skips owner authorisation or reconciliation", () => {
    expect(paymentTransitions.SUBMITTED).not.toContain("APPROVED_FOR_PAYMENT");
    expect(paymentTransitions.EVIDENCE_REVIEW).not.toContain("APPROVED_FOR_PAYMENT");
    expect(paymentTransitions.APPROVED_FOR_PAYMENT).not.toContain("RECONCILED");
    expect(paymentTransitions.AWAITING_OWNER_APPROVAL).not.toContain("PAID_PENDING_RECONCILIATION");
  });
  it("validates disbursements against authorisation, amount, currency and evidence", () => {
    const pr = buildSeed().payment_requests.find((p) => p.id === "pr-4")!;
    const ok = { paidMinor: 4_000_000, currency: "GHS" as const, sourceReference: "SYNTH-1", evidenceDocId: "doc-6", paidAt: "2026-11-20" };
    expect(validateDisbursement(pr, ok)).toBeNull();
    expect(validateDisbursement(pr, { ...ok, paidMinor: 4_000_001 })).toMatch(/exceed/);
    expect(validateDisbursement(pr, { ...ok, currency: "USD" })).toMatch(/currency/);
    expect(validateDisbursement(pr, { ...ok, evidenceDocId: "" })).toMatch(/evidence/);
    expect(validateDisbursement({ ...pr, status: "AWAITING_OWNER_APPROVAL" }, ok)).toMatch(/owner-authorised/);
  });
  it("runs the governed flow end-to-end with role checks and no automatic release", async () => {
    const owner = await user("u-owner"), acct = await user("u-acct"), pm = await user("u-pm"), co = await user("u-coinv");
    expect(await status(svc.ownerAuthorizePayment(owner, "pr-5", { action: "approve", confirmation: "wrong" }))).toBe(400);
    expect(await status(svc.ownerAuthorizePayment(pm, "pr-5", { action: "approve", confirmation: "DEMO-ACC-01" }))).toBe(403);
    expect((await svc.ownerAuthorizePayment(owner, "pr-5", { action: "approve", confirmation: "DEMO-ACC-01" })).status).toBe("APPROVED_FOR_PAYMENT");
    expect(await status(svc.reconcilePayment(acct, "pr-5", {}))).toBe(409); // nothing disbursed yet
    expect(await status(svc.recordDisbursement(owner, "pr-5", { paidMinor: 3_000_000, paidAt: "2026-11-24", sourceReference: "X", evidenceDocId: "doc-6" }))).toBe(403);
    expect(await status(svc.recordDisbursement(acct, "pr-5", { paidMinor: 3_000_000, paidAt: "2026-11-24", sourceReference: "X", evidenceDocId: "nope" }))).toBe(400);
    expect((await svc.recordDisbursement(acct, "pr-5", { paidMinor: 3_000_000, paidAt: "2026-11-24", sourceReference: "SYNTH-BANK-9", evidenceDocId: "doc-6" })).status).toBe("PAID_PENDING_RECONCILIATION");
    let led = await svc.ledgerFor(await svc.projectCtx(owner, P1));
    expect(led.summary.disbursedPendingReconciliation.minor).toBe(5_150_000 + 3_000_000);
    expect(led.summary.reconciledPaid.minor).toBe(6_800_000);
    expect((await svc.reconcilePayment(acct, "pr-5", {})).status).toBe("RECONCILED");
    led = await svc.ledgerFor(await svc.projectCtx(owner, P1));
    expect(led.summary.reconciledPaid.minor).toBe(9_800_000);
    expect(await status(svc.ledgerFor(await svc.projectCtx(co, P1)))).toBe(403);
    expect(await status(svc.reviewPayment(await user("u-builder"), "pr-6", { action: "recommend" }))).toBe(403);
  });
});

describe("evidence states (spec 03 B.4)", () => {
  it("maps reports to reported / reviewed / verified / disputed", async () => {
    const s = S();
    const ins = await s.list("inspections"), dis = await s.list("disputes");
    const st = async (id: string) => evidenceState((await s.get("site_reports", id))!, { inspections: ins, disputes: dis });
    expect(await st("r-12")).toBe("reported");
    expect(await st("r-07")).toBe("reviewed");
    expect(await st("r-04")).toBe("reviewed"); // failed inspection never verifies
    expect(await st("r-05")).toBe("verified");
    expect(await st("r-09")).toBe("disputed");
  });
  it("owners never see unreviewed or returned reports", async () => {
    const vis = await svc.visibleReports(await svc.projectCtx(await user("u-owner"), P1));
    expect(vis.every((r) => ["PUBLISHED", "VERIFIED", "DISPUTED"].includes(r.status))).toBe(true);
    expect(vis.map((r) => r.id)).not.toContain("r-12");
    expect(vis.map((r) => r.id)).not.toContain("r-11");
  });
  it("field → correction → new revision → publish → inspection, preserving history", async () => {
    const field = await user("u-field"), pm = await user("u-pm"), insp = await user("u-insp"), owner = await user("u-owner");
    expect(await status(svc.createDraft(field, { projectId: P1, milestoneId: "ms-3", confirmProjectCode: "DEMO-TEM-02" }))).toBe(400);
    const r = await svc.createDraft(field, { projectId: P1, milestoneId: "ms-3", confirmProjectCode: "DEMO-ACC-01", idempotencyKey: "k1" });
    expect((await svc.createDraft(field, { projectId: P1, milestoneId: "ms-3", confirmProjectCode: "DEMO-ACC-01", idempotencyKey: "k1" })).id).toBe(r.id);
    await svc.updateDraft(field, r.id, { summary: "Ground floor blockwork", workReported: "37 m2, per field supervisor" });
    const bytes = png(600 * 1024);
    const { asset, chunkBytes } = await svc.initMedia(field, r.id, { stage: "overview", sizeBytes: bytes.length, mime: "image/png" });
    await svc.writeChunk(field, asset.id, 0, bytes.slice(0, chunkBytes));
    // simulated dropped connection: a chunk at the wrong offset is ignored; client resumes from receivedBytes
    const after = await svc.writeChunk(field, asset.id, chunkBytes * 2, bytes.slice(chunkBytes * 2, chunkBytes * 3));
    expect(after.receivedBytes).toBe(chunkBytes);
    expect(await status(svc.completeMedia(field, asset.id))).toBe(409);
    for (let off = (await svc.mediaStatus(field, asset.id)).receivedBytes; off < bytes.length; off += chunkBytes) await svc.writeChunk(field, asset.id, off, bytes.slice(off, off + chunkBytes));
    const done = await svc.completeMedia(field, asset.id);
    expect(done.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(done.serverReceivedAt).toBeTruthy();
    expect(await status(svc.submitReport(field, r.id, { attestation: false }))).toBe(400);
    await svc.submitReport(field, r.id, { attestation: true, idempotencyKey: "s1" });
    expect((await svc.submitReport(field, r.id, { attestation: true, idempotencyKey: "s1" })).revisions).toHaveLength(1); // duplicate retry
    expect(await status(svc.reviewReport(field, r.id, { decision: "approve" }))).toBe(403);
    expect(await status(svc.reviewReport(pm, r.id, { decision: "request_correction" }))).toBe(400);
    await svc.reviewReport(pm, r.id, { decision: "request_correction", notes: "Need a close-up of the wall opening." });
    const b2 = png(10_000); b2[100] = 1;
    const m2 = await svc.initMedia(field, r.id, { stage: "detail", sizeBytes: b2.length, mime: "image/png" });
    await svc.writeChunk(field, m2.asset.id, 0, b2);
    await svc.completeMedia(field, m2.asset.id);
    const resub = await svc.submitReport(field, r.id, { attestation: true });
    expect(resub.revisions).toHaveLength(2);
    expect(resub.revisions[0].mediaIds).toEqual([asset.id]);
    expect(resub.revisions[1].mediaIds).toEqual([asset.id, m2.asset.id]);
    await svc.reviewReport(pm, r.id, { decision: "approve" });
    await svc.reviewReport(pm, r.id, { decision: "publish" });
    const ob = (await S().list("outbox_events")).filter((o) => o.aggregateRef.startsWith(`report:${r.id}`));
    expect(ob.length).toBeGreaterThan(0);
    for (const o of ob) { expect(o.status).toBe("logged_not_sent"); expect(o.text).not.toMatch(/\d|GHS|http|\.pdf|token/i); }
    expect((await svc.visibleReports(await svc.projectCtx(owner, P1))).map((x) => x.id)).toContain(r.id);
    expect(evidenceState((await S().get("site_reports", r.id))!)).toBe("reviewed");
    await svc.recordInspection(insp, "ms-3", { result: "pass", scope: "Blockwork", methods: "Visual", limitations: "Sampled", reportIds: [r.id], signature: "Demo Inspector" });
    expect(evidenceState((await S().get("site_reports", r.id))!)).toBe("verified");
    const audit = (await S().list("audit_events", { objectId: r.id })).map((a) => a.action);
    expect(audit).toEqual(expect.arrayContaining(["report.submitted", "report.request_correction", "report.resubmitted", "report.publish"]));
  });
  it("blocks self-inspection, wrong file types and editing submitted evidence", async () => {
    const insp = await user("u-insp"), field = await user("u-field");
    const r = (await S().get("site_reports", "r-11"))!;
    await S().insert("site_reports", { ...r, id: "r-self", authorId: "u-insp", status: "OFFICE_REVIEWED" });
    expect(await status(svc.recordInspection(insp, "ms-3", { result: "pass", scope: "x", methods: "y", limitations: "z", reportIds: ["r-self"], signature: "I" }))).toBe(403);
    expect(await status(svc.recordInspection(field, "ms-3", { result: "pass", scope: "x", methods: "y", limitations: "z", reportIds: ["r-11"], signature: "I" }))).toBe(403);
    expect(await status(svc.updateDraft(field, "r-07", { summary: "rewrite history" }))).toBe(409);
    const d = await svc.createDraft(field, { projectId: P1, milestoneId: "ms-3", confirmProjectCode: "DEMO-ACC-01" });
    const fake = new TextEncoder().encode("<script>alert(1)</script>".padEnd(64, " "));
    const a = await svc.initMedia(field, d.id, { stage: "overview", sizeBytes: fake.length, mime: "image/png" });
    await svc.writeChunk(field, a.asset.id, 0, fake);
    expect(await status(svc.completeMedia(field, a.asset.id))).toBe(400);
    expect(await status(svc.initMedia(field, d.id, { stage: "overview", sizeBytes: 999, mime: "text/html" }))).toBe(400);
    expect(await status(svc.initMedia(field, d.id, { stage: "overview", sizeBytes: 50 * 1024 * 1024, mime: "image/jpeg" }))).toBe(400);
    expect(sniff(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
  });
  it("milestones can't be marked complete-verified without a passing inspection and no open disputes", async () => {
    expect(await status(svc.assessMilestone(await user("u-pm"), "ms-3", "APPROVED_PROGRESS", ""))).toBe(200);
    expect(await status(svc.assessMilestone(await user("u-pm"), "ms-3", "COMPLETE_VERIFIED", ""))).toBe(409);
  });
});

describe("RBAC, tenant isolation and revocation (spec 02 §5, §10)", () => {
  it("denies cross-project and cross-tenant access with 404, including media", async () => {
    expect(await status(svc.projectCtx(await user("u-owner-b"), P1))).toBe(404);
    expect(await status(svc.projectCtx(await user("u-other-owner"), P1))).toBe(404);
    expect(await status(svc.projectCtx(await user("u-ops"), "p-other-tenant-demo"))).toBe(404);
    expect(await status(svc.mediaAccess(await user("u-owner-b"), "md-05-2-2"))).toBe(404);
    expect(await status(svc.mediaAccess(await user("u-other-owner"), "md-05-2-2"))).toBe(404);
    expect(await status(svc.mediaAccess(await user("u-owner"), "md-t1-1-1"))).toBe(404);
    expect(await status(svc.mediaAccess(await user("u-owner"), "md-05-2-2"))).toBe(200);
    expect(await status(svc.mediaAccess(await user("u-owner"), "md-12-1-1"))).toBe(404); // not yet reviewed
    expect((await S().list("audit_events")).some((a) => a.action === "access.denied")).toBe(true);
  });
  it("co-investor: gallery yes, budget no; revocation is immediate", async () => {
    const co = await user("u-coinv"), owner = await user("u-owner");
    const ctx = await svc.projectCtx(co, P1);
    expect(can(ctx.grant, "gallery.view", ctx.project)).toBe(true);
    expect(can(ctx.grant, "budget.view", ctx.project)).toBe(false);
    expect(can(ctx.grant, "documents.view", ctx.project)).toBe(false);
    expect(can(ctx.grant, "decisions.respond", ctx.project)).toBe(false);
    expect(await status(svc.mediaAccess(co, "md-05-2-2"))).toBe(200);
    await svc.setScopes(owner, "mb-7", ["reports", "gallery", "schedule", "budget"]);
    expect(can((await svc.projectCtx(co, P1)).grant, "budget.view", ctx.project)).toBe(true);
    await svc.revokeAccess(owner, "mb-7");
    expect(await status(svc.projectCtx(co, P1))).toBe(404);
    expect(await status(svc.mediaAccess(co, "md-05-2-2"))).toBe(404);
  });
  it("expired invitations and disabled users get no grant; owners can't grant staff roles", async () => {
    const s = buildSeed();
    const p = s.projects[0], co = s.users.find((u) => u.id === "u-coinv")!;
    const mbs = s.memberships.map((m) => (m.id === "mb-7" ? { ...m, invitationExpiry: "2020-01-01T00:00:00.000Z" } : m));
    expect(grantFor(co, p, mbs)).toBeNull();
    expect(grantFor({ ...co, disabled: true }, p, s.memberships)).toBeNull();
    const ownerGrant = grantFor(s.users.find((u) => u.id === "u-owner")!, p, s.memberships);
    expect(canGrantRole(ownerGrant, "co_owner")).toBe(true);
    expect(canGrantRole(ownerGrant, "project_manager")).toBe(false);
    expect(canGrantRole(ownerGrant, "accountant")).toBe(false);
  });
  it("new viewers default to no financial access and only synthetic emails are accepted", async () => {
    const owner = await user("u-owner");
    expect(await status(svc.grantViewer(owner, P1, { name: "Real", email: "someone@gmail.com", scopes: ["gallery"], expiryDays: 30 }))).toBe(400);
    const mb = await svc.grantViewer(owner, P1, { name: "Aunt (demo)", email: "aunt@demo.invalid", scopes: ["gallery"], expiryDays: 30 });
    expect(mb.role).toBe("co_owner");
    expect(mb.scopes).toEqual(["gallery"]);
    expect(await status(svc.grantViewer(await user("u-coinv"), P1, { name: "x", email: "x@y.invalid", scopes: ["budget"], expiryDays: 3 }))).toBe(403);
  });
  it("contractor sees only its work package; financial pages hidden when contract doesn't authorise them", async () => {
    const b = await user("u-builder");
    const vis = await svc.visibleReports(await svc.projectCtx(b, P1));
    expect(vis.length).toBeGreaterThan(0);
    expect(vis.every((r) => r.workPackageId === "wp-3")).toBe(true);
    expect(await status(svc.createPaymentRequest(b, P1, { milestoneId: "ms-2", amountMinor: 100, costCode: "02", supportingEvidence: ["inv"] }))).toBe(403);
    const ctxB = await svc.projectCtx(await user("u-owner-b"), "p-demo-tema-duplex");
    expect(can(ctxB.grant, "budget.view", ctxB.project)).toBe(false);
  });
  it("decisions need the assigned owner + explicit confirmation and are immutable once approved", async () => {
    const owner = await user("u-owner");
    expect(await status(svc.respondDecision(await user("u-coinv"), "dr-2", { action: "approve", confirmation: "DEMO-ACC-01", payloadVersion: 1 }))).toBe(404);
    expect(await status(svc.respondDecision(owner, "dr-2", { action: "approve", confirmation: "", payloadVersion: 1 }))).toBe(400);
    expect(await status(svc.respondDecision(owner, "dr-2", { action: "approve", confirmation: "DEMO-ACC-01", payloadVersion: 0 }))).toBe(409);
    await svc.respondDecision(owner, "dr-2", { action: "approve", confirmation: "DEMO-ACC-01", payloadVersion: 1 });
    expect((await S().get("change_orders", "co-2"))!.status).toBe("APPROVED");
    expect(await status(svc.respondDecision(owner, "dr-2", { action: "reject", confirmation: "DEMO-ACC-01", payloadVersion: 1 }))).toBe(409);
    expect((await svc.ledgerFor(await svc.projectCtx(owner, P1))).summary.approvedChangesMinor).toBe(650_000 + 1_400_000);
  });
  it("audit and append-only tables cannot be rewritten", async () => {
    await expect(S().update("audit_events", "ae-co-1", { action: "x" })).rejects.toThrow(/append-only/);
    await expect(S().update("inspections", "in-1", { result: "pass" })).rejects.toThrow(/append-only/);
  });
});

describe("feature gate, privacy and integrations", () => {
  const env = { TRANSPARENCY_DEMO: "true", TRANSPARENCY_SESSION_SECRET: "x".repeat(32), TRANSPARENCY_DEMO_ACCESS_CODE: "y".repeat(12) };
  it("is off on production and fails closed without secrets or durable storage", () => {
    expect(tpConfig(env).enabled).toBe(true);
    expect(tpConfig({ ...env, VERCEL_ENV: "production" }).enabled).toBe(false);
    expect(tpConfig({ ...env, TRANSPARENCY_SESSION_SECRET: "short" }).enabled).toBe(false);
    expect(tpConfig({ ...env, TRANSPARENCY_STORE: "supabase" }).enabled).toBe(false);
    expect(tpConfig({}).enabled).toBe(false);
  });
  it("portal, field and office paths are never tracked or crawled", () => {
    for (const p of ["/portal/login", "/portal/projects/p-demo-accra-villa/budget", "/field/projects", "/office/financials"]) expect(isUntrackedPath(p)).toBe(true);
    expect(isUntrackedPath("/project-transparency")).toBe(false);
    expect(safePagePath("/project-transparency", "?utm_source=x&t=secret")).toBe("/project-transparency?utm_source=x");
    for (const p of ["/portal", "/field", "/office"]) expect(privateDisallow).toContain(p);
  });
  it("the transparency module never imports CRM, ad, analytics, DataMoon or the production KV", () => {
    const dir = path.resolve(__dirname, "../src/lib/transparency");
    const files = [...readdirSync(dir).map((f) => path.join(dir, f)), ...["portal", "field", "office"].map((d) => path.resolve(__dirname, `../src/app/api/${d}/[...path]/route.ts`))];
    for (const f of files) {
      const src = readFileSync(f, "utf8");
      expect(src, f).not.toMatch(/server\/(ghl|kv|meta-capi|ga4-mp|google-ads)|datamoon|client\/analytics|openai-ads|fetch\(/);
    }
  });
});

describe("transparency: login throttle + public copy", () => {
  it("counts only failed sign-ins, and locks after 8 failures", async () => {
    const { loginThrottle, recordLoginFailure } = await import("@/lib/transparency/auth");
    const k = `t-${Math.random()}`;
    for (let i = 0; i < 20; i++) expect(loginThrottle(k)).toBe(true); // successes / checks never consume the budget
    for (let i = 0; i < 8; i++) recordLoginFailure(k);
    expect(loginThrottle(k)).toBe(false);
  });
  it("public page copy makes no fund-safety or outcome guarantees and keeps the spec FAQ", async () => {
    const { tpFaqs, tpLimits, tpSteps, tpSections } = await import("@/content/transparency");
    const all = JSON.stringify({ tpFaqs, tpLimits, tpSteps, tpSections });
    expect(all).not.toMatch(/\b(we|buildghana) guarantee|funds are (safe|protected)|held in escrow|escrow (protection|account)|100% (safe|secure)|certified inspector/i);
    expect(tpFaqs.map((f) => f.q)).toContain("Does uploading a photo prove the work was done correctly?");
    expect(tpLimits.join(" ")).toMatch(/does not hold, protect or guarantee funds/);
  });
});
