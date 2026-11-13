import { json } from "@/lib/property/http";
import { requestPropertyUpload } from "@/lib/property/service";
import { clientIp, rateLimit } from "@/lib/server/guards";

export const runtime = "nodejs";

/** Issues a short-lived signed upload URL into PRIVATE storage for a seller who holds the submission's private token. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!(await rateLimit(`pp-upload:${clientIp(req.headers)}`, 40, 600))) return json({ ok: false, error: "Too many uploads, slow down" }, 429);
  const r = await requestPropertyUpload(id, await req.json().catch(() => ({})));
  return r.ok ? json(r) : json({ ok: false, error: r.error }, r.status);
}
