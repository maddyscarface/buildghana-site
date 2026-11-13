import { isUuid, json, requireStaff } from "@/lib/property/http";
import * as db from "@/lib/property/store";
import * as svc from "@/lib/property/service";
import { can, leadStatuses, legalStates, type LeadStatus, type LegalState, type VerificationTask } from "@/lib/property/model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type P = { params: Promise<{ kind: string; id: string }> };
const kindOf = (k: string) => (k === "seller" || k === "buyer" ? k : null);

export async function GET(req: Request, { params }: P) {
  const s = await requireStaff(req); if (s instanceof Response) return s;
  const { kind: k, id } = await params; const kind = kindOf(k);
  if (!kind || !isUuid(id)) return json({ ok: false, error: "Not found" }, 404);
  const r = await db.getRecord(kind, id);
  if (!r) return json({ ok: false, error: "Not found" }, 404);
  const assets = r.kind === "seller" ? (await Promise.all(r.assetIds.map(db.getAsset))).filter(Boolean).map((a) => ({
    id: a!.id, category: a!.category, docType: a!.docType, contentType: a!.contentType, size: a!.size, uploadedAt: a!.uploadedAt, status: a!.status, scan: a!.scan,
    filename: a!.category === "document" && !can.downloadDocuments(s.role) ? "[restricted]" : a!.filename,
    downloadable: a!.status === "uploaded" && (a!.category === "media" || can.downloadDocuments(s.role)),
  })) : [];
  const [authorization, tasks, audit, matches] = await Promise.all([
    r.kind === "seller" ? db.currentAuthorization(r.id) : Promise.resolve(null), db.tasksFor(r.id), db.getAudit(r.id),
    db.listMatches().then((ms) => ms.filter((m) => m.propertyId === r.id || m.buyerId === r.id)),
  ]);
  return json({ ok: true, role: s.role, record: svc.staffView(r, s.role), assets, authorization, tasks, audit, matches });
}

export async function PATCH(req: Request, { params }: P) {
  const s = await requireStaff(req); if (s instanceof Response) return s;
  const { kind: k, id } = await params; const kind = kindOf(k);
  if (!kind || !isUuid(id)) return json({ ok: false, error: "Not found" }, 404);
  const r = await db.getRecord(kind, id);
  if (!r) return json({ ok: false, error: "Not found" }, 404);
  const b = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const note = typeof b.note === "string" ? b.note.slice(0, 500) : undefined;
  let out: { ok: boolean; status?: number; error?: string; detail?: unknown };
  switch (b.action) {
    case "status":
      if (!leadStatuses.includes(b.to as LeadStatus)) return json({ ok: false, error: "Bad status" }, 400);
      out = await svc.transition(r, b.to as LeadStatus, s.role, note); break;
    case "legal":
      if (!legalStates.includes(b.to as LegalState)) return json({ ok: false, error: "Bad state" }, 400);
      out = await svc.setLegalState(r, b.to as LegalState, s.role, note); break;
    case "authorization":
      if (kind !== "seller") return json({ ok: false, error: "Sellers only" }, 400);
      out = await svc.recordAuthorization(id, s.role, {
        shareDetailsWithMatchedBuyers: Boolean(b.shareDetailsWithMatchedBuyers), shareContactAfterApproval: Boolean(b.shareContactAfterApproval),
        publicListing: Boolean(b.publicListing), factualReviewDone: Boolean(b.factualReviewDone), imagePermission: Boolean(b.imagePermission),
        searchIndexConsent: Boolean(b.searchIndexConsent), evidence: String(b.evidence || "").slice(0, 500),
      }); break;
    case "revoke":
      if (!can.recordAuthorization(s.role)) return json({ ok: false, error: "Only an admin can revoke" }, 403);
      await svc.revokeAuthorization(id, s.role, note || "Revoked by admin"); out = { ok: true }; break;
    case "match": out = await svc.runMatching(kind, id, s.role); break;
    case "task_add": out = await svc.addTask(id, kind, (b.type as VerificationTask["type"]) || "other", String(b.title || "Task"), s.role); break;
    case "task_update": out = await svc.updateTask(String(b.taskId), (b.status as VerificationTask["status"]) || "done", s.role, note); break;
    case "delete": out = await svc.deleteRecordData(kind, id, s.role, note || "Data deletion request"); break;
    default: return json({ ok: false, error: "Unknown action" }, 400);
  }
  return out.ok ? json(out) : json(out, out.status || 400);
}

