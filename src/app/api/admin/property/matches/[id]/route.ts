import { isUuid, json, requireStaff } from "@/lib/property/http";
import * as db from "@/lib/property/store";
import { approveIntroduction, reviewMatch, staffView } from "@/lib/property/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff(req); if (s instanceof Response) return s;
  const { id } = await params;
  const m = isUuid(id) ? await db.getMatch(id) : null;
  if (!m) return json({ ok: false, error: "Not found" }, 404);
  const [p, b, auth, audit] = await Promise.all([db.getSeller(m.propertyId), db.getBuyer(m.buyerId), db.currentAuthorization(m.propertyId), db.getAudit(m.id)]);
  return json({ ok: true, match: m, property: p && staffView(p, s.role), buyer: b && staffView(b, s.role), authorization: auth, audit });
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff(req); if (s instanceof Response) return s;
  const { id } = await params;
  if (!isUuid(id)) return json({ ok: false, error: "Not found" }, 404);
  const b = (await req.json().catch(() => ({}))) as { action?: string; note?: string };
  const note = b.note?.slice(0, 500);
  const out = b.action === "approve_introduction" ? await approveIntroduction(id, s.role, note)
    : b.action === "review" ? await reviewMatch(id, "reviewed", s.role, note)
    : b.action === "reject" ? await reviewMatch(id, "rejected", s.role, note)
    : { ok: false as const, status: 400, error: "Unknown action" };
  return out.ok ? json(out) : json(out, out.status);
}
