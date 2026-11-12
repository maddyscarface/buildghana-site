import { publicView } from "@/lib/readiness/service";
import { clientCase, json } from "@/lib/readiness/http";
import { getPriceSettings } from "@/lib/readiness/pricing";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await clientCase(id, new URL(req.url).searchParams.get("t"));
  if (!c) return json({ ok: false, error: "Case not found" }, 404);
  const price = await getPriceSettings();
  return json({ ok: true, case: publicView(c), price: { usdMinor: price.usdMinor, ghsMinor: price.ghsMinor } });
}
