import { requireAdmin } from "@/lib/readiness/admin-http";
import { json } from "@/lib/readiness/http";
import { getCase, listCaseIds, listRevenue } from "@/lib/readiness/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Queue + revenue dashboard data. Revenue is the Readiness Review stream only (separate from construction). */
export async function GET(req: Request) {
  const deny = await requireAdmin(req); if (deny) return deny;
  const ids = await listCaseIds(200);
  const cases = (await Promise.all(ids.map(getCase))).filter(Boolean).map((c) => ({
    id: c!.id, createdAt: c!.createdAt, updatedAt: c!.updatedAt, status: c!.status, paymentStatus: c!.paymentStatus, titleStatus: c!.titleStatus,
    sandbox: c!.sandbox, name: `${c!.contact.firstName} ${c!.contact.lastName}`, email: c!.contact.email, region: c!.parcel.region, caseNumber: c!.caseNumber, reviewer: c!.ops?.reviewer, dueDate: c!.ops?.dueDate, siteVisit: c!.siteVisit?.completedAt ? "done" : c!.siteVisit?.scheduledFor ? "scheduled" : "—",
    docs: c!.documents.filter((d) => d.status === "uploaded").length, amountMinor: c!.payment?.amountMinor, currency: c!.payment?.currency,
    source: c!.attribution?.utm_source || c!.attribution?.first_touch_source || "direct",
  }));
  const revenue = await listRevenue();
  const totals: Record<string, { live: number; sandbox: number; count: number }> = {};
  const bySource: Record<string, number> = {};
  for (const r of revenue) {
    const t = (totals[r.currency] ??= { live: 0, sandbox: 0, count: 0 });
    t[r.sandbox ? "sandbox" : "live"] += r.amountMinor; t.count++;
    if (!r.sandbox) bySource[r.source || r.firstTouchSource || "direct"] = (bySource[r.source || r.firstTouchSource || "direct"] ?? 0) + 1;
  }
  return json({ ok: true, cases, revenue: { stream: "readiness_review", totals, paidCasesBySource: bySource, entries: revenue.slice(0, 50) } });
}
