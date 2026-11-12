import { z } from "zod";
import { requireAdmin } from "@/lib/readiness/admin-http";
import { json, originOf } from "@/lib/readiness/http";
import { getAudit, getCase } from "@/lib/readiness/store";
import { adminAct, type AdminAction } from "@/lib/readiness/service";
import { caseStatuses, titleStatuses, permitStatuses, recommendations, siteChecks } from "@/lib/readiness/model";
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

const str = (n: number) => z.string().max(n);
const band = z.object({ low: z.number().positive(), base: z.number().positive(), high: z.number().positive() });
const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("status"), to: z.enum(caseStatuses), note: str(1000).optional() }),
  z.object({ type: z.literal("title"), to: z.enum(titleStatuses), note: str(1000).optional(),
    counsel: z.object({ firm: str(200).optional(), lawyer: str(200).optional(), reference: str(200).optional(), summary: str(4000).optional(), limitations: str(4000).optional(), searchReference: str(200).optional() }).optional() }),
  z.object({ type: z.literal("finding"), area: str(40), rating: z.enum(["ready", "attention", "not_ready", "not_assessed"]), notes: str(4000) }),
  z.object({ type: z.literal("summary"), text: str(6000) }),
  z.object({ type: z.literal("note"), text: z.string().min(1).max(4000) }),
  z.object({ type: z.literal("ops"), reviewer: str(120).optional(), dueDate: str(10).optional(), jurisdiction: str(200).optional() }),
  z.object({ type: z.literal("task_add"), text: z.string().min(1).max(300), due: str(10).optional() }),
  z.object({ type: z.literal("task_toggle"), id: str(20) }),
  z.object({ type: z.literal("site_schedule"), scheduledFor: str(40), inspector: str(120) }),
  z.object({ type: z.literal("site_record"), completedAt: str(40), completedBy: str(120), checklist: z.record(z.enum(siteChecks.map((k) => k.key) as [string, ...string[]]), str(2000)) }),
  z.object({ type: z.literal("permit_upsert"), item: z.object({ id: str(20).optional(), item: z.string().min(1).max(200), authority: z.string().min(1).max(200), status: z.enum(permitStatuses), sourceUrl: z.string().url().max(500).optional().or(z.literal("")), lastChecked: str(10).optional(), notes: str(1000).optional() }) }),
  z.object({ type: z.literal("permit_remove"), id: str(20) }),
  z.object({ type: z.literal("cost"), ghs: band.optional(), floorAreaSqm: z.number().positive().max(100000).optional(), finish: z.enum(["basic", "standard", "high", "luxury"]).optional(), assumptions: str(4000), confidence: z.enum(["low", "medium", "high"]) }),
  z.object({ type: z.literal("recommendation"), decision: z.enum(recommendations), rationale: z.string().min(10).max(4000), conditions: str(4000).optional(), nextSteps: str(4000).optional() }),
  z.object({ type: z.literal("approve"), reviewer: z.string().min(2).max(120) }),
  z.object({ type: z.literal("deliver") }),
  z.object({ type: z.literal("refund_mark"), note: str(500) }),
  z.object({ type: z.literal("engagement"), stage: z.enum(["pm_proposal", "won", "lost"]) }),
]);

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin(req); if (deny) return deny;
  const { id } = await params;
  const parsed = action.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: "Invalid action" }, 400);
  const data = parsed.data.type === "deliver" ? { type: "deliver" as const, origin: originOf(req) } : parsed.data;
  const r = await adminAct(id, data as AdminAction);
  return json(r, r.ok ? 200 : r.status);
}
