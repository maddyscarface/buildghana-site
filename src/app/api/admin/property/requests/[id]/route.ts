import { isUuid, json, requireStaff } from "@/lib/property/http";
import * as db from "@/lib/property/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Marks a privacy / abuse request done or rejected. Deletion itself is a separate, explicit record action. */
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff(req); if (s instanceof Response) return s;
  if (s.role !== "admin") return json({ ok: false, error: "Admin only" }, 403);
  const { id } = await params;
  const r = isUuid(id) ? await db.getRequest(id) : null;
  if (!r) return json({ ok: false, error: "Not found" }, 404);
  const b = (await req.json().catch(() => ({}))) as { status?: "done" | "rejected"; note?: string };
  r.status = b.status === "rejected" ? "rejected" : "done"; r.resolvedAt = new Date().toISOString();
  await db.saveRequest(r); await db.audit(r.id, s.role, "privacy_request_resolved", { status: r.status, note: b.note?.slice(0, 300) });
  return json({ ok: true });
}
