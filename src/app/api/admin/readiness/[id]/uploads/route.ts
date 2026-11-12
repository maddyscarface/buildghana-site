import { z } from "zod";
import { requireAdmin } from "@/lib/readiness/admin-http";
import { json } from "@/lib/readiness/http";
import { getCase } from "@/lib/readiness/store";
import { requestUpload } from "@/lib/readiness/service";
import { adminDocKeys, docKeys } from "@/config/readiness";

export const runtime = "nodejs";

const body = z.object({
  doc_key: z.enum([...adminDocKeys, ...docKeys] as [string, ...string[]]),
  filename: z.string().trim().min(1).max(180), content_type: z.string().max(100), size: z.number().int().positive(),
});

/** Admin uploads (site-visit photos, counsel evidence, or a document on the client's behalf). Same validation as client uploads. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin(req); if (deny) return deny;
  const { id } = await params;
  const c = await getCase(id);
  if (!c) return json({ ok: false, error: "Not found" }, 404);
  const p = body.safeParse(await req.json().catch(() => null));
  if (!p.success) return json({ ok: false, error: "Invalid upload request" }, 400);
  const r = await requestUpload(c, { docKey: p.data.doc_key, filename: p.data.filename, contentType: p.data.content_type, size: p.data.size }, "admin");
  return json(r, r.ok ? 200 : r.status);
}
