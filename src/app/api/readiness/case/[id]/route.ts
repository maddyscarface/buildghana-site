import { acknowledgeReport, publicView } from "@/lib/readiness/service";
import { clientCase, json } from "@/lib/readiness/http";
import { getPriceSettings, publicPrice } from "@/lib/readiness/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await clientCase(id, new URL(req.url).searchParams.get("t"));
  if (!c) return json({ ok: false, error: "Case not found" }, 404);
  return json({ ok: true, case: publicView(c), price: publicPrice(await getPriceSettings()) });
}

/** Client actions on their own case. Currently: acknowledge receipt of the delivered report. */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = (await req.json().catch(() => ({}))) as { token?: string; action?: string };
  const c = await clientCase(id, body.token);
  if (!c) return json({ ok: false, error: "Case not found" }, 404);
  if (body.action !== "acknowledge") return json({ ok: false, error: "Unknown action" }, 400);
  const r = await acknowledgeReport(c);
  return json(r, r.ok ? 200 : r.status);
}
