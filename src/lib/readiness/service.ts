import "server-only";
import { randomUUID } from "node:crypto";
import { intakeSchema, type Intake } from "./schema";
import {
  canTitleTransition, canTransition, caseNumberFor, siteVisitDocumented, siteChecks, type CaseStatus, type CounselRecord, type CostBand,
  type PermitItem, type Rating, type ReadinessCase, type RecommendationDecision, type SiteCheckKey, type TitleStatus,
} from "./model";
import { audit, caseForSession, claimEvent, getCase, indexCase, linkSession, recordRevenue, saveCase } from "./store";
import { caseToken, productionReady } from "./secrets";
import { checkoutProvider, currencyFor, type PaymentEvent } from "./payments";
import { getPriceSettings, SANDBOX_TEST_MINOR } from "./pricing";
import { documentStore } from "./storage";
import { syncCaseToGhl } from "./crm";
import { sendClientEmail } from "./notify";
import { documentInventory, readiness, uploadPolicy } from "@/config/readiness";
import { sendCapiEvent } from "@/lib/server/meta-capi";
import { sendGa4Event } from "@/lib/server/ga4-mp";
import { sendOpenAiEvent } from "@/lib/openai-ads/server";
import { uploadOfflineConversion } from "@/lib/server/google-ads";
import { sendIntentEvent } from "@/lib/server/intent";
import { kv, kvConfigured } from "@/lib/server/kv";

type Fail = { ok: false; status: number; error: string; fieldErrors?: Record<string, string> };

/* ───────────── Intake ───────────── */

export async function createCase(body: unknown, ctx: { ip: string; userAgent: string }): Promise<{ ok: true; caseId: string; token: string; duplicate: boolean } | Fail> {
  if (!productionReady(kvConfigured)) {
    console.error("[readiness] intake refused: production needs READINESS_TOKEN_SECRET and Upstash before taking cases");
    return { ok: false, status: 503, error: "Online booking for the Readiness Review opens soon. Please request an assessment or book a call and we'll set it up with you." };
  }
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const i of parsed.error.issues) fieldErrors[i.path.join(".") || "_"] ??= i.message;
    if (fieldErrors.company_website) return { ok: false, status: 400, error: "Rejected" };
    return { ok: false, status: 422, error: "Please check the highlighted fields.", fieldErrors };
  }
  const d: Intake = parsed.data;
  if (Date.now() - d.form_started_at < 4000) return { ok: false, status: 400, error: "Please take a moment to review your answers." };

  // Idempotent on submission id: re-submitting returns the same case.
  const caseId = d.submission_id;
  const fresh = await kv.setNX(`rr:lock:${caseId}`, "1", 60 * 60 * 24 * 30);
  if (!fresh) {
    const existing = await getCase(caseId);
    if (existing && existing.contact.email === d.email) return { ok: true, caseId, token: caseToken(caseId), duplicate: true };
    return { ok: false, status: 409, error: "This form was already submitted. Please refresh the page." };
  }

  const now = new Date().toISOString();
  const c: ReadinessCase = {
    id: caseId, caseNumber: caseNumberFor(caseId), createdAt: now, updatedAt: now, status: "awaiting_payment", paymentStatus: "unpaid",
    titleStatus: "unverified", sandbox: false,
    contact: { firstName: d.first_name, lastName: d.last_name, email: d.email, phone: d.phone, whatsappSame: d.whatsapp_same, country: d.current_country, preferredContact: d.preferred_contact, timeZone: d.time_zone },
    parcel: {
      region: d.ghana_region, district: d.district, locality: d.locality, gps: d.gps || undefined,
      mapPin: d.map_lat !== undefined && d.map_lng !== undefined ? { lat: d.map_lat, lng: d.map_lng } : undefined,
      plotNumber: d.plot_number || undefined, area: d.land_area || undefined, areaUnit: d.area_unit, access: d.access, controller: d.land_controller, acquired: d.acquired,
      siteContact: d.site_contact_name || d.site_contact_phone ? { name: d.site_contact_name || undefined, phone: d.site_contact_phone || undefined, relationship: d.site_contact_relationship || undefined } : undefined,
    },
    project: {
      use: d.intended_use, useOther: d.use_other || undefined, floorArea: d.floor_area || undefined, units: d.units || undefined, floors: d.floors || undefined,
      finish: d.finish, description: d.description || undefined, budgetBand: d.budget_band, budgetCurrency: d.budget_currency, funds: d.funds,
      landIncluded: d.land_included, targetStart: d.target_start || undefined, designStatus: d.design_status, addOns: d.add_ons, concerns: d.concerns || undefined,
    },
    inventory: d.inventory,
    consents: { authority: d.consent_authority, privacy: d.consent_privacy, scope: d.consent_scope, marketing: d.consent_marketing, siteContact: d.consent_site_contact, adsConsent: d.ads_consent, at: now },
    attribution: d.attribution, pageUrl: d.page_url,
    documents: [], findings: {}, internalNotes: [], ops: { tasks: [] }, siteVisit: { checklist: {} }, permits: [], reports: [],
  };

  await saveCase(c);
  await indexCase(caseId);
  await audit(caseId, "client", "intake_submitted", { caseNumber: c.caseNumber, missingDocs: Object.values(d.inventory).filter((v) => v !== "available").length, ipHashPrefix: ctx.ip ? ctx.ip.split(".").slice(0, 2).join(".") : undefined });
  const crm = await syncCaseToGhl(c);
  await recordCrm(c, crm);
  return { ok: true, caseId, token: caseToken(caseId), duplicate: false };
}

async function recordCrm(c: ReadinessCase, r: Awaited<ReturnType<typeof syncCaseToGhl>>) {
  c.crm = { contactId: r.contactId ?? c.crm?.contactId, opportunityId: r.opportunityId ?? c.crm?.opportunityId, lastSync: new Date().toISOString(), lastResult: r.status };
  await saveCase(c);
  if (r.status === "error") { await kv.lpush("rr:ghl_retry", c.id); await audit(c.id, "system", "crm_sync_failed", { detail: r.detail }); }
}

/* ───────────── Checkout ───────────── */

export async function startCheckout(caseId: string, choice: "stripe" | "paystack", origin: string, token: string) {
  const c = await getCase(caseId);
  if (!c) return { ok: false as const, status: 404, error: "Case not found" };
  if (c.paymentStatus === "paid") return { ok: false as const, status: 409, error: "This review is already paid." };
  if (!["awaiting_payment", "payment_failed"].includes(c.status)) return { ok: false as const, status: 409, error: "Checkout is not available for this case." };

  const provider = checkoutProvider(choice);
  if (!provider) return { ok: false as const, status: 503, error: "Online payment isn't available yet. We'll email you a secure payment link." };

  const currency = currencyFor(choice);
  const price = await getPriceSettings();
  const configured = currency === "USD" ? price.usdMinor : price.ghsMinor;
  let amountMinor = configured;
  if (!amountMinor) {
    if (provider.name !== "mock") return { ok: false as const, status: 503, error: "The review fee hasn't been published yet. We'll confirm it with you by email." };
    amountMinor = SANDBOX_TEST_MINOR; // sandbox only — labelled as a test value on the sandbox checkout page
  }

  const caseUrl = `${origin}${readiness.path}/case/${caseId}?t=${encodeURIComponent(token)}`;
  const session = await provider.createSession({
    caseId, amountMinor, currency, email: c.contact.email, description: readiness.name,
    successUrl: `${caseUrl}&paid=1`, cancelUrl: `${caseUrl}&cancelled=1`,
    idempotencyKey: `rr-checkout-${caseId}-${choice}-${amountMinor}`,
    metadata: { case_id: caseId, product: "readiness_review" },
  });
  await linkSession(session.sessionId, caseId);
  c.payment = { provider: session.provider, sessionId: session.sessionId, reference: session.reference, amountMinor, currency, sandbox: session.sandbox };
  c.paymentStatus = "pending";
  c.status = "awaiting_payment";
  c.sandbox = session.sandbox;
  await saveCase(c);
  await audit(caseId, "client", "checkout_started", { provider: session.provider, emulates: choice, amountMinor, currency, sandbox: session.sandbox, priceConfigured: Boolean(configured) });
  return { ok: true as const, url: session.url, provider: session.provider, sandbox: session.sandbox, amountMinor, currency, priceConfigured: Boolean(configured) };
}

/* ───────────── Payment events (webhooks) ───────────── */

export async function handlePaymentEvent(e: PaymentEvent, ctx: { ip?: string; userAgent?: string } = {}) {
  if (e.type === "ignored") return { ok: true, ignored: true };
  if (!(await claimEvent(e.provider, e.eventId))) return { ok: true, duplicate: true };

  const caseId = e.caseId || (e.sessionId ? await caseForSession(e.sessionId) : null);
  const c = caseId ? await getCase(caseId) : null;
  if (!c) { console.error("[readiness] payment event for unknown case", e.provider, e.eventId); return { ok: false, error: "unknown case" }; }

  if (e.type === "paid") {
    if (c.paymentStatus === "paid") return { ok: true, alreadyPaid: true };
    if (c.payment?.amountMinor && e.amountMinor && e.amountMinor < c.payment.amountMinor) {
      await audit(c.id, "provider", "payment_amount_mismatch", { expected: c.payment.amountMinor, got: e.amountMinor });
      return { ok: false, error: "amount mismatch" };
    }
    const sandbox = e.provider === "mock" || Boolean(e.sandbox);
    c.paymentStatus = "paid";
    c.status = "paid";
    c.payment = { ...(c.payment ?? { provider: e.provider }), provider: c.payment?.provider ?? e.provider, paidAt: new Date().toISOString(), amountMinor: e.amountMinor ?? c.payment?.amountMinor, currency: e.currency ?? c.payment?.currency, sandbox };
    c.sandbox = sandbox;
    await saveCase(c);
    await audit(c.id, "provider", "payment_confirmed", { provider: e.provider, eventId: e.eventId, amountMinor: c.payment.amountMinor, currency: c.payment.currency, sandbox });
    await afterPaid(c, ctx);
  } else if (e.type === "failed" || e.type === "expired") {
    if (c.paymentStatus !== "paid") { c.paymentStatus = "failed"; c.status = "payment_failed"; await saveCase(c); }
    await audit(c.id, "provider", `payment_${e.type}`, { provider: e.provider, eventId: e.eventId });
  } else if (e.type === "refunded") {
    await markRefunded(c, "provider", `${e.provider} event ${e.eventId}`);
  }
  const crm = await syncCaseToGhl(c);
  await recordCrm(c, crm);
  return { ok: true, caseId: c.id, status: c.status };
}

/** Revenue attribution + server-side conversions for a paid review (deduped by case id). */
async function afterPaid(c: ReadinessCase, ctx: { ip?: string; userAgent?: string }) {
  const a = c.attribution ?? {};
  const value = (c.payment?.amountMinor ?? 0) / 100;
  const currency = c.payment?.currency ?? "USD";
  await recordRevenue({
    stream: "readiness_review", caseId: c.id, amountMinor: c.payment?.amountMinor ?? 0, currency, provider: c.payment?.provider ?? "unknown",
    sandbox: c.sandbox, at: new Date().toISOString(), source: a.utm_source, medium: a.utm_medium, campaign: a.utm_campaign,
    firstTouchSource: a.first_touch_source, clickIds: ["gclid", "gbraid", "wbraid", "fbclid", "openai_oppref"].filter((k) => a[k]),
  });
  if (c.sandbox) { await audit(c.id, "system", "conversions_skipped_sandbox"); return; } // never report test money to ad platforms
  const eventId = `rr_purchase_${c.id}`; // browser purchase event uses the same id → dedup
  const ads = c.consents.adsConsent; // ad platforms only with advertising consent; analytics event carries no PII
  const [meta, ga4, openai, gads, intent] = await Promise.all([
    !ads ? Promise.resolve({ status: "skipped" as const }) : sendCapiEvent({ eventName: "Purchase", eventId, eventSourceUrl: c.pageUrl, actionSource: "website",
      user: { email: c.contact.email, phone: c.contact.phone, firstName: c.contact.firstName, lastName: c.contact.lastName, country: c.contact.country, ip: ctx.ip, userAgent: ctx.userAgent, fbc: a.fbc, fbp: a.fbp, externalId: c.id },
      custom: { value, currency, content_name: "readiness_review", revenue_stream: "readiness_review" } }),
    sendGa4Event({ clientId: a.ga_client_id || c.id, name: "payment_confirmed", params: { transaction_id: c.id, value, currency, item_name: "readiness_review", revenue_stream: "readiness_review" } }),
    c.consents.adsConsent
      ? sendOpenAiEvent({ id: eventId, type: "order_created", actionSource: "web", sourceUrl: c.pageUrl, value, currency, oppref: a.openai_oppref,
          user: { email: c.contact.email, phone: c.contact.phone, firstName: c.contact.firstName, lastName: c.contact.lastName, externalId: c.id, obref: a.openai_obref } })
      : Promise.resolve({ sent: false, skipped: "no ad consent" }),
    !ads ? Promise.resolve({ status: "skipped" as const }) : uploadOfflineConversion({ orderId: c.id, gclid: a.gclid, gbraid: a.gbraid, wbraid: a.wbraid, value, currency, at: new Date(), email: c.contact.email }),
    sendIntentEvent({ type: "readiness_paid", email: c.contact.email, value, currency, adsConsent: c.consents.adsConsent }),
  ]);
  await audit(c.id, "system", "conversions_sent", { meta: meta.status, ga4: ga4.status, openai: "sent" in openai && openai.sent ? "ok" : "skipped", google_ads: gads.status, intent: intent.status });
}

/* ───────────── Documents ───────────── */

export async function requestUpload(c: ReadinessCase, r: { docKey: string; filename: string; contentType: string; size: number }, by: "client" | "admin") {
  // Clients may upload from intake onwards (missing documents can follow later without starting over).
  if (["cancelled", "refunded"].includes(c.status) && by === "client") return { ok: false as const, status: 409, error: "This case is closed to new uploads." };
  const ext = uploadPolicy.allowedTypes[r.contentType];
  if (!ext) return { ok: false as const, status: 415, error: "Please upload a PDF, JPG, PNG, WEBP or HEIC file." };
  const store = documentStore();
  if (r.size > store.maxBytes) return { ok: false as const, status: 413, error: `Files must be under ${Math.floor(store.maxBytes / 1024 / 1024)} MB${store.name === "local" ? " in sandbox mode" : ""}.` };
  if (c.documents.filter((d) => d.status === "uploaded").length >= uploadPolicy.maxFilesPerCase) return { ok: false as const, status: 409, error: "Upload limit reached for this case. Contact us to add more." };
  const docId = randomUUID();
  const storageKey = `cases/${c.id}/${docId}.${ext}`;
  c.documents.push({ id: docId, docKey: r.docKey, filename: r.filename.replace(/[^\w.\- ()]/g, "_").slice(0, 120), contentType: r.contentType, size: r.size, storageKey, uploadedAt: new Date().toISOString(), status: "pending_upload", uploadedBy: by });
  await saveCase(c);
  const signed = await store.signUpload(storageKey, r.contentType, r.size, uploadPolicy.signedUrlTtlSec);
  await audit(c.id, by, "upload_url_issued", { docId, docKey: r.docKey, contentType: r.contentType, size: r.size, store: store.name });
  return { ok: true as const, docId, upload: signed, store: store.name };
}

export async function confirmUpload(c: ReadinessCase, docId: string, by: "client" | "admin") {
  const doc = c.documents.find((d) => d.id === docId);
  if (!doc) return { ok: false as const, status: 404, error: "Unknown document" };
  const obj = await documentStore().get(doc.storageKey);
  if (!obj) return { ok: false as const, status: 409, error: "Upload not received yet" };
  // Magic-byte check: the stored bytes must match the declared type.
  if (!sniffMatches(obj.body, doc.contentType)) {
    doc.status = "rejected"; await saveCase(c); await documentStore().remove(doc.storageKey);
    await audit(c.id, by, "upload_rejected", { docId, reason: "content does not match declared type" });
    return { ok: false as const, status: 415, error: "That file doesn't look like the type it claims to be." };
  }
  doc.status = "uploaded";
  if (by === "client" && doc.docKey in c.inventory && c.inventory[doc.docKey] !== "available") c.inventory[doc.docKey] = "available";
  await saveCase(c);
  await audit(c.id, by, "upload_confirmed", { docId, docKey: doc.docKey, size: obj.body.byteLength });
  return { ok: true as const, status: c.status };
}

export function sniffMatches(b: Uint8Array, ct: string) {
  const s = (n: number) => Array.from(b.slice(0, n));
  const eq = (sig: number[], off = 0) => sig.every((v, i) => b[off + i] === v);
  switch (ct) {
    case "application/pdf": return eq([0x25, 0x50, 0x44, 0x46]);
    case "image/jpeg": return eq([0xff, 0xd8, 0xff]);
    case "image/png": return eq([0x89, 0x50, 0x4e, 0x47]);
    case "image/webp": return eq([0x52, 0x49, 0x46, 0x46]) && eq([0x57, 0x45, 0x42, 0x50], 8);
    case "image/heic": case "image/heif": return String.fromCharCode(...s(12).slice(4, 8)) === "ftyp";
    default: return false;
  }
}

/* ───────────── Admin actions ───────────── */

export type AdminAction =
  | { type: "status"; to: CaseStatus; note?: string }
  | { type: "title"; to: TitleStatus; counsel?: Partial<CounselRecord>; note?: string }
  | { type: "finding"; area: string; rating: Rating; notes: string }
  | { type: "summary"; text: string }
  | { type: "note"; text: string }
  | { type: "ops"; reviewer?: string; dueDate?: string; jurisdiction?: string }
  | { type: "task_add"; text: string; due?: string }
  | { type: "task_toggle"; id: string }
  | { type: "site_schedule"; scheduledFor: string; inspector: string }
  | { type: "site_record"; completedAt: string; completedBy: string; checklist: Partial<Record<SiteCheckKey, string>> }
  | { type: "permit_upsert"; item: Omit<PermitItem, "id"> & { id?: string } }
  | { type: "permit_remove"; id: string }
  | { type: "cost"; ghs?: CostBand; floorAreaSqm?: number; finish?: "basic" | "standard" | "high" | "luxury"; assumptions: string; confidence: "low" | "medium" | "high" }
  | { type: "recommendation"; decision: RecommendationDecision; rationale: string; conditions?: string; nextSteps?: string }
  | { type: "approve"; reviewer: string }
  | { type: "deliver"; origin?: string }
  | { type: "refund_mark"; note: string }
  | { type: "engagement"; stage: "pm_proposal" | "won" | "lost" };

/** Server lifecycle events (GA4 MP): deduped per case, skipped for sandbox cases, no PII. */
async function lifecycleEvent(c: ReadinessCase, name: "site_visit_booked" | "report_delivered" | "qualified_project_consultation" | "project_won") {
  if (!(await claimEvent("lifecycle", `${name}:${c.id}`))) return;
  if (c.sandbox) { await audit(c.id, "system", "event_skipped_sandbox", { name }); return; }
  const r = await sendGa4Event({ clientId: c.attribution?.ga_client_id || c.id, name, params: { case_id: c.id, revenue_stream: "readiness_review" } });
  await audit(c.id, "system", "event_sent", { name, ga4: r.status });
}

async function markRefunded(c: ReadinessCase, actor: "admin" | "provider", note: string) {
  if (c.paymentStatus === "refunded") return;
  const wasPaid = c.paymentStatus === "paid";
  c.paymentStatus = "refunded"; c.status = "refunded";
  if (c.payment) { c.payment.refundedAt = new Date().toISOString(); c.payment.refundNote = note.slice(0, 500); }
  await saveCase(c);
  if (wasPaid) await recordRevenue({ stream: "readiness_review", caseId: c.id, amountMinor: -(c.payment?.amountMinor ?? 0), currency: c.payment?.currency ?? "USD", provider: c.payment?.provider ?? "unknown", sandbox: c.sandbox, at: new Date().toISOString(), source: "refund" });
  await audit(c.id, actor, "payment_refunded", { note: note.slice(0, 500) });
}

const fail = (status: number, error: string) => ({ ok: false as const, status, error });

export async function adminAct(caseId: string, a: AdminAction) {
  const c = await getCase(caseId);
  if (!c) return fail(404, "Not found");
  const now = new Date().toISOString();
  switch (a.type) {
    case "status": {
      const g = canTransition(c, a.to); if (!g.ok) return fail(409, g.reason);
      const from = c.status; c.status = a.to; await saveCase(c); await audit(c.id, "admin", "status_changed", { from, to: a.to, note: a.note });
      if (a.to === "needs_more_documents" && a.note) {
        await sendClientEmail({ to: c.contact.email, subject: `${c.caseNumber}: we need a document to continue`, heading: "A document is needed for your Readiness Review",
          body: "Please open your private case page to see what's needed and upload it. You don't need to start over.", linkUrl: clientUrl(c, undefined), linkLabel: "Open my case" });
      }
      break;
    }
    case "title": {
      const counsel = { ...c.counsel, ...Object.fromEntries(Object.entries(a.counsel ?? {}).map(([k, v]) => [k, typeof v === "string" ? v.trim() : v]).filter(([, v]) => v)) } as CounselRecord;
      const g = canTitleTransition(c.titleStatus, a.to, counsel); if (!g.ok) return fail(409, g.reason);
      const from = c.titleStatus; c.titleStatus = a.to; c.counsel = counsel;
      if (["verified_with_qualifications", "adverse_findings", "unable_to_determine"].includes(a.to)) c.counsel.signedOffAt = now;
      await saveCase(c); await audit(c.id, "admin", "title_status_changed", { from, to: a.to, counsel: { firm: counsel.firm, lawyer: counsel.lawyer, reference: counsel.reference } });
      break;
    }
    case "finding": c.findings[a.area] = { rating: a.rating, notes: a.notes.slice(0, 4000) }; await saveCase(c); await audit(c.id, "admin", "finding_updated", { area: a.area, rating: a.rating }); break;
    case "summary": c.summary = a.text.slice(0, 6000); await saveCase(c); await audit(c.id, "admin", "summary_updated"); break;
    case "note": c.internalNotes.unshift({ at: now, by: "admin", text: a.text.slice(0, 4000) }); await saveCase(c); await audit(c.id, "admin", "note_added"); break;
    case "ops":
      c.ops = { ...c.ops, reviewer: a.reviewer?.trim() || c.ops.reviewer, dueDate: a.dueDate || c.ops.dueDate, jurisdiction: a.jurisdiction?.trim() || c.ops.jurisdiction };
      await saveCase(c); await audit(c.id, "admin", "ops_updated", { reviewer: c.ops.reviewer, dueDate: c.ops.dueDate, jurisdiction: c.ops.jurisdiction }); break;
    case "task_add": c.ops.tasks.push({ id: randomUUID().slice(0, 8), text: a.text.slice(0, 300), due: a.due, done: false }); await saveCase(c); await audit(c.id, "admin", "task_added"); break;
    case "task_toggle": { const t = c.ops.tasks.find((x) => x.id === a.id); if (!t) return fail(404, "Unknown task"); t.done = !t.done; await saveCase(c); await audit(c.id, "admin", "task_toggled", { id: t.id, done: t.done }); break; }
    case "site_schedule": {
      if (c.paymentStatus !== "paid") return fail(409, "Payment has not been confirmed");
      if (Number.isNaN(Date.parse(a.scheduledFor)) || !a.inspector.trim()) return fail(400, "Give a date/time and the inspector's name");
      c.siteVisit = { ...c.siteVisit, scheduledFor: a.scheduledFor, inspector: a.inspector.trim() };
      if (["paid", "intake_incomplete", "needs_more_documents"].includes(c.status)) c.status = "scheduling";
      await saveCase(c); await audit(c.id, "admin", "site_visit_scheduled", { scheduledFor: a.scheduledFor, inspector: c.siteVisit.inspector });
      await lifecycleEvent(c, "site_visit_booked");
      break;
    }
    case "site_record": {
      const t = Date.parse(a.completedAt);
      if (Number.isNaN(t) || t > Date.now() + 5 * 60_000) return fail(400, "The visit date can't be in the future — record a visit only after it has happened");
      if (!a.completedBy.trim()) return fail(400, "Record who carried out the visit");
      const checklist = Object.fromEntries(siteChecks.map((k) => [k.key, (a.checklist[k.key] ?? "").slice(0, 2000)]).filter(([, v]) => v));
      c.siteVisit = { ...c.siteVisit, completedAt: new Date(t).toISOString(), completedBy: a.completedBy.trim(), checklist };
      if (!siteVisitDocumented(c.siteVisit)) { c.siteVisit.completedAt = undefined; await saveCase(c); return fail(409, "Fill at least five checklist items so the visit is documented"); }
      await saveCase(c); await audit(c.id, "admin", "site_visit_recorded", { completedAt: c.siteVisit.completedAt, completedBy: c.siteVisit.completedBy, items: Object.keys(checklist).length, photos: c.documents.filter((d) => d.docKey === "site_photo" && d.status === "uploaded").length });
      break;
    }
    case "permit_upsert": {
      const it = a.item; const id = it.id || randomUUID().slice(0, 8);
      const row: PermitItem = { id, item: it.item.slice(0, 200), authority: it.authority.slice(0, 200), status: it.status, sourceUrl: it.sourceUrl?.slice(0, 500), lastChecked: it.lastChecked, notes: it.notes?.slice(0, 1000) };
      const i = c.permits.findIndex((p) => p.id === id); if (i >= 0) c.permits[i] = row; else c.permits.push(row);
      await saveCase(c); await audit(c.id, "admin", "permit_item_saved", { id, status: row.status }); break;
    }
    case "permit_remove": c.permits = c.permits.filter((p) => p.id !== a.id); await saveCase(c); await audit(c.id, "admin", "permit_item_removed", { id: a.id }); break;
    case "cost": {
      const price = await getPriceSettings();
      if (!price.fx) return fail(409, "Set the exchange rate, its source and date in Settings first");
      let ghs = a.ghs; let version = "manual";
      if (!ghs) {
        if (!price.costAssumptions || !a.floorAreaSqm || !a.finish) return fail(409, "Enter low/base/high manually, or publish cost assumptions and give floor area (m²) and finish");
        const [l, b, h] = price.costAssumptions.ghsPerSqm[a.finish];
        ghs = { low: Math.round(l * a.floorAreaSqm), base: Math.round(b * a.floorAreaSqm), high: Math.round(h * a.floorAreaSqm) };
        version = price.costAssumptions.version;
      }
      if (!(ghs.low > 0 && ghs.low <= ghs.base && ghs.base <= ghs.high)) return fail(400, "Low ≤ base ≤ high, all above zero");
      const fx = price.fx.usdToGhs;
      c.cost = { ghs, usd: { low: Math.round(ghs.low / fx), base: Math.round(ghs.base / fx), high: Math.round(ghs.high / fx) }, fxRate: fx, fxSource: price.fx.source, fxDate: price.fx.date,
        assumptions: a.assumptions.slice(0, 4000), assumptionsVersion: version, confidence: a.confidence, preparedAt: now };
      await saveCase(c); await audit(c.id, "admin", "cost_range_saved", { version, fx, fxDate: price.fx.date }); break;
    }
    case "recommendation":
      // Any edit voids an earlier approval: QA must re-approve what is actually delivered.
      c.recommendation = { decision: a.decision, rationale: a.rationale.slice(0, 4000), conditions: a.conditions?.slice(0, 4000), nextSteps: a.nextSteps?.slice(0, 4000), draftedAt: now };
      await saveCase(c); await audit(c.id, "admin", "recommendation_drafted", { decision: a.decision }); break;
    case "approve": {
      if (c.status !== "internal_qa") return fail(409, "Move the case to internal QA before approving");
      if (!c.recommendation) return fail(409, "No recommendation to approve");
      if (!a.reviewer.trim()) return fail(400, "Approver name required");
      c.recommendation.approvedBy = a.reviewer.trim(); c.recommendation.approvedAt = now;
      await saveCase(c); await audit(c.id, "admin", "recommendation_approved", { by: c.recommendation.approvedBy }); break;
    }
    case "deliver": {
      const g = canTransition(c, "delivered"); if (!g.ok) return fail(409, g.reason);
      c.status = "delivered";
      const version = (c.reports.at(-1)?.version ?? 0) + 1;
      c.reports.push({ version, generatedAt: now, final: true, by: c.recommendation?.approvedBy || "admin", deliveredAt: now });
      await saveCase(c); await audit(c.id, "admin", "report_delivered", { version });
      const mail = await sendClientEmail({ to: c.contact.email, subject: `${c.caseNumber}: your Ghana Build Readiness Report is ready`, heading: "Your Readiness Report is ready",
        body: "Your report is available on your private case page. Please sign in with your case link to read and download it, and confirm you've received it.", linkUrl: clientUrl(c, a.origin), linkLabel: "Open my report" });
      await audit(c.id, "system", "delivery_email", { status: mail.status });
      await lifecycleEvent(c, "report_delivered");
      break;
    }
    case "refund_mark": {
      if (c.paymentStatus !== "paid") return fail(409, "Only a paid case can be marked refunded");
      if (a.note.trim().length < 4) return fail(400, "Add the processor refund reference / reason");
      await markRefunded(c, "admin", a.note); break;
    }
    case "engagement": {
      c.engagement = a.stage; await saveCase(c); await audit(c.id, "admin", "engagement_changed", { stage: a.stage });
      if (a.stage === "pm_proposal") await lifecycleEvent(c, "qualified_project_consultation");
      if (a.stage === "won") await lifecycleEvent(c, "project_won");
      break;
    }
  }
  if (["status", "title", "deliver", "site_schedule", "refund_mark", "engagement"].includes(a.type)) await recordCrm(c, await syncCaseToGhl(c));
  return { ok: true as const, case: c };
}

function clientUrl(c: ReadinessCase, origin?: string) {
  const base = (origin || process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "");
  return `${base}${readiness.path}/status?case=${c.id}&t=${encodeURIComponent(caseToken(c.id))}`;
}

/** Client acknowledges receipt of a delivered report version. */
export async function acknowledgeReport(c: ReadinessCase) {
  const last = c.reports.at(-1);
  if (!last?.final || !["delivered", "follow_up"].includes(c.status)) return fail(409, "No delivered report to acknowledge");
  if (!last.acknowledgedAt) { last.acknowledgedAt = new Date().toISOString(); await saveCase(c); await audit(c.id, "client", "report_acknowledged", { version: last.version }); }
  return { ok: true as const, acknowledgedAt: last.acknowledgedAt };
}

/** What the client may see. Excludes internal notes, storage keys, counsel internals and drafts. */
export function publicView(c: ReadinessCase) {
  const last = c.reports.at(-1);
  const delivered = ["delivered", "follow_up"].includes(c.status) && Boolean(last?.final);
  return {
    id: c.id, caseNumber: c.caseNumber, status: c.status, paymentStatus: c.paymentStatus, titleStatus: c.titleStatus, sandbox: c.sandbox, createdAt: c.createdAt,
    firstName: c.contact.firstName, region: c.parcel.region, locality: c.parcel.locality, inventory: c.inventory,
    payment: c.payment ? { provider: c.payment.provider, amountMinor: c.payment.amountMinor, currency: c.payment.currency, paidAt: c.payment.paidAt, sandbox: c.payment.sandbox, refundedAt: c.payment.refundedAt } : undefined,
    documents: c.documents.filter((d) => d.status === "uploaded" && d.uploadedBy === "client").map((d) => ({ id: d.id, docKey: d.docKey, filename: d.filename, size: d.size, uploadedAt: d.uploadedAt })),
    siteVisit: { scheduledFor: c.siteVisit?.scheduledFor, completed: siteVisitDocumented(c.siteVisit) },
    reportAvailable: delivered,
    report: delivered && last ? { version: last.version, deliveredAt: last.deliveredAt, acknowledgedAt: last.acknowledgedAt } : undefined,
  };
}
