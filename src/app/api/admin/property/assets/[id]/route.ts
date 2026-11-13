import { isUuid, json, requireStaff } from "@/lib/property/http";
import * as db from "@/lib/property/store";
import { can } from "@/lib/property/model";
import { documentStore } from "@/lib/readiness/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Short-lived (5 min) signed download. Documents: admin + legal reviewer only. Every issue is audited. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await requireStaff(req); if (s instanceof Response) return s;
  const { id } = await params;
  const a = isUuid(id) ? await db.getAsset(id) : null;
  if (!a || a.status !== "uploaded") return json({ ok: false, error: "Not found" }, 404);
  if (a.category === "document" && !can.downloadDocuments(s.role)) return json({ ok: false, error: "Documents are restricted to admin and legal reviewer" }, 403);
  const signed = await documentStore().signDownload(a.storageKey, 300, `${a.category}-${a.id.slice(0, 8)}.${a.storageKey.split(".").pop()}`);
  await db.audit(a.ownerId, s.role, "asset_download_issued", { assetId: a.id, category: a.category });
  return json({ ok: true, url: signed.url, expiresAt: signed.expiresAt, scan: a.scan });
}
