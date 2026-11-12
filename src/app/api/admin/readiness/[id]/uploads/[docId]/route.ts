import { requireAdmin } from "@/lib/readiness/admin-http";
import { json } from "@/lib/readiness/http";
import { getCase } from "@/lib/readiness/store";
import { confirmUpload } from "@/lib/readiness/service";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const deny = await requireAdmin(req); if (deny) return deny;
  const { id, docId } = await params;
  const c = await getCase(id);
  if (!c) return json({ ok: false, error: "Not found" }, 404);
  const r = await confirmUpload(c, docId, "admin");
  return json(r, r.ok ? 200 : r.status);
}
