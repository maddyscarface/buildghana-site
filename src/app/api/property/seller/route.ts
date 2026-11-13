import { json, readPublicPost } from "@/lib/property/http";
import { submitSeller } from "@/lib/property/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Private seller inquiry. Response contains ids only — never echoes submitted details. */
export async function POST(req: Request) {
  const r = await readPublicPost(req, "pp-seller");
  if (r instanceof Response) return r;
  const out = await submitSeller(r.body, { ip: r.ip, userAgent: r.ua });
  if (!out.ok) return json({ ok: false, error: out.error, fieldErrors: out.fieldErrors }, out.status);
  return json({ ok: true, id: out.id, reference: out.reference, token: out.token, duplicate: out.duplicate });
}
