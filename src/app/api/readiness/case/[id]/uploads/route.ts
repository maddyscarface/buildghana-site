import { uploadRequestSchema } from "@/lib/readiness/schema";
import { requestUpload } from "@/lib/readiness/service";
import { clientCase, json } from "@/lib/readiness/http";
import { clientIp, rateLimit } from "@/lib/server/guards";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await rateLimit(`rr-upload:${clientIp(req.headers)}`, 60, 600))) return json({ ok: false, error: "Too many uploads, slow down" }, 429);
  const parsed = uploadRequestSchema.safeParse({ ...(await req.json().catch(() => ({}))), case_id: id });
  if (!parsed.success) return json({ ok: false, error: "Invalid upload request" }, 400);
  const c = await clientCase(id, parsed.data.token);
  if (!c) return json({ ok: false, error: "Case not found" }, 404);
  const r = await requestUpload(c, { docKey: parsed.data.doc_key, filename: parsed.data.filename, contentType: parsed.data.content_type, size: parsed.data.size }, "client");
  return json(r, r.ok ? 200 : r.status);
}
