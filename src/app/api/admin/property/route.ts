import { json, requireStaff } from "@/lib/property/http";
import * as db from "@/lib/property/store";
import { purgeExpired, summary } from "@/lib/property/service";
import { can } from "@/lib/property/model";
import { complianceChecklist, opportunitiesMode, propertyUploadPolicy } from "@/config/property";
import { kvConfigured } from "@/lib/server/kv";
import { ghlConfigured } from "@/lib/server/ghl";
import { documentStore } from "@/lib/readiness/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const s = await requireStaff(req); if (s instanceof Response) return s;
  const [sellers, buyers, matches, intros, requests, compliance, events] = await Promise.all([db.listSellers(), db.listBuyers(), db.listMatches(), db.listIntros(), db.listRequests(), db.getCompliance(), db.listEvents()]);
  const ref = new Map([...sellers, ...buyers].map((r) => [r.id, r.reference]));
  return json({
    ok: true, role: s.role,
    sellers: sellers.map(summary), buyers: buyers.map(summary),
    matches: matches.map((m) => ({ ...m, propertyRef: ref.get(m.propertyId), buyerRef: ref.get(m.buyerId) })),
    intros, requests: s.role === "admin" ? requests : requests.map((r) => ({ ...r, email: "[restricted]" })),
    compliance: complianceChecklist.map((c) => ({ ...c, ...(compliance[c.key] || { done: false }) })),
    events: events.slice(0, 50),
    settings: { storage: kvConfigured ? "upstash" : "memory (sandbox — not durable)", documents: documentStore().name, ghl: ghlConfigured ? "configured" : "log mode", opportunitiesMode: opportunitiesMode(), retentionDays: propertyUploadPolicy.retentionDays },
  });
}

/** Global actions: compliance checklist updates, retention purge. */
export async function POST(req: Request) {
  const s = await requireStaff(req); if (s instanceof Response) return s;
  const b = (await req.json().catch(() => ({}))) as { action?: string; key?: string; done?: boolean; note?: string };
  if (b.action === "compliance") {
    if (!can.editCompliance(s.role)) return json({ ok: false, error: "Only admin or legal reviewer can update the compliance checklist" }, 403);
    if (!complianceChecklist.some((c) => c.key === b.key)) return json({ ok: false, error: "Unknown item" }, 400);
    const cur = await db.getCompliance();
    cur[b.key!] = { done: Boolean(b.done), note: (b.note || "").slice(0, 500), by: s.role, at: new Date().toISOString() };
    await db.setCompliance(cur); await db.audit("compliance", s.role, "compliance_updated", { key: b.key, done: Boolean(b.done) });
    return json({ ok: true });
  }
  if (b.action === "purge_expired") { const r = await purgeExpired(s.role); return r.ok ? json(r) : json(r, r.status); }
  return json({ ok: false, error: "Unknown action" }, 400);
}
