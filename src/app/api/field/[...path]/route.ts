import { body, json, match, withUser } from "@/lib/transparency/http";
import { CHUNK_BYTES } from "@/lib/transparency/media";
import { completeMedia, createDraft, getStore, initMedia, mediaStatus, removeDraftMedia, ServiceError, writeChunk, submitReport, updateDraft, evidenceFlags } from "@/lib/transparency/service";
import type { MediaStage, ReportContent } from "@/lib/transparency/types";

/**
 * Phone-first field capture API. Resumable chunked uploads: init → PUT chunks at offsets → complete.
 * If a chunk fails (network drop), GET media/:id returns the bytes received so the client resumes from there.
 */
export const dynamic = "force-dynamic";
type P = { params: Promise<{ path: string[] }> };

async function ownReport(userId: string, reportId: string) {
  const r = await getStore().get("site_reports", reportId);
  if (!r || r.authorId !== userId) throw new ServiceError(404, "Not found");
  return r;
}

export async function POST(req: Request, { params }: P) {
  const { path } = await params;
  return withUser(req, path, async ({ user, parts }) => {
    let m: string[] | null;
    if ((m = match(parts, "projects/:id/reports"))) { const b = await body<{ milestoneId: string; confirmProjectCode: string; idempotencyKey?: string }>(req); const r = await createDraft(user, { projectId: m[0], ...b }); return json({ ok: true, report: { id: r.id, version: r.version } }); }
    if ((m = match(parts, "reports/:id/media/init"))) { const b = await body<{ stage: MediaStage; caption?: string; sizeBytes: number; mime: string; deviceCapturedAt?: string | null; idempotencyKey?: string }>(req); const { asset, chunkBytes } = await initMedia(user, m[0], b); return json({ ok: true, media: { id: asset.id, receivedBytes: asset.receivedBytes, sizeBytes: asset.sizeBytes, uploadState: asset.uploadState }, chunkBytes }); }
    if ((m = match(parts, "reports/:id/media/complete"))) { const b = await body<{ mediaId: string }>(req); const a = await completeMedia(user, String(b.mediaId || "")); if (a.reportId !== m[0]) throw new ServiceError(404, "Not found"); return json({ ok: true, media: { id: a.id, sha256: a.sha256, mime: a.mime, uploadState: a.uploadState, scanStatus: a.scanStatus, serverReceivedAt: a.serverReceivedAt } }); }
    if ((m = match(parts, "reports/:id/submit"))) { const b = await body<{ attestation: boolean; idempotencyKey?: string; version?: number }>(req); const r = await submitReport(user, m[0], b); return json({ ok: true, report: { id: r.id, status: r.status, revision: r.revisions.length, version: r.version } }); }
    return json({ ok: false, error: "Not found" }, 404);
  });
}

export async function PATCH(req: Request, { params }: P) {
  const { path } = await params;
  return withUser(req, path, async ({ user, parts }) => {
    const m = match(parts, "reports/:id");
    if (!m) return json({ ok: false, error: "Not found" }, 404);
    const b = await body<Partial<ReportContent> & { capturedAt?: string | null; version?: number }>(req);
    const { version, ...patch } = b;
    const r = await updateDraft(user, m[0], patch, version);
    return json({ ok: true, report: { id: r.id, version: r.version, updatedAt: r.draft.updatedAt } });
  });
}

export async function PUT(req: Request, { params }: P) {
  const { path } = await params;
  return withUser(req, path, async ({ user, parts }) => {
    const m = match(parts, "media/:id/chunk");
    if (!m) return json({ ok: false, error: "Not found" }, 404);
    const offset = Number(new URL(req.url).searchParams.get("offset"));
    const len = Number(req.headers.get("content-length") || 0);
    if (len > CHUNK_BYTES) throw new ServiceError(413, "Chunk too large");
    const bytes = new Uint8Array(await req.arrayBuffer());
    return json({ ok: true, ...(await writeChunk(user, m[0], offset, bytes)) });
  });
}

export async function GET(req: Request, { params }: P) {
  const { path } = await params;
  return withUser(req, path, async ({ user, parts }) => {
    let m: string[] | null;
    if ((m = match(parts, "media/:id"))) return json({ ok: true, media: await mediaStatus(user, m[0]) });
    if ((m = match(parts, "reports/:id"))) {
      const r = await ownReport(user.id, m[0]);
      const media = (await getStore().list("media_assets", { reportId: r.id })).filter((x) => r.draft.mediaIds.includes(x.id) || x.uploadState === "pending");
      return json({ ok: true, report: { id: r.id, status: r.status, version: r.version, draft: r.draft, revisions: r.revisions.length }, media: media.map((x) => ({ id: x.id, stage: x.stage, caption: x.caption, sizeBytes: x.sizeBytes, receivedBytes: x.receivedBytes, uploadState: x.uploadState, mime: x.mime })), flags: await evidenceFlags(r, r.draft) });
    }
    return json({ ok: false, error: "Not found" }, 404);
  });
}

export async function DELETE(req: Request, { params }: P) {
  const { path } = await params;
  return withUser(req, path, async ({ user, parts }) => {
    const m = match(parts, "media/:id");
    if (!m) return json({ ok: false, error: "Not found" }, 404);
    return json(await removeDraftMedia(user, m[0]));
  });
}
