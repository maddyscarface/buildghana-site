import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { kv } from "@/lib/server/kv";
import { sendCapiEvent } from "@/lib/server/meta-capi";
import { sendGa4Event } from "@/lib/server/ga4-mp";
import { openAiStageEvent, sendOpenAiEvent } from "@/lib/openai-ads/server";

/**
 * Receives downstream funnel milestones from GoHighLevel workflows (Webhook action) and
 * forwards them as server-side conversions:
 *   appointment_booked  → Meta "Schedule"
 *   qualified           → Meta "QualifiedLead" (custom) + GA4 qualified_lead
 *   assessment_paid     → Meta "Purchase" + GA4 purchase
 *   contract_signed     → Meta "Purchase" (contract value) + GA4 close_convert_lead
 * Google Ads offline conversions are uploaded from GHL/Ads directly using gclid — see docs/09.
 *
 * Auth: header X-Webhook-Secret must equal CRM_WEBHOOK_SECRET.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const schema = z.object({
  event: z.enum(["appointment_booked", "qualified", "assessment_paid", "contract_signed"]),
  lead_id: z.string().min(6).max(64), // website lead id stored in GHL custom field "lead_id"
  email: z.string().email().optional(),
  phone: z.string().max(30).optional(),
  first_name: z.string().max(80).optional(),
  last_name: z.string().max(80).optional(),
  value: z.coerce.number().nonnegative().optional(),
  currency: z.string().length(3).default("USD"),
  fbc: z.string().max(600).optional(),
  fbp: z.string().max(200).optional(),
  ga_client_id: z.string().max(100).optional(),
});

const META_EVENT = {
  appointment_booked: "Schedule",
  qualified: "QualifiedLead",
  assessment_paid: "Purchase",
  contract_signed: "Purchase",
} as const;

const GA4_EVENT = {
  appointment_booked: "schedule",
  qualified: "qualified_lead",
  assessment_paid: "purchase",
  contract_signed: "close_convert_lead",
} as const;

function authorised(req: Request) {
  const expected = process.env.CRM_WEBHOOK_SECRET;
  const got = req.headers.get("x-webhook-secret");
  if (!expected || !got) return false;
  const a = Buffer.from(expected), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  if (!authorised(req)) return NextResponse.json({ ok: false }, { status: 401 });

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 422 });
  const e = parsed.data;

  // Deterministic event id → retries from GHL never double-count.
  const eventId = `${e.lead_id}:${e.event}`;
  if (!(await kv.setNX(`crm:evt:${eventId}`, "1", 60 * 60 * 24 * 90))) {
    return NextResponse.json({ ok: true, duplicate: true });
  }

  // Pull stored attribution for better match quality if the webhook didn't include it
  const stored = await kv.get(`lead:data:${e.lead_id}`);
  const storedLead = stored ? (JSON.parse(stored).lead ?? {}) : {};
  const attr = storedLead.attribution ?? {};

  const capi = await sendCapiEvent({
    eventName: META_EVENT[e.event],
    eventId,
    actionSource: "system_generated",
    user: {
      email: e.email, phone: e.phone, firstName: e.first_name, lastName: e.last_name,
      fbc: e.fbc ?? attr.fbc, fbp: e.fbp ?? attr.fbp, externalId: e.lead_id,
    },
    custom: e.value !== undefined ? { value: e.value, currency: e.currency, stage: e.event } : { stage: e.event },
  });

  const ga4 = await sendGa4Event({
    clientId: e.ga_client_id || e.lead_id,
    name: GA4_EVENT[e.event],
    params: {
      lead_id: e.lead_id,
      ...(e.value !== undefined ? { value: e.value, currency: e.currency } : {}),
      ...(e.event === "assessment_paid" || e.event === "contract_signed" ? { transaction_id: eventId } : {}),
    },
  });

  // OpenAI Ads: appointment_booked → appointment_scheduled; other milestones → custom events with value.
  const oa = openAiStageEvent(e.event);
  const openai = oa && storedLead.ads_consent !== false
    ? await sendOpenAiEvent({
        id: eventId, type: oa.type, customEventName: oa.customEventName, actionSource: "offline",
        value: e.value, currency: e.currency, oppref: attr.openai_oppref, properties: oa.type === "custom" ? { stage: e.event } : undefined,
        user: { email: e.email ?? storedLead.email, phone: e.phone ?? storedLead.phone, firstName: e.first_name, lastName: e.last_name, externalId: e.lead_id, obref: attr.openai_obref },
      })
    : { sent: false, skipped: oa ? "no ad consent" : "no mapping" };

  return NextResponse.json({ ok: true, eventId, meta: capi.status, ga4: ga4.status, openai });
}
