import { requireAdmin } from "@/lib/readiness/admin-http";
import { json } from "@/lib/readiness/http";
import { audit, getCase } from "@/lib/readiness/store";
import { documentStore } from "@/lib/readiness/storage";

export const runtime = "nodejs";

/** Issues a short-lived signed download URL for one document (audited). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const deny = await requireAdmin(req); if (deny) return deny;
  const { id, docId } = await params;
  const c = await getCase(id);
  const doc = c?.documents.find((d) => d.id === docId && d.status === "uploaded");
  if (!c || !doc) return json({ ok: false, error: "Not found" }, 404);
  const signed = await documentStore().signDownload(doc.storageKey, 120, doc.filename);
  await audit(id, "admin", "document_link_issued", { docId, ttlSec: 120 });
  return json({ ok: true, url: signed.url, expiresAt: signed.expiresAt });
}
