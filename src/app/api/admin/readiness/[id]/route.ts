import { z } from "zod";
import { requireAdmin } from "@/lib/readiness/admin-http";
import { json } from "@/lib/readiness/http";
import { getAudit, getCase } from "@/lib/readiness/store";
import { adminAct, type AdminAction } from "@/lib/readiness/service";
import { caseStatuses, titleStatuses } from "@/lib/readiness/model";
import { caseToken } from "@/lib/readiness/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin(req); if (deny) return deny;
  const { id } = await params;
  const c = await getCase(id);
  if (!c) return json({ ok: false, error: "Not found" }, 404);
  return json({ ok: true, case: c, audit: await getAudit(id), clientLink: `/ghana-build-readiness-review/case/${id}?t=${caseToken(id)}` });
}

const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("status"), to: z.enum(caseStatuses), note: z.string().max(1000).optional() }),
  z.object({ type: z.literal("title"), to: z.enum(titleStatuses), note: z.string().max(1000).optional(),
    counsel: z.object({ firm: z.string().max(200).optional(), lawyer: z.string().max(200).optional(), reference: z.string().max(200).optional(), summary: z.string().max(4000).optional() }).optional() }),
  z.object({ type: z.literal("finding"), area: z.string().max(40), rating: z.enum(["ready", "attention", "not_ready", "not_assessed"]), notes: z.string().max(4000) }),
  z.object({ type: z.literal("summary"), text: z.string().max(6000) }),
  z.object({ type: z.literal("note"), text: z.string().min(1).max(4000) }),
  z.object({ type: z.literal("deliver") }),
]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin(req); if (deny) return deny;
  const { id } = await params;
  const parsed = action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: "Invalid action" }, 400);
  const r = await adminAct(id, parsed.data as AdminAction);
  return json(r, r.ok ? 200 : r.status);
}
