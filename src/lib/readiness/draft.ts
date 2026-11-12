import "server-only";
import { z } from "zod";
import { kv } from "@/lib/server/kv";
import { normEmail, sha256 } from "@/lib/server/hash";
import { ghlConfigured, ghlLogNoop, upsertContactMinimal, upsertOpportunity } from "@/lib/server/ghl";
import { parseJsonEnv, planForwardOnly } from "@/config/ghl-pipelines";

/**
 * "Readiness intake started" (spec §3). Called once when a visitor completes the contact step of the
 * intake and their draft is first saved. Duplicate-safe at two levels:
 *  1. KV set-if-absent per normalised email (30 days) — repeat saves, reloads, other tabs and retries do nothing.
 *  2. GHL: contact upsert + forward-only opportunity write (never moves a later-stage opportunity back).
 * Sends contact basics only — no parcel, documents, budget or free text.
 */
export const draftStartSchema = z.object({
  submission_id: z.string().uuid(),
  first_name: z.string().trim().min(1).max(80),
  last_name: z.string().trim().min(1).max(80),
  email: z.string().trim().email().max(200),
  phone: z.string().trim().max(40).optional().default(""),
  current_country: z.string().trim().max(60).optional().default(""),
  preferred_contact: z.string().trim().max(30).optional().default(""),
  time_zone: z.string().trim().max(60).optional().default(""),
  company_website: z.string().max(0).optional().default(""), // honeypot
  attribution: z.record(z.string(), z.string().max(300)).optional(),
});

export const DRAFT_TTL_SEC = 60 * 60 * 24 * 30;
export const draftKey = (email: string) => `rr:draft_started:${sha256(normEmail(email))}`;

export type DraftStartResult =
  | { ok: true; first: boolean; crm: "ok" | "skipped" | "error" | "duplicate" }
  | { ok: false; status: number; error: string };

export async function registerDraftStart(input: unknown): Promise<DraftStartResult> {
  const p = draftStartSchema.safeParse(input);
  if (!p.success) return { ok: false, status: 422, error: "Invalid draft" };
  const d = p.data;
  const first = await kv.setNX(draftKey(d.email), JSON.stringify({ sid: d.submission_id, at: new Date().toISOString() }), DRAFT_TTL_SEC);
  if (!first) return { ok: true, first: false, crm: "duplicate" };

  const pipelineId = process.env.GHL_RR_PIPELINE_ID;
  const stages = parseJsonEnv("GHL_RR_STAGE_IDS");
  if (!ghlConfigured) {
    ghlLogNoop("readiness_draft", { stage: "intake_started", sid: d.submission_id });
    return { ok: true, first: true, crm: "skipped" };
  }
  try {
    const contactId = await upsertContactMinimal({
      firstName: d.first_name, lastName: d.last_name, email: d.email, phone: d.phone || undefined, country: d.current_country,
      source: "Website — Readiness Review", tags: ["source-website", "product-readiness-review", "rr-intake_started"],
      fields: { rr_status: "intake_started", utm_source: d.attribution?.utm_source, utm_campaign: d.attribution?.utm_campaign, first_touch_source: d.attribution?.first_touch_source },
    });
    if (pipelineId && stages.intake_started) {
      await upsertOpportunity({
        contactId, pipelineId, stageId: stages.intake_started, source: "website-readiness-review",
        name: `Readiness Review — ${d.first_name} ${d.last_name} — intake started`,
        shouldMove: (cur) => planForwardOnly(cur, "intake_started", stages, true) === "move",
      });
    }
    return { ok: true, first: true, crm: "ok" };
  } catch (e) {
    // Release the lock so a later save can retry the sync.
    await kv.del(draftKey(d.email)).catch(() => {});
    console.warn("[rr:draft] GHL sync failed", (e as Error).message.slice(0, 200));
    return { ok: true, first: true, crm: "error" };
  }
}
