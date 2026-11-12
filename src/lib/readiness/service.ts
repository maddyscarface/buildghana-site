import "server-only";
import { randomUUID } from "node:crypto";
import { intakeSchema, type Intake } from "./schema";
import {
  canTitleTransition, canTransition, type CaseStatus, type CounselRecord, type Rating, type ReadinessCase, type TitleStatus,
} from "./model";
import { audit, caseForSession, claimEvent, getCase, indexCase, linkSession, recordRevenue, saveCase } from "./store";
import { caseToken, productionReady } from "./secrets";
import { checkoutProvider, currencyFor, type PaymentEvent } from "./payments";
import { getPriceSettings, SANDBOX_TEST_MINOR } from "./pricing";
import { documentStore } from "./storage";
import { syncCaseToGhl } from "./crm";
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
    id: caseId, createdAt: now, updatedAt: now, status: "awaiting_payment", paymentStatus: "unpaid", titleStatus: "not_started",
    sandbox: false,
    contact: { firstName: d.first_name, lastName: d.last_name, email: d.email, phone: d.phone, whatsappSame: d.whatsapp_same, country: d.current_country },
    property: {
      region: d.ghana_region, city: d.ghana_city, landSize: d.land_size, acquisition: d.acquisition, titleStatus: d.title_status, intendedUse: d.intended_use,
      projectStage: d.project_stage, budgetRange: d.budget_range, startTimeline: d.start_timeline, groundSupport: d.ground_support, focus: d.focus, concerns: d.concerns,
    },
    inventory: d.inventory,
    consents: { terms: d.consent_terms, dataProcessing: d.consent_data, marketing: d.consent_marketing, adsConsent: d.ads_consent, at: now },
    attribution: d.attribution, pageUrl: d.page_url,
    documents: [], findings: {}, internalNotes: [],
  };
  // Title track starts by waiting for the documents counsel needs.
  const titleDocs = documentInventory.filter((x) => x.title).map((x) => x.key);
  c.titleStatus = titleDocs.some((k) => d.inventory[k] === "have") ? "awaiting_documents" : "not_started";

  await saveCase(c);
  await indexCase(caseId);
  await audit(caseId, "client", "intake_submitted", { ipHashPrefix: ctx.ip ? ctx.ip.split(".").slice(0, 2).join(".") : undefined });
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
  if (!["awaiting_payment", "payment_failed", "intake_submitted"].includes(c.status)) return { ok: false as const, status: 409, error: "Checkout is not available for this case." };

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
    c.status = "awaiting_documents";
    c.payment = { ...(c.payment ?? { provider: e.provider }), provider: c.payment?.provider ?? e.provider, paidAt: new Date().toISOString(), amountMinor: e.amountMinor ?? c.payment?.amountMinor, currency: e.currency ?? c.payment?.currency, sandbox };
    c.sandbox = sandbox;
    await saveCase(c);
    await audit(c.id, "provider", "payment_confirmed", { provider: e.provider, eventId: e.eventId, amountMinor: c.payment.amountMinor, currency: c.payment.currency, sandbox });
    await afterPaid(c, ctx);
  } else if (e.type === "failed" || e.type === "expired") {
    if (c.paymentStatus !== "paid") { c.paymentStatus = "failed"; c.status = "payment_failed"; await saveCase(c); }
    await audit(c.id, "provider", `payment_${e.type}`, { provider: e.provider, eventId: e.eventId });
  } else if (e.type === "refunded") {
    c.paymentStatus = "refunded"; c.status = "refunded"; await saveCase(c);
    await audit(c.id, "provider", "payment_refunded", { provider: e.provider, eventId: e.eventId });
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
  const [meta, ga4, openai, gads, intent] = await Promise.all([
    sendCapiEvent({ eventName: "Purchase", eventId, eventSourceUrl: c.pageUrl, actionSource: "website",
      user: { email: c.contact.email, phone: c.contact.phone, firstName: c.contact.firstName, lastName: c.contact.lastName, country: c.contact.country, ip: ctx.ip, userAgent: ctx.userAgent, fbc: a.fbc, fbp: a.fbp, externalId: c.id },
      custom: { value, currency, content_name: "readiness_review", revenue_stream: "readiness_review" } }),
    sendGa4Event({ clientId: a.ga_client_id || c.id, name: "purchase", params: { transaction_id: c.id, value, currency, item_name: "readiness_review", revenue_stream: "readiness_review" } }),
    c.consents.adsConsent
      ? sendOpenAiEvent({ id: eventId, type: "order_created", actionSource: "web", sourceUrl: c.pageUrl, value, currency, oppref: a.openai_oppref,
          user: { email: c.contact.email, phone: c.contact.phone, firstName: c.contact.firstName, lastName: c.contact.lastName, externalId: c.id, obref: a.openai_obref } })
      : Promise.resolve({ sent: false, skipped: "no ad consent" }),
    uploadOfflineConversion({ orderId: c.id, gclid: a.gclid, gbraid: a.gbraid, wbraid: a.wbraid, value, currency, at: new Date(), email: c.contact.email }),
    sendIntentEvent({ type: "readiness_paid", email: c.contact.email, value, currency, adsConsent: c.consents.adsConsent }),
  ]);
  await audit(c.id, "system", "conversions_sent", { meta: meta.status, ga4: ga4.status, openai: "sent" in openai && openai.sent ? "ok" : "skipped", google_ads: gads.status, intent: intent.status });
}

/* ───────────── Documents ───────────── */

export async function requestUpload(c: ReadinessCase, r: { docKey: string; filename: string; contentType: string; size: number }, by: "client" | "admin") {
  if (by === "client" && c.paymentStatus !== "paid") return { ok: false as const, status: 402, error: "Uploads open once payment is confirmed." };
  if (["delivered", "cancelled", "refunded"].includes(c.status) && by === "client") return { ok: false as const, status: 409, error: "This case is closed to new uploads." };
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
  if (c.status === "awaiting_documents" && by === "client") c.status = "documents_received";
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
  | { type: "deliver" };

export async function adminAct(caseId: string, a: AdminAction) {
  const c = await getCase(caseId);
  if (!c) return { ok: false as const, status: 404, error: "Not found" };
  switch (a.type) {
    case "status": {
      const g = canTransition(c, a.to); if (!g.ok) return { ok: false as const, status: 409, error: g.reason };
      const from = c.status; c.status = a.to; await saveCase(c); await audit(c.id, "admin", "status_changed", { from, to: a.to, note: a.note });
      break;
    }
    case "title": {
      const g = canTitleTransition(c.titleStatus, a.to, a.counsel); if (!g.ok) return { ok: false as const, status: 409, error: g.reason };
      const from = c.titleStatus; c.titleStatus = a.to;
      if (a.counsel) c.counsel = { firm: a.counsel.firm?.trim() || c.counsel?.firm || "", lawyer: a.counsel.lawyer?.trim() || c.counsel?.lawyer || "", reference: a.counsel.reference?.trim() || c.counsel?.reference || "", summary: a.counsel.summary?.trim() || c.counsel?.summary };
      if (a.to === "counsel_signed_off" && c.counsel) c.counsel.signedOffAt = new Date().toISOString();
      await saveCase(c); await audit(c.id, "admin", "title_status_changed", { from, to: a.to, counsel: a.counsel ? { firm: c.counsel?.firm, lawyer: c.counsel?.lawyer, reference: c.counsel?.reference } : undefined });
      break;
    }
    case "finding": c.findings[a.area] = { rating: a.rating, notes: a.notes.slice(0, 4000) }; await saveCase(c); await audit(c.id, "admin", "finding_updated", { area: a.area, rating: a.rating }); break;
    case "summary": c.summary = a.text.slice(0, 6000); await saveCase(c); await audit(c.id, "admin", "summary_updated"); break;
    case "note": c.internalNotes.unshift({ at: new Date().toISOString(), by: "admin", text: a.text.slice(0, 4000) }); await saveCase(c); await audit(c.id, "admin", "note_added"); break;
    case "deliver": {
      const g = canTransition(c, "delivered"); if (!g.ok) return { ok: false as const, status: 409, error: g.reason };
      c.status = "delivered"; c.report = { generatedAt: c.report?.generatedAt ?? new Date().toISOString(), version: (c.report?.version ?? 0) + 1, final: true, deliveredAt: new Date().toISOString() };
      await saveCase(c); await audit(c.id, "admin", "report_delivered", { version: c.report.version });
      break;
    }
  }
  if (a.type === "status" || a.type === "title" || a.type === "deliver") await recordCrm(c, await syncCaseToGhl(c));
  return { ok: true as const, case: c };
}

/** What the client may see. Excludes internal notes, storage keys and counsel internals. */
export function publicView(c: ReadinessCase) {
  return {
    id: c.id, status: c.status, paymentStatus: c.paymentStatus, titleStatus: c.titleStatus, sandbox: c.sandbox, createdAt: c.createdAt,
    firstName: c.contact.firstName, region: c.property.region, city: c.property.city, inventory: c.inventory,
    payment: c.payment ? { provider: c.payment.provider, amountMinor: c.payment.amountMinor, currency: c.payment.currency, paidAt: c.payment.paidAt, sandbox: c.payment.sandbox } : undefined,
    documents: c.documents.filter((d) => d.status === "uploaded").map((d) => ({ id: d.id, docKey: d.docKey, filename: d.filename, size: d.size, uploadedAt: d.uploadedAt })),
    reportAvailable: c.status === "delivered" && Boolean(c.report?.final),
  };
}
