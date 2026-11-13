import { json } from "@/lib/property/http";
import { confirmPropertyUpload } from "@/lib/property/service";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string; assetId: string }> }) {
  const { id, assetId } = await params;
  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const r = await confirmPropertyUpload(id, assetId, body.token);
  return r.ok ? json({ ok: true }) : json({ ok: false, error: r.error }, r.status);
}
