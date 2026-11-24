import "server-only";
import { can } from "./rbac";
import { getStore, visibleReports, type Ctx } from "./service";
import { evidenceState } from "./states";
import type { SiteReport } from "./types";

/** Read model shared by portal pages. Everything is already filtered by the caller's grant. */
export async function snapshot(ctx: Ctx) {
  const s = getStore(), pid = ctx.project.id;
  const [milestones, inspections, disputes, users, wps, reviews, comments] = await Promise.all([
    s.list("milestones", { projectId: pid }), s.list("inspections", { projectId: pid }), s.list("disputes", { projectId: pid }),
    s.list("users", { tenantId: ctx.project.tenantId }), s.list("work_packages", { projectId: pid }), s.list("report_reviews", { projectId: pid }), s.list("comments", { projectId: pid }),
  ]);
  const reports = (await visibleReports(ctx)).sort((a, b) => lastAt(b).localeCompare(lastAt(a)));
  const visibleIds = new Set(reports.map((r) => r.id));
  const staff = can(ctx.grant, "reports.view_all");
  const decisions = can(ctx.grant, "decisions.view", ctx.project) ? (await s.list("decision_requests", { projectId: pid })).sort((a, b) => a.deadline.localeCompare(b.deadline)) : [];
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? "Unknown";
  const ev = (r: SiteReport) => evidenceState(r, { inspections, disputes });
  const submitted = reports.filter((r) => r.revisions.length);
  const lastSiteReport = submitted.map(lastAt).sort().at(-1) ?? null;
  const lastReview = reviews.filter((r) => visibleIds.has(r.reportId) && (staff || r.decision === "publish" || r.decision === "approve")).map((r) => r.createdAt).sort().at(-1) ?? null;
  const lastInspection = inspections.map((i) => i.inspectedAt).sort().at(-1) ?? null;
  const lastVerified = inspections.filter((i) => i.result !== "fail").map((i) => i.inspectedAt).sort().at(-1) ?? null;
  return {
    milestones: milestones.sort((a, b) => a.phase - b.phase), reports, inspections, disputes: disputes.filter((d) => visibleIds.has(d.reportId)), decisions, wps, reviews: staff ? reviews : reviews.filter((r) => visibleIds.has(r.reportId) && r.decision !== "request_correction"),
    comments: comments.filter((c) => (c.parentRef.startsWith("report:") && visibleIds.has(c.parentRef.slice(7))) || (c.parentRef.startsWith("decision:") && decisions.some((d) => `decision:${d.id}` === c.parentRef))),
    name, ev, lastSiteReport, lastReview, lastInspection, lastVerified, staff,
    pm: name(ctx.project.pmUserId),
  };
}

export const lastAt = (r: SiteReport) => r.revisions.at(-1)?.submittedAt ?? r.draft.updatedAt;
