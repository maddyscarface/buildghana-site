import { confirmUpload } from "@/lib/readiness/service";
import { clientCase, json } from "@/lib/readiness/http";

export const runtime = "nodejs";

/** Confirms an upload after the browser PUT to the signed URL. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string; docId: string }> }) {
  const { id, docId } = await params;
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const c = await clientCase(id, body.token);
  if (!c) return json({ ok: false, error: "Case not found" }, 404);
  const r = await confirmUpload(c, docId, "client");
  return json(r, r.ok ? 200 : r.status);
}
