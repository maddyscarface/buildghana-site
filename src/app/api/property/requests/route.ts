import { json, readPublicPost } from "@/lib/property/http";
import { createPrivacyRequest } from "@/lib/property/service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Withdrawal, data-deletion, access-revocation and abuse reports. Queued for a human; nothing is auto-actioned. */
export async function POST(req: Request) {
  const r = await readPublicPost(req, "pp-req", 5, 8 * 1024);
  if (r instanceof Response) return r;
  const out = await createPrivacyRequest(r.body);
  if (!out.ok) return json({ ok: false, error: out.error, fieldErrors: "fieldErrors" in out ? out.fieldErrors : undefined }, out.status);
  return json({ ok: true, id: out.id });
}
