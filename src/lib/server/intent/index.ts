import "server-only";
import { createHash } from "node:crypto";

/**
 * Intent-data / visitor-identification vendor abstraction (DataMoon or AudienceLab).
 * DISABLED BY DEFAULT. Nothing is sent anywhere unless INTENT_VENDOR is set AND INTENT_ENABLED=true.
 *
 * Privacy rules baked in:
 *  - Only fires for visitors who granted advertising consent; GPC always blocks (enforced client-side + here).
 *  - Only hashed identifiers (SHA-256 of normalised email) ever leave the server.
 *  - Inbound vendor signals become CRM tags only; never used for SMS/WhatsApp outreach.
 *
 * Env: INTENT_VENDOR=datamoon|audiencelab, INTENT_ENABLED=true, INTENT_API_KEY, INTENT_API_BASE (vendor endpoint, from onboarding),
 *      INTENT_WEBHOOK_SECRET (shared secret for /api/intent/webhook), NEXT_PUBLIC_INTENT_PIXEL_SRC (vendor pixel URL, optional)
 */
export type IntentEvent = { type: "lead" | "readiness_paid" | "page_view"; emailHash?: string; leadId?: string; value?: number; currency?: string; page?: string; at: string };
export type IntentSignal = { emailHash?: string; company?: string; topics?: string[]; score?: number; vendorId?: string };

export interface IntentVendor {
  readonly name: "datamoon" | "audiencelab";
  sendEvent(e: IntentEvent): Promise<{ status: "ok" | "error"; detail?: string }>;
  /** Normalises an inbound webhook payload into signals. */
  parseWebhook(body: unknown): IntentSignal[];
}

const hashEmail = (email?: string) => (email ? createHash("sha256").update(email.trim().toLowerCase()).digest("hex") : undefined);

function genericVendor(name: "datamoon" | "audiencelab"): IntentVendor {
  return {
    name,
    async sendEvent(e) {
      const base = process.env.INTENT_API_BASE;
      if (!base) return { status: "error", detail: "INTENT_API_BASE not set (get the endpoint from vendor onboarding)" };
      const res = await fetch(base, { method: "POST", headers: { Authorization: `Bearer ${process.env.INTENT_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ source: "buildghana", ...e }) });
      return { status: res.ok ? "ok" : "error", detail: res.ok ? undefined : String(res.status) };
    },
    parseWebhook(body) {
      const arr = Array.isArray(body) ? body : Array.isArray((body as { data?: unknown[] })?.data) ? (body as { data: unknown[] }).data : [body];
      return arr.slice(0, 500).map((r) => {
        const o = (r ?? {}) as Record<string, unknown>;
        return {
          emailHash: typeof o.email_sha256 === "string" ? o.email_sha256 : hashEmail(typeof o.email === "string" ? o.email : undefined),
          company: typeof o.company === "string" ? o.company.slice(0, 120) : undefined,
          topics: Array.isArray(o.topics) ? (o.topics as unknown[]).filter((t) => typeof t === "string").slice(0, 10) as string[] : undefined,
          score: typeof o.score === "number" ? o.score : undefined,
          vendorId: typeof o.id === "string" ? o.id : undefined,
        };
      });
    },
  };
}

export function intentVendor(): IntentVendor | null {
  const v = process.env.INTENT_VENDOR;
  if (process.env.INTENT_ENABLED !== "true" || (v !== "datamoon" && v !== "audiencelab") || !process.env.INTENT_API_KEY) return null;
  return genericVendor(v);
}

export const intentStatus = () => ({ vendor: process.env.INTENT_VENDOR || null, enabled: Boolean(intentVendor()) });

/** Fire-and-forget server event; requires ad consent. */
export async function sendIntentEvent(e: Omit<IntentEvent, "emailHash" | "at"> & { email?: string; adsConsent: boolean }) {
  const v = intentVendor();
  if (!v || !e.adsConsent) return { status: "skipped" as const };
  const { email, adsConsent: _c, ...rest } = e; void _c;
  return v.sendEvent({ ...rest, emailHash: hashEmail(email), at: new Date().toISOString() }).catch((err) => ({ status: "error" as const, detail: String(err) }));
}
