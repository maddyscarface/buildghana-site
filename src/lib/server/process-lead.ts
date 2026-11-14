import "server-only";
import { leadSchema, MIN_FILL_MS, type Lead } from "@/lib/lead/schema";
import { scoreLead, type ScoreResult } from "@/lib/lead/scoring";
import { kv, kvConfigured } from "./kv";
import { enqueue } from "@/lib/ops/outbox";
import { recordConsent } from "@/lib/ops/store";
import { ghlConfigured, syncLeadToGhl, type GhlResult } from "./ghl";
import { sendCapiEvent } from "./meta-capi";
import { sha256 } from "./hash";
import { sendOpenAiEvent } from "@/lib/openai-ads/server";
import { budgetFit, sanitizeQualifiers } from "@/lib/estimate/qualifiers";
import { renderLeadBrief, sendLeadBrief } from "@/lib/estimate/lead-brief";
import { briefTheme, estimateConfig } from "@/config/estimate";
import { labelFor, landStatuses, projectStages, serviceOptions, currentCountries } from "@/lib/lead/options";

export type ProcessResult =
  | { ok: true; leadId: string; tier: ScoreResult["tier"]; duplicate: boolean; integrations: Record<string, string> }
  | { ok: false; status: number; error: string; fieldErrors?: Record<string, string> };

type Ctx = { ip: string; userAgent: string; now?: number };

const IDEMPOTENCY_TTL = 60 * 60 * 24 * 7; // 7 days

export async function processLead(body: unknown, ctx: Ctx): Promise<ProcessResult> {
  const parsed = leadSchema.safeParse(body);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const k = issue.path.join(".") || "_";
      fieldErrors[k] ??= issue.message;
    }
    // Honeypot hit → pretend success to avoid teaching bots, but do nothing.
    if (fieldErrors.company_website) {
      return { ok: true, leadId: "00000000-0000-4000-8000-000000000000", tier: "nurture", duplicate: false, integrations: { spam: "honeypot" } };
    }
    return { ok: false, status: 422, error: "Please check the highlighted fields.", fieldErrors };
  }
  const lead: Lead = parsed.data;
  const now = ctx.now ?? Date.now();

  if (now - lead.form_started_at < MIN_FILL_MS) {
    return { ok: true, leadId: "00000000-0000-4000-8000-000000000000", tier: "nurture", duplicate: false, integrations: { spam: "too_fast" } };
  }

  if (process.env.NODE_ENV === "production" && !kvConfigured && !ghlConfigured && process.env.LEAD_ALLOW_MEMORY_STORE !== "1") {
    console.error("[lead] No storage or CRM configured in production — refusing to drop lead silently");
    return { ok: false, status: 503, error: "Our form is temporarily unavailable. Please email or WhatsApp us instead." };
  }

  const leadId = lead.submission_id;

  // Idempotency: one submission id → one stored lead, one CRM write, one conversion event.
  const acquired = await kv.setNX(`lead:lock:${leadId}`, "1", IDEMPOTENCY_TTL);
  if (!acquired) {
    const prev = await kv.get(`lead:result:${leadId}`);
    const tier = prev ? (JSON.parse(prev).tier as ScoreResult["tier"]) : "standard";
    return { ok: true, leadId, tier, duplicate: true, integrations: { idempotency: "duplicate_suppressed" } };
  }

  lead.qualifiers = sanitizeQualifiers(estimateConfig, lead.qualifiers);
  const q = lead.qualifiers as ReturnType<typeof sanitizeQualifiers>;
  const score = scoreLead(lead);
  const fit = q ? budgetFit(estimateConfig, q) : undefined;

  // Persist first so a CRM outage never loses the lead.
  const record = {
    leadId,
    receivedAt: new Date(now).toISOString(),
    lead: { ...lead, turnstile_token: undefined },
    score,
    ipHash: sha256(ctx.ip),
    userAgent: ctx.userAgent.slice(0, 300),
  };
  await kv.set(`lead:data:${leadId}`, JSON.stringify(record));
  await kv.lpush("leads:index", leadId);
  await recordConsent({ subjectType: "lead", subjectId: leadId, consents: { contact: lead.consent_contact, marketing: lead.consent_marketing, sms_whatsapp: lead.consent_sms_whatsapp, ads: Boolean(lead.ads_consent) }, source: lead.funnel }).catch(() => undefined);

  const integrations: Record<string, string> = { storage: kvConfigured ? "upstash" : "memory(dev)" };

  const [ghl, capi, openai, brief] = await Promise.all([
    syncLeadToGhl(lead, score, leadId),
    sendCapiEvent({
      eventName: "Lead",
      eventId: leadId, // same id the browser sends with generate_lead → Pixel dedup
      eventSourceUrl: lead.page_url,
      user: {
        email: lead.email,
        phone: lead.phone,
        firstName: lead.first_name,
        lastName: lead.last_name,
        country: lead.current_country,
        ip: ctx.ip,
        userAgent: ctx.userAgent,
        fbc: lead.attribution?.fbc,
        fbp: lead.attribution?.fbp,
        externalId: leadId,
      },
      custom: { lead_tier: score.tier, funnel: lead.funnel, content_category: lead.services.join(",") },
    }),
    // OpenAI Ads Conversions API: id = submission id (same as the browser pixel event_id). Needs ad consent.
    lead.ads_consent && lead.page_url
      ? sendOpenAiEvent({
          id: leadId, type: "lead_created", actionSource: "web", sourceUrl: lead.page_url,
          oppref: lead.attribution?.openai_oppref,
          user: {
            email: lead.email, phone: lead.phone, firstName: lead.first_name, lastName: lead.last_name, externalId: leadId,
            obref: lead.attribution?.openai_obref, country: /^[A-Z]{2}$/.test(lead.current_country) ? lead.current_country : undefined,
            ip: ctx.ip, userAgent: ctx.userAgent,
          },
        })
      : Promise.resolve({ sent: false, skipped: "no ad consent" }),
    sendLeadBrief(renderLeadBrief({
      cfg: estimateConfig, theme: briefTheme,
      heading: lead.funnel === "rescue" ? "New stalled-project request" : lead.funnel === "investor" ? "New investor request" : "New build consultation request",
      name: `${lead.first_name} ${lead.last_name}`, phone: lead.phone, email: lead.email,
      location: [lead.ghana_city, lead.ghana_region].filter(Boolean).join(", ") + " (Ghana)", q,
      details: [
        ["Lives in", labelFor(currentCountries, lead.current_country)],
        ["Land", labelFor(landStatuses, lead.land_status)],
        ["Stage", labelFor(projectStages, lead.project_stage)],
        ["Services", lead.services.map((s) => labelFor(serviceOptions, s)).join(", ")],
        ["WhatsApp", lead.whatsapp_same ? "Same as phone" : "Different number, ask"],
        ["Notes", lead.project_description],
      ],
      score: `${score.score} (${score.tier})`,
      source: [lead.attribution?.utm_source, lead.attribution?.utm_medium, lead.attribution?.utm_campaign].filter(Boolean).join(" / ") || "direct",
    }), { to: process.env.LEAD_BRIEF_TO, from: process.env.LEAD_BRIEF_FROM, replyTo: lead.email }),
  ]);
  integrations.openai_capi = openai.skipped ? "skipped" : openai.sent ? "ok" : "error";
  integrations.lead_brief = brief.sent ? "ok" : "skipped";
  if (fit) integrations.budget_fit = fit.fit;

  integrations.ghl = describeGhl(ghl);
  integrations.meta_capi = capi.status;
  if (ghl.status === "error") {
    console.error("[lead] GHL sync failed", leadId, ghl.error);
    await kv.lpush("leads:ghl_retry", leadId);
    // Phase 4: durable outbox replays the CRM write (idempotent per lead id); the lead itself is already stored.
    await enqueue("ghl.lead", leadId, `ghl.lead:${leadId}`, { source: "lead.created", error: ghl.error }).catch((e) => console.error("[lead] outbox enqueue failed", leadId, e));
  }
  if (capi.status === "error") console.warn("[lead] CAPI failed", leadId, capi.detail);

  await kv.set(
    `lead:result:${leadId}`,
    JSON.stringify({ tier: score.tier, score: score.score, ghl, capi: capi.status }),
    IDEMPOTENCY_TTL,
  );

  return { ok: true, leadId, tier: score.tier, duplicate: false, integrations };
}

const describeGhl = (r: GhlResult) => (r.status === "ok" ? "ok" : r.status === "skipped" ? "skipped" : "error");
