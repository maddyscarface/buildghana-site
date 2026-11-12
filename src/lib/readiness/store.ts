import "server-only";
import { kv } from "@/lib/server/kv";
import type { ReadinessCase } from "./model";

/**
 * Case persistence on the shared KV (Upstash in production; process memory in local/sandbox).
 * Only case metadata lives here. Document bytes live in the private DocumentStore.
 */
const K = {
  case: (id: string) => `rr:case:${id}`,
  index: "rr:cases",
  audit: (id: string) => `rr:audit:${id}`,
  session: (sid: string) => `rr:session:${sid}`,
  event: (provider: string, id: string) => `rr:event:${provider}:${id}`,
  revenue: "rr:revenue",
  settings: "rr:settings",
};
export const keys = K;

export async function saveCase(c: ReadinessCase) {
  c.updatedAt = new Date().toISOString();
  await kv.set(K.case(c.id), JSON.stringify(c));
}
export async function getCase(id: string): Promise<ReadinessCase | null> {
  const raw = await kv.get(K.case(id));
  return raw ? (JSON.parse(raw) as ReadinessCase) : null;
}
export async function listCaseIds(limit = 200) { return kv.lrange(K.index, 0, limit - 1); }
export async function indexCase(id: string) { await kv.lpush(K.index, id); }

export type AuditEntry = { at: string; actor: "client" | "admin" | "system" | "provider"; action: string; detail?: Record<string, unknown> };
export async function audit(caseId: string, actor: AuditEntry["actor"], action: string, detail?: Record<string, unknown>) {
  const e: AuditEntry = { at: new Date().toISOString(), actor, action, detail };
  await kv.lpush(K.audit(caseId), JSON.stringify(e));
}
export async function getAudit(caseId: string): Promise<AuditEntry[]> {
  return (await kv.lrange(K.audit(caseId), 0, 199)).map((s) => JSON.parse(s));
}

export async function linkSession(sessionId: string, caseId: string) { await kv.set(K.session(sessionId), caseId, 60 * 60 * 24 * 30); }
export async function caseForSession(sessionId: string) { return kv.get(K.session(sessionId)); }

/** Webhook idempotency: true the first time an event id is seen. */
export async function claimEvent(provider: string, eventId: string) { return kv.setNX(K.event(provider, eventId), "1", 60 * 60 * 24 * 90); }

export type RevenueEntry = {
  stream: "readiness_review"; caseId: string; amountMinor: number; currency: string; provider: string; sandbox: boolean; at: string;
  source?: string; medium?: string; campaign?: string; firstTouchSource?: string; clickIds?: string[];
};
export async function recordRevenue(e: RevenueEntry) { await kv.lpush(K.revenue, JSON.stringify(e)); }
export async function listRevenue(): Promise<RevenueEntry[]> { return (await kv.lrange(K.revenue, 0, 999)).map((s) => JSON.parse(s)); }
