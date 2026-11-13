import "server-only";
import { randomUUID } from "node:crypto";
import { kv, kvConfigured } from "@/lib/server/kv";
import { sha256 } from "@/lib/server/hash";
import { sendCapiEvent } from "@/lib/server/meta-capi";
import { sendGa4Event } from "@/lib/server/ga4-mp";
import { documentStore } from "@/lib/readiness/storage";
import { propertyToken, verifyPropertyToken } from "@/lib/readiness/secrets";
import { sniffMatches } from "@/lib/readiness/service";
import { getPriceSettings } from "@/lib/readiness/pricing";
import { propertyUploadPolicy } from "@/config/property";
import {
  can, coarseLocation, leadTransitions, terminalStatuses, transitionRoles,
  type AnyRecord, type BuyerRequirement, type Contact, type LeadStatus, type LegalState, type Match, type PrivacyRequest,
  type PropertyAsset, type PropertyLead, type Role, type SellerAuthorization, type VerificationTask,
} from "./model";
import { buyerSchema, fieldErrors, MIN_FILL_MS, privacyRequestSchema, sellerSchema, uploadRequestSchema } from "./schema";
import { evaluateMatch, isMatchable, rankCandidates } from "./matching";
import { notifyStaffOfMatch, syncPropertyToGhl } from "./crm";
import * as db from "./store";

type Ctx = { ip: string; userAgent: string; now?: number };
type Fail = { ok: false; status: number; error: string; fieldErrors?: Record<string, string> };
export type SubmitOk = { ok: true; id: string; reference: string; token: string; duplicate: boolean; integrations: Record<string, string> };
const FAKE_ID = "00000000-0000-4000-8000-000000000000";
const fake = (): SubmitOk => ({ ok: true, id: FAKE_ID, reference: "—", token: "", duplicate: false, integrations: { spam: "suppressed" } });
const isSandbox = () => process.env.VERCEL_ENV !== "production";
const nowIso = () => new Date().toISOString();

/** Ghana local numbers (0XX…) from Ghana residents are stored in +233 form so CRM/WhatsApp work. */
export function normalizePhone(p: string, country: string) {
  const t = p.trim();
  if (country === "GH" && /^0\d{9}$/.test(t.replace(/[\s\-.()]/g, ""))) return "+233" + t.replace(/[\s\-.()]/g, "").slice(1);
  return t;
}
export const ownerKeyFor = (email: string, phone: string) => sha256(`${email.trim().toLowerCase()}|${phone.replace(/[^0-9]/g, "").slice(-9)}`);
export const parcelKeyFor = (p: { region: string; district: string; town: string; ghanaPostGps?: string; propertyKind: string }) =>
  p.ghanaPostGps ? sha256(`gps|${p.ghanaPostGps.toUpperCase().replace(/-/g, "")}`) : sha256(`${p.region}|${p.district.trim().toLowerCase()}|${p.town.trim().toLowerCase()}|${p.propertyKind}`);
const reference = (prefix: "S" | "B", id: string) => `${prefix}-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
const minor = (v: number | null | undefined) => (v === null || v === undefined ? null : Math.round(v * 100));

function storageGuard(): Fail | null {
  // Private property data is never accepted into process memory on production (LEAD_ALLOW_MEMORY_STORE is ignored here).
  if (process.env.VERCEL_ENV === "production" && !kvConfigured) {
    console.error("[property] No durable storage configured in production — refusing to accept private property data");
    return { ok: false, status: 503, error: "This form is temporarily unavailable. Please email us instead." };
  }
  return null;
}

function contactFrom(d: { first_name: string; last_name: string; email: string; phone: string; whatsapp?: string; preferred_contact: string; residence_country: string; language: string }): Contact {
  return {
    firstName: d.first_name, lastName: d.last_name, email: d.email, phone: normalizePhone(d.phone, d.residence_country),
    whatsapp: d.whatsapp ? normalizePhone(d.whatsapp, d.residence_country) : undefined,
    preferredContact: d.preferred_contact, residenceCountry: d.residence_country, language: d.language,
  };
}

async function afterCreate(r: AnyRecord, d: { ads_consent: boolean; page_url?: string }, ctx: Ctx) {
  const integrations: Record<string, string> = { storage: kvConfigured ? "upstash" : "memory(dev)" };
  const [crm, capi] = await Promise.all([
    syncPropertyToGhl(r),
    // Meta CAPI only with ad consent. Custom data is the inquiry type — no location, price or documents.
    d.ads_consent
      ? sendCapiEvent({
          eventName: "Lead", eventId: r.submissionId, eventSourceUrl: d.page_url,
          user: { email: r.contact.email, phone: r.contact.phone, firstName: r.contact.firstName, lastName: r.contact.lastName, country: r.contact.residenceCountry, ip: ctx.ip, userAgent: ctx.userAgent, fbc: r.attribution?.fbc, fbp: r.attribution?.fbp, externalId: r.id },
          custom: { content_category: r.kind === "seller" ? "property_seller" : "property_buyer" },
        })
      : Promise.resolve({ status: "skipped" as const }),
  ]);
  r.crm = { ...(r.crm || {}), contactId: crm.contactId ?? r.crm?.contactId, opportunityId: crm.opportunityId ?? r.crm?.opportunityId, lastSync: nowIso(), lastResult: crm.status };
  await db.saveRecord(r);
  if (crm.status === "error") await kv.lpush("pp:ghl_retry", r.id);
  integrations.ghl = crm.status; integrations.meta_capi = capi.status;
  await db.logEvent(r.kind === "seller" ? "seller_inquiry_submitted" : "buyer_inquiry_submitted", { id: r.id, region: r.kind === "seller" ? r.parcel.region : r.wants.regions[0], sandbox: r.sandbox });
  return integrations;
}

/** Shared idempotency: one submission id → one record, one CRM write, one conversion. */
async function claimSubmission(sid: string, kind: "seller" | "buyer"): Promise<{ fresh: true } | { fresh: false; ok: SubmitOk }> {
  const got = await kv.setNX(db.PK.submission(sid), "pending", 60 * 60 * 24 * 30);
  if (got) return { fresh: true };
  const prev = await kv.get(db.PK.submission(sid));
  const id = prev && prev !== "pending" ? prev : null;
  const r = id ? await db.getRecord(kind, id) : null;
  return { fresh: false, ok: { ok: true, id: id || FAKE_ID, reference: r?.reference || "—", token: id ? propertyToken(id) : "", duplicate: true, integrations: { idempotency: "duplicate_suppressed" } } };
}

async function createTask(recordId: string, recordKind: "seller" | "buyer", type: VerificationTask["type"], title: string, assignee?: Role) {
  const t: VerificationTask = { id: randomUUID(), recordId, recordKind, type, title, status: "open", assignee, createdAt: nowIso(), updatedAt: nowIso() };
  await db.saveTask(t); await kv.lpush(db.PK.tasksFor(recordId), t.id);
  return t;
}

export async function submitSeller(body: unknown, ctx: Ctx): Promise<SubmitOk | Fail> {
  const parsed = sellerSchema.safeParse(body);
  if (!parsed.success) {
    const fe = fieldErrors(parsed.error);
    if (fe.company_website) return fake();
    return { ok: false, status: 422, error: "Please check the highlighted fields.", fieldErrors: fe };
  }
  const d = parsed.data;
  if ((ctx.now ?? Date.now()) - d.form_started_at < MIN_FILL_MS) return fake();
  const g = storageGuard(); if (g) return g;
  const claim = await claimSubmission(d.submission_id, "seller");
  if (!claim.fresh) return claim.ok;

  const id = randomUUID();
  const contact = contactFrom(d);
  const parcel = {
    region: d.region, district: d.district, town: d.town, ghanaPostGps: d.ghana_post_gps?.toUpperCase(), locationNotes: d.location_notes,
    sizeValue: d.size_value, sizeUnit: d.size_unit, propertyKind: d.property_kind, propertyUse: d.property_use, occupancy: d.occupancy,
  };
  const ownerKey = ownerKeyFor(contact.email, contact.phone);
  const parcelKey = parcelKeyFor(parcel);
  const r: PropertyLead = {
    id, kind: "seller", createdAt: nowIso(), updatedAt: nowIso(), status: "submitted", legalState: "not_started",
    submissionId: d.submission_id, sandbox: isSandbox(), reference: reference("S", id), contact, sellerRole: d.seller_role, parcel,
    pricing: { askingMinor: minor(d.asking_price), currency: (d.currency as "GHS" | "USD" | undefined) ?? null, negotiability: d.negotiability },
    legal: { titleSelfReport: d.title_self_report, planningStatus: d.planning_status, encumbrance: d.encumbrance, encumbranceNotes: d.encumbrance_notes, documentInventory: d.document_inventory },
    inspection: d.inspection, representation: d.representation, notes: d.notes,
    consents: { contact: true, marketing: d.consent_marketing, privacyAt: nowIso() },
    attribution: d.attribution as Record<string, string>, dedupe: { ownerKey, parcelKey }, assetIds: [],
  };

  // De-duplication that preserves history: same owner + same parcel → linked duplicate (kept, not matched).
  // Same parcel from a DIFFERENT owner → kept as its own record plus a "competing claim" task for staff/counsel.
  const existingParcel = await kv.get(db.PK.parcel(parcelKey));
  const prior = existingParcel ? await db.getSeller(existingParcel) : null;
  // Check the owner's own recent submissions first (covers an owner resubmitting a parcel someone else also claimed).
  for (const oid of await kv.lrange(db.PK.owner("seller", ownerKey), 0, 9)) {
    const o = await db.getSeller(oid);
    if (o && !o.deletedAt && !o.dedupe.duplicateOf && o.dedupe.parcelKey === parcelKey) { r.dedupe.duplicateOf = o.id; await db.audit(o.id, "system", "resubmitted", { duplicateId: id }); break; }
  }
  if (!r.dedupe.duplicateOf && prior && !prior.deletedAt && prior.dedupe.ownerKey === ownerKey) { r.dedupe.duplicateOf = prior.id; await db.audit(prior.id, "system", "resubmitted", { duplicateId: id }); }
  await db.saveRecord(r); await db.indexRecord(r);
  if (!prior || prior.deletedAt) await kv.set(db.PK.parcel(parcelKey), id);
  await kv.lpush(db.PK.owner("seller", ownerKey), id);
  await kv.set(db.PK.submission(d.submission_id), id, 60 * 60 * 24 * 30);
  await db.audit(id, "client", "seller_submitted", { region: r.parcel.region, kind: r.parcel.propertyKind, duplicateOf: r.dedupe.duplicateOf });
  await createTask(id, "seller", "contact", "Verify seller identity and authority to sell (owner / family / agent)", "reviewer");
  if (prior && !prior.deletedAt && prior.dedupe.ownerKey !== ownerKey && !r.dedupe.duplicateOf) {
    await createTask(id, "seller", "counsel", `Possible competing claim: same parcel already submitted as ${prior.reference} by another party`, "legal_reviewer");
    await db.audit(prior.id, "system", "competing_submission", { otherId: id });
  }
  if (d.encumbrance === "yes") await createTask(id, "seller", "counsel", "Seller disclosed a dispute / encumbrance — counsel to review before any introduction", "legal_reviewer");

  const integrations = await afterCreate(r, d, ctx);
  return { ok: true, id, reference: r.reference, token: propertyToken(id), duplicate: false, integrations };
}

export async function submitBuyer(body: unknown, ctx: Ctx): Promise<SubmitOk | Fail> {
  const parsed = buyerSchema.safeParse(body);
  if (!parsed.success) {
    const fe = fieldErrors(parsed.error);
    if (fe.company_website) return fake();
    return { ok: false, status: 422, error: "Please check the highlighted fields.", fieldErrors: fe };
  }
  const d = parsed.data;
  if ((ctx.now ?? Date.now()) - d.form_started_at < MIN_FILL_MS) return fake();
  const g = storageGuard(); if (g) return g;
  const claim = await claimSubmission(d.submission_id, "buyer");
  if (!claim.fresh) return claim.ok;

  const id = randomUUID();
  const contact = contactFrom(d);
  const ownerKey = ownerKeyFor(contact.email, contact.phone);
  const r: BuyerRequirement = {
    id, kind: "buyer", createdAt: nowIso(), updatedAt: nowIso(), status: "submitted", legalState: "not_required_yet",
    submissionId: d.submission_id, sandbox: isSandbox(), reference: reference("B", id), contact, buyerRole: d.buyer_role, eligibility: d.eligibility,
    wants: {
      regions: d.regions, areas: d.areas, propertyKinds: d.property_kinds, propertyUse: d.property_use,
      sizeMin: d.size_min, sizeMax: d.size_max, sizeUnit: d.size_unit,
      budgetMinMinor: minor(d.budget_min), budgetMaxMinor: minor(d.budget_max), currency: d.currency as "GHS" | "USD",
      timeline: d.timeline, financing: d.financing, intendedUse: d.intended_use, tenure: d.tenure, mustHaves: d.must_haves,
      siteVisit: d.site_visit, counsel: d.counsel,
    },
    consents: { contact: true, marketing: d.consent_marketing, privacyAt: nowIso() },
    attribution: d.attribution as Record<string, string>, dedupe: { ownerKey },
  };
  // Same buyer resubmitting: keep history, link to their latest active requirement only if identical regions/types.
  const prevIds = await kv.lrange(db.PK.owner("buyer", ownerKey), 0, 4);
  for (const pid of prevIds) {
    const p = await db.getBuyer(pid);
    if (p && isMatchable(p) && p.wants.regions.join() === r.wants.regions.join() && p.wants.propertyKinds.join() === r.wants.propertyKinds.join()) {
      r.dedupe.duplicateOf = p.id; await db.audit(p.id, "system", "resubmitted", { duplicateId: id }); break;
    }
  }
  await db.saveRecord(r); await db.indexRecord(r);
  await kv.lpush(db.PK.owner("buyer", ownerKey), id);
  await kv.set(db.PK.submission(d.submission_id), id, 60 * 60 * 24 * 30);
  await db.audit(id, "client", "buyer_submitted", { regions: r.wants.regions, duplicateOf: r.dedupe.duplicateOf });
  await createTask(id, "buyer", "contact", "Verify buyer contact and confirm requirements", "reviewer");
  if (["non_ghanaian", "company", "not_sure"].includes(d.eligibility) || d.tenure === "advise" || d.counsel === "need_referral") {
    await createTask(id, "buyer", "counsel", "Refer buyer to Ghanaian counsel: eligibility / tenure (self-reported, not verified)", "legal_reviewer");
  }
  const integrations = await afterCreate(r, d, ctx);
  return { ok: true, id, reference: r.reference, token: propertyToken(id), duplicate: false, integrations };
}

/* ───────────── Seller uploads (private) ───────────── */

export async function requestPropertyUpload(id: string, body: unknown) {
  const p = uploadRequestSchema.safeParse(body);
  if (!p.success) return { ok: false as const, status: 400, error: "Invalid upload request" };
  const r = /^[0-9a-f-]{36}$/i.test(id) && verifyPropertyToken(id, p.data.token) ? await db.getSeller(id) : null;
  if (!r || r.deletedAt) return { ok: false as const, status: 404, error: "Not found" };
  if (terminalStatuses.includes(r.status)) return { ok: false as const, status: 409, error: "This inquiry is closed to uploads." };
  if (Date.now() - Date.parse(r.createdAt) > propertyUploadPolicy.uploadWindowHours * 3600_000) return { ok: false as const, status: 410, error: "This upload link has expired. Reply to our message and we'll send a new secure link." };
  const types = p.data.category === "media" ? propertyUploadPolicy.media : propertyUploadPolicy.documents;
  const ext = types[p.data.content_type];
  if (!ext) return { ok: false as const, status: 415, error: p.data.category === "media" ? "Photos (JPG, PNG, WEBP, HEIC) or videos (MP4, MOV) only." : "PDF or image files only." };
  const store = documentStore();
  if (p.data.size > store.maxBytes) return { ok: false as const, status: 413, error: `Files must be under ${Math.floor(store.maxBytes / 1024 / 1024)} MB${store.name === "local" ? " on this test site" : ""}.` };
  if (r.assetIds.length >= propertyUploadPolicy.maxFilesPerRecord) return { ok: false as const, status: 409, error: "Upload limit reached. We'll request anything else directly." };
  const assetId = randomUUID();
  const a: PropertyAsset = {
    id: assetId, ownerId: id, ownerKind: "seller", category: p.data.category, docType: p.data.doc_type, contentType: p.data.content_type, size: p.data.size,
    storageKey: `property/${id}/${assetId}.${ext}`, filename: p.data.filename.replace(/[^\w.\- ()]/g, "_").slice(0, 120),
    uploadedAt: nowIso(), status: "pending_upload", scan: "not_scanned",
  };
  await db.saveAsset(a); r.assetIds.push(assetId); await db.saveRecord(r);
  const upload = await store.signUpload(a.storageKey, a.contentType, a.size, propertyUploadPolicy.signedUrlTtlSec);
  await db.audit(id, "client", "upload_url_issued", { assetId, category: a.category, size: a.size });
  return { ok: true as const, assetId, upload };
}

export function sniffMedia(b: Uint8Array, ct: string) {
  if (ct === "video/mp4" || ct === "video/quicktime") return String.fromCharCode(...Array.from(b.slice(4, 8))) === "ftyp" || String.fromCharCode(...Array.from(b.slice(4, 8))) === "moov";
  return sniffMatches(b, ct);
}

/** Optional malware scan hook: PROPERTY_SCAN_URL receives the bytes and returns {clean:boolean}. */
async function scan(body: Uint8Array): Promise<PropertyAsset["scan"]> {
  const url = process.env.PROPERTY_SCAN_URL;
  if (!url) return "not_scanned";
  try {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/octet-stream", ...(process.env.PROPERTY_SCAN_TOKEN ? { Authorization: `Bearer ${process.env.PROPERTY_SCAN_TOKEN}` } : {}) }, body: Buffer.from(body) });
    const j = (await res.json().catch(() => ({}))) as { clean?: boolean };
    return res.ok ? (j.clean ? "clean" : "infected") : "error";
  } catch { return "error"; }
}

export async function confirmPropertyUpload(id: string, assetId: string, token: string | undefined) {
  const r = /^[0-9a-f-]{36}$/i.test(id) && verifyPropertyToken(id, token) ? await db.getSeller(id) : null;
  const a = r ? await db.getAsset(assetId) : null;
  if (!r || !a || a.ownerId !== id) return { ok: false as const, status: 404, error: "Not found" };
  const obj = await documentStore().get(a.storageKey);
  if (!obj) return { ok: false as const, status: 409, error: "Upload not received yet" };
  if (!sniffMedia(obj.body, a.contentType)) {
    a.status = "rejected"; await db.saveAsset(a); await documentStore().remove(a.storageKey);
    await db.audit(id, "client", "upload_rejected", { assetId, reason: "content does not match declared type" });
    return { ok: false as const, status: 415, error: "That file doesn't look like the type it claims to be." };
  }
  a.scan = await scan(obj.body);
  if (a.scan === "infected") { a.status = "rejected"; await db.saveAsset(a); await documentStore().remove(a.storageKey); await db.audit(id, "system", "upload_quarantined", { assetId }); return { ok: false as const, status: 422, error: "This file was rejected by our security scan." }; }
  a.status = "uploaded"; await db.saveAsset(a);
  await db.audit(id, "client", "upload_confirmed", { assetId, category: a.category, scan: a.scan });
  return { ok: true as const };
}

/* ───────────── Public privacy requests ───────────── */

export async function createPrivacyRequest(body: unknown) {
  const p = privacyRequestSchema.safeParse(body);
  if (!p.success) {
    const fe = fieldErrors(p.error);
    if (fe.company_website) return { ok: true as const, id: FAKE_ID };
    return { ok: false as const, status: 422, error: "Please check the highlighted fields.", fieldErrors: fe };
  }
  const g = storageGuard(); if (g) return g;
  const req: PrivacyRequest = { id: randomUUID(), type: p.data.type, createdAt: nowIso(), reference: p.data.reference, email: p.data.email, message: p.data.message, status: "open" };
  await db.saveRequest(req); await kv.lpush(db.PK.requests, req.id);
  await db.audit(req.id, "client", `privacy_request_${req.type}`, { reference: req.reference });
  return { ok: true as const, id: req.id };
}

/* ───────────── Staff actions ───────────── */

type Result = { ok: true; detail?: Record<string, unknown> } | { ok: false; status: number; error: string };
const deny = (error: string, status = 403): Result => ({ ok: false, status, error });

export async function transition(r: AnyRecord, to: LeadStatus, role: Role, note?: string): Promise<Result> {
  if (r.deletedAt) return deny("Record data has been deleted", 409);
  if (!leadTransitions[r.status].includes(to)) return deny(`Cannot move from ${r.status} to ${to}`, 409);
  const allowed = transitionRoles[to];
  if (allowed && !allowed.includes(role)) return deny(`Your role (${role}) cannot set ${to}`);
  if (to === "approved_for_introduction" && r.kind === "seller") {
    const auth = await db.currentAuthorization(r.id);
    if (!auth || auth.revokedAt || !auth.shareDetailsWithMatchedBuyers) return deny("Record the seller's written authorisation to share details before approving for introduction", 409);
    if (r.legalState === "counsel_flagged") return deny("Counsel flagged this property — resolve before approving", 409);
  }
  const from = r.status; r.status = to; await db.saveRecord(r);
  await db.audit(r.id, role, "status_changed", { from, to, note });
  if (to === "withdrawn" || to === "lost" || to === "closed") await closeMatchesFor(r, role, to);
  if (to === "withdrawn" && r.kind === "seller") await revokeAuthorization(r.id, role, "Listing withdrawn");
  await syncPropertyToGhl(r).then(async (s) => { r.crm = { ...(r.crm || {}), lastSync: nowIso(), lastResult: s.status }; await db.saveRecord(r); });
  return { ok: true };
}

export async function setLegalState(r: AnyRecord, state: LegalState, role: Role, note?: string): Promise<Result> {
  if (!can.legalReview(role)) return deny("Only admin or legal reviewer can change the legal review state");
  const from = r.legalState; r.legalState = state; await db.saveRecord(r);
  await db.audit(r.id, role, "legal_state_changed", { from, to: state, note });
  return { ok: true };
}

export async function recordAuthorization(propertyId: string, role: Role, a: Omit<SellerAuthorization, "id" | "propertyId" | "createdAt" | "recordedBy">): Promise<Result> {
  if (!can.recordAuthorization(role)) return deny("Only an admin can record seller authorisation");
  const r = await db.getSeller(propertyId);
  if (!r || r.deletedAt) return deny("Not found", 404);
  if (!a.evidence || a.evidence.trim().length < 5) return deny("Describe the evidence (e.g. signed authorisation dated …)", 422);
  // Public listing needs every gate (spec: authorisation, factual review, image permission, separate index consent).
  const publicListing = a.publicListing && a.factualReviewDone && a.imagePermission;
  const auth: SellerAuthorization = { ...a, publicListing, searchIndexConsent: publicListing && a.searchIndexConsent, id: randomUUID(), propertyId, createdAt: nowIso(), recordedBy: role };
  await db.saveAuthorization(auth);
  await db.audit(propertyId, role, "authorization_recorded", { authId: auth.id, share: auth.shareDetailsWithMatchedBuyers, contact: auth.shareContactAfterApproval, publicListing: auth.publicListing, index: auth.searchIndexConsent });
  return { ok: true, detail: { authorizationId: auth.id } };
}

export async function revokeAuthorization(propertyId: string, role: Role | "system", reason: string) {
  const a = await db.currentAuthorization(propertyId);
  if (!a || a.revokedAt) return;
  a.revokedAt = nowIso(); a.revokedReason = reason; await db.saveAuthorization(a);
  await db.audit(propertyId, role, "authorization_revoked", { authId: a.id, reason });
}

async function closeMatchesFor(r: AnyRecord, role: Role, why: string) {
  for (const m of await db.listMatches()) {
    if ((m.propertyId === r.id || m.buyerId === r.id) && !["rejected", "closed"].includes(m.status)) {
      m.status = "closed"; m.reviewNote = `Closed: ${r.kind} ${why}`; await db.saveMatch(m);
      await db.audit(m.id, role, "match_closed", { reason: why });
    }
  }
}

async function fx() { return (await getPriceSettings()).fx; }

/** Runs deterministic matching for one record and stores new suggestions (one per pair, ever). */
export async function runMatching(kind: "seller" | "buyer", id: string, role: Role): Promise<Result> {
  if (!can.runMatching(role)) return deny("Your role cannot run matching");
  const subject = await db.getRecord(kind, id);
  if (!subject) return deny("Not found", 404);
  if (!isMatchable(subject)) return deny("This record is withdrawn, closed, deleted or a duplicate and cannot be matched", 409);
  const rate = await fx();
  const pool = kind === "seller" ? await db.listBuyers() : await db.listSellers();
  const ranked = rankCandidates(subject, pool as (PropertyLead | BuyerRequirement)[], rate);
  const created: string[] = [];
  for (const { record, result } of ranked.slice(0, 25)) {
    const pId = kind === "seller" ? subject.id : record.id;
    const bId = kind === "seller" ? record.id : subject.id;
    const matchId = randomUUID();
    if (!(await db.claimPair(pId, bId, matchId))) {
      const existing = await db.pairMatchId(pId, bId);
      const m = existing ? await db.getMatch(existing) : null;
      if (m && m.status === "suggested") { m.score = result.score; m.reasons = result.reasons; m.blockers = result.blockers; await db.saveMatch(m); }
      continue;
    }
    const m: Match = { id: matchId, propertyId: pId, buyerId: bId, createdAt: nowIso(), updatedAt: nowIso(), status: "suggested", score: result.score, reasons: result.reasons, blockers: result.blockers, fx: rate ? { ...rate, usedAt: nowIso() } : null };
    await db.saveMatch(m); await kv.lpush(db.PK.matches, m.id); created.push(m.id);
    await db.audit(m.id, role, "match_suggested", { propertyId: pId, buyerId: bId, score: m.score });
    const p = kind === "seller" ? subject as PropertyLead : record as PropertyLead;
    const b = kind === "seller" ? record as BuyerRequirement : subject as BuyerRequirement;
    await notifyStaffOfMatch({ matchId: m.id, propertyRef: p.reference, buyerRef: b.reference, score: m.score, region: p.parcel.region });
  }
  await db.audit(subject.id, role, "matching_run", { candidates: ranked.length, created: created.length });
  return { ok: true, detail: { candidates: ranked.length, created } };
}

export async function reviewMatch(matchId: string, decision: "reviewed" | "rejected", role: Role, note?: string): Promise<Result> {
  if (!can.runMatching(role)) return deny("Your role cannot review matches");
  const m = await db.getMatch(matchId);
  if (!m) return deny("Not found", 404);
  if (m.status !== "suggested" && m.status !== "reviewed") return deny(`Match is ${m.status}`, 409);
  m.status = decision; m.reviewedBy = role; m.reviewNote = note; await db.saveMatch(m);
  await db.audit(m.id, role, "match_reviewed", { decision, note });
  await db.logEvent("match_reviewed", { matchId, decision, score: m.score });
  await sendGa4Event({ clientId: m.buyerId, name: "match_reviewed", params: { decision, score: m.score } }).catch(() => null);
  return { ok: true };
}

/**
 * Introduction approval — every gate is server-enforced:
 *  admin role · match reviewed · both records active (not withdrawn/closed/deleted/duplicate) · current, unrevoked
 *  seller authorisation to share details · seller approved for introduction · counsel has not flagged the property.
 * Approving creates an introductions row; staff then make the introduction personally (no automated sharing).
 */
export async function approveIntroduction(matchId: string, role: Role, note?: string): Promise<Result> {
  if (!can.approveIntroduction(role)) return deny("Only an admin can approve an introduction");
  const m = await db.getMatch(matchId);
  if (!m) return deny("Not found", 404);
  if (m.status !== "reviewed") return deny("Review the match before approving an introduction", 409);
  const [p, b] = await Promise.all([db.getSeller(m.propertyId), db.getBuyer(m.buyerId)]);
  if (!p || !b) return deny("Record missing", 404);
  if (!isMatchable(p) || !isMatchable(b)) return deny("One side is withdrawn, closed, deleted or a duplicate", 409);
  const auth = await db.currentAuthorization(p.id);
  if (!auth || auth.revokedAt || !auth.shareDetailsWithMatchedBuyers) return deny("No current seller authorisation to share details", 409);
  if (!["approved_for_introduction", "matched"].includes(p.status)) return deny("Seller must be approved for introduction first", 409);
  if (!["approved_for_introduction", "matched", "reviewed"].includes(b.status)) return deny("Buyer must be reviewed first", 409);
  if (p.legalState === "counsel_flagged") return deny("Counsel flagged this property", 409);
  const check = evaluateMatch(p, b, await fx());
  if (!check.eligible) return deny(`No longer a match: ${check.blockers.join("; ")}`, 409);

  const intro = { id: randomUUID(), matchId, propertyId: p.id, buyerId: b.id, createdAt: nowIso(), approvedBy: role, sellerAuthorizationId: auth.id, status: "approved" as const, note };
  await db.saveIntro(intro); await kv.lpush(db.PK.intros, intro.id);
  m.status = "introduction_approved"; await db.saveMatch(m);
  for (const r of [p, b] as AnyRecord[]) { if (r.status !== "introduction_authorized") { const from = r.status; r.status = "introduction_authorized"; await db.saveRecord(r); await db.audit(r.id, role, "status_changed", { from, to: r.status, matchId }); await syncPropertyToGhl(r); } }
  await db.audit(m.id, role, "introduction_approved", { introId: intro.id, authId: auth.id });
  await db.logEvent("introduction_approved", { matchId, introId: intro.id });
  await sendGa4Event({ clientId: b.attribution?.ga_client_id || b.id, name: "introduction_approved", params: { region: p.parcel.region } }).catch(() => null);
  return { ok: true, detail: { introductionId: intro.id } };
}

/** Data deletion: purges stored files, scrubs personal and location data, keeps a minimal audit tombstone. */
export async function deleteRecordData(kind: "seller" | "buyer", id: string, role: Role, reason: string): Promise<Result> {
  if (!can.deleteData(role)) return deny("Only an admin can delete data");
  const r = await db.getRecord(kind, id);
  if (!r) return deny("Not found", 404);
  if (r.kind === "seller") {
    for (const aid of r.assetIds) {
      const a = await db.getAsset(aid);
      if (a && a.status !== "purged") { await documentStore().remove(a.storageKey).catch(() => null); a.status = "purged"; a.filename = "[deleted]"; await db.saveAsset(a); }
    }
    r.parcel = { ...r.parcel, district: "[deleted]", town: "[deleted]", ghanaPostGps: undefined, locationNotes: undefined };
    r.legal = { ...r.legal, encumbranceNotes: undefined }; r.notes = undefined;
    await revokeAuthorization(r.id, role, "Data deleted");
  } else {
    r.wants = { ...r.wants, areas: undefined, mustHaves: undefined };
  }
  r.contact = { firstName: "[deleted]", lastName: "", email: `deleted+${r.id.slice(0, 8)}@invalid`, phone: "", preferredContact: r.contact.preferredContact, residenceCountry: r.contact.residenceCountry, language: r.contact.language };
  r.attribution = undefined; r.deletedAt = nowIso();
  if (!terminalStatuses.includes(r.status)) r.status = "withdrawn";
  await db.saveRecord(r);
  await closeMatchesFor(r, role, "deleted");
  await db.audit(r.id, role, "data_deleted", { reason });
  return { ok: true };
}

/** Retention: purge files for records that have been closed/lost/withdrawn longer than retentionDays. */
export async function purgeExpired(role: Role): Promise<Result> {
  if (!can.deleteData(role)) return deny("Only an admin can purge files");
  const cutoff = Date.now() - propertyUploadPolicy.retentionDays * 86400_000;
  let purged = 0;
  for (const r of await db.listSellers()) {
    if (!terminalStatuses.includes(r.status) || Date.parse(r.updatedAt) > cutoff) continue;
    for (const aid of r.assetIds) {
      const a = await db.getAsset(aid);
      if (a && a.status === "uploaded") { await documentStore().remove(a.storageKey).catch(() => null); a.status = "purged"; await db.saveAsset(a); purged++; }
    }
  }
  await db.audit("retention", role, "retention_purge", { purged, retentionDays: propertyUploadPolicy.retentionDays });
  return { ok: true, detail: { purged } };
}

export async function addTask(recordId: string, kind: "seller" | "buyer", type: VerificationTask["type"], title: string, role: Role) {
  const r = await db.getRecord(kind, recordId);
  if (!r) return deny("Not found", 404);
  const t = await createTask(recordId, kind, type, title.slice(0, 200));
  await db.audit(recordId, role, "task_added", { taskId: t.id, type });
  return { ok: true as const, detail: { taskId: t.id } };
}

export async function updateTask(taskId: string, status: VerificationTask["status"], role: Role, note?: string): Promise<Result> {
  const t = await db.getTask(taskId);
  if (!t) return deny("Not found", 404);
  if (t.type === "counsel" && !can.legalReview(role)) return deny("Only admin or legal reviewer can close counsel tasks");
  t.status = status; t.note = note; await db.saveTask(t);
  await db.audit(t.recordId, role, "task_updated", { taskId, status });
  return { ok: true };
}

/* ───────────── Role-scoped admin projections ───────────── */

export function staffView(r: AnyRecord, role: Role) {
  const out = JSON.parse(JSON.stringify(r)) as AnyRecord;
  if (!can.viewContact(role)) (out as { contact: Partial<Contact> }).contact = { firstName: r.contact.firstName.slice(0, 1) + ".", residenceCountry: r.contact.residenceCountry, preferredContact: r.contact.preferredContact, language: r.contact.language };
  if (out.kind === "seller" && !can.viewExactLocation(role)) { out.parcel.ghanaPostGps = out.parcel.ghanaPostGps ? "[restricted]" : undefined; out.parcel.locationNotes = out.parcel.locationNotes ? "[restricted]" : undefined; }
  return out;
}

export const summary = (r: AnyRecord) => ({
  id: r.id, kind: r.kind, reference: r.reference, createdAt: r.createdAt, status: r.status, legalState: r.legalState, sandbox: r.sandbox,
  deleted: Boolean(r.deletedAt), duplicateOf: r.dedupe.duplicateOf, residence: r.contact.residenceCountry,
  where: r.kind === "seller" ? coarseLocation(r.parcel) : r.wants.regions.join(", "),
  type: r.kind === "seller" ? r.parcel.propertyKind : r.wants.propertyKinds.join(", "),
});
