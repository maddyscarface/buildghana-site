import { body, json, match, withUser } from "@/lib/transparency/http";
import { can } from "@/lib/transparency/rbac";
import { assessMilestone, createPaymentRequest, getStore, projectCtx, proposeChangeOrder, reconcilePayment, recordDisbursement, recordInspection, resetStore, resolveDispute, reviewPayment, reviewReport, ServiceError, updateForecast } from "@/lib/transparency/service";
import type { Inspection, Milestone, ReviewDecision } from "@/lib/transparency/types";

/** Office / inspector / accountant actions. Every handler re-checks tenant + project + role in the service layer. */
export const dynamic = "force-dynamic";
type P = { params: Promise<{ path: string[] }> };

export async function POST(req: Request, { params }: P) {
  const { path } = await params;
  return withUser(req, path, async ({ user, parts }) => {
    let m: string[] | null;
    if ((m = match(parts, "reports/:id/review"))) { const b = await body<{ decision: ReviewDecision; notes?: string }>(req); const r = await reviewReport(user, m[0], b); return json({ ok: true, report: { id: r.id, status: r.status } }); }
    if ((m = match(parts, "milestones/:id/inspection"))) { const b = await body<{ result: Inspection["result"]; scope: string; methods: string; limitations: string; reportIds: string[]; signature: string }>(req); return json({ ok: true, inspection: await recordInspection(user, m[0], b) }); }
    if ((m = match(parts, "milestones/:id/assess"))) { const b = await body<{ to: Milestone["status"]; note?: string }>(req); return json({ ok: true, milestone: await assessMilestone(user, m[0], b.to, b.note || "") }); }
    if ((m = match(parts, "milestones/:id/forecast"))) { const b = await body<{ forecastStart: string; forecastEnd: string; reason: string }>(req); return json({ ok: true, milestone: await updateForecast(user, m[0], b) }); }
    if ((m = match(parts, "disputes/:id/resolve"))) { const b = await body<{ resolution: string }>(req); return json(await resolveDispute(user, m[0], b.resolution)); }
    if ((m = match(parts, "projects/:id/change-orders"))) { const b = await body<{ description: string; sourceDoc: string; proposedDeltaMinor: number; costCode: string; deadline: string }>(req); return json({ ok: true, ...(await proposeChangeOrder(user, m[0], b)) }); }
    if ((m = match(parts, "projects/:id/payment-requests"))) { const b = await body<{ milestoneId: string; amountMinor: number; costCode: string; supportingEvidence: string[] }>(req); return json({ ok: true, request: await createPaymentRequest(user, m[0], b) }); }
    if ((m = match(parts, "payment-requests/:id/review"))) { const b = await body<{ action: "start_review" | "recommend" | "reject" | "cancel"; reason?: string }>(req); return json({ ok: true, request: await reviewPayment(user, m[0], b) }); }
    if ((m = match(parts, "payment-requests/:id/disburse"))) { const b = await body<{ paidMinor: number; paidAt: string; sourceReference: string; evidenceDocId: string }>(req); return json({ ok: true, request: await recordDisbursement(user, m[0], b) }); }
    if ((m = match(parts, "payment-requests/:id/reconcile"))) { const b = await body<{ note?: string }>(req); return json({ ok: true, request: await reconcilePayment(user, m[0], b) }); }
    if (parts.join("/") === "demo/reset") {
      const ctx = await projectCtx(user, "p-demo-accra-villa");
      if (!can(ctx.grant, "demo.reset")) throw new ServiceError(403, "Your role cannot do this");
      resetStore();
      return json({ ok: true });
    }
    return json({ ok: false, error: "Not found" }, 404);
  });
}

export async function GET(req: Request, { params }: P) {
  const { path } = await params;
  return withUser(req, path, async ({ user, parts }) => {
    const m = match(parts, "projects/:id/audit");
    if (!m) return json({ ok: false, error: "Not found" }, 404);
    const ctx = await projectCtx(user, m[0], "audit.view");
    const events = (await getStore().list("audit_events", { projectId: ctx.project.id })).sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
    return json({ ok: true, events });
  });
}
