import Link from "next/link";
import { requireProject } from "@/lib/transparency/page";
import { snapshot } from "@/lib/transparency/views";
import { can } from "@/lib/transparency/rbac";
import { independenceLabel, milestoneStatusLabel, reportStatusLabel, varianceDays } from "@/lib/transparency/states";
import { ProjectFrame } from "@/components/portal/ProjectFrame";
import { Card, Empty, EvidenceBadge, fmtDate, PageTitle, Pill } from "@/components/portal/ui";
import { DEMO_LABEL } from "@/lib/transparency/seed";

export const dynamic = "force-dynamic";

export default async function Overview({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await requireProject(projectId);
  const v = await snapshot(ctx);
  const tz = ctx.user.timezone;
  const current = v.milestones.find((m) => m.status !== "COMPLETE_VERIFIED" && m.status !== "APPROVED_PROGRESS") ?? v.milestones.at(-1);
  const finalForecast = v.milestones.at(-1)?.forecastEnd;
  const open = v.decisions.filter((d) => d.status === "OPEN" || d.status === "CLARIFICATION_REQUESTED");
  const base = `/portal/projects/${projectId}`;
  return (
    <ProjectFrame ctx={ctx} active="">
      <PageTitle eyebrow={DEMO_LABEL} title={ctx.project.name}>
        Know what is reported, what is verified, and what needs your decision. Times are shown in your time zone ({tz}); the site is in {ctx.project.timezone}.
      </PageTitle>

      <div className="grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card>
          <div className="grid gap-5 sm:grid-cols-[180px_1fr]">
            <div aria-hidden className="flex aspect-[4/3] items-center justify-center rounded-xl bg-forest-2 p-3 text-center text-xs font-semibold uppercase tracking-wider text-gold">Synthetic project — no site photo</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="col-span-2"><dt className="text-muted">Location (city / district only)</dt><dd className="font-semibold text-forest">{ctx.project.locationPublic}</dd></div>
              <div><dt className="text-muted">Project manager</dt><dd className="font-semibold text-forest">{v.pm}</dd></div>
              <div><dt className="text-muted">Current phase</dt><dd className="font-semibold text-forest">{current ? `${current.phase}. ${current.title}` : "Not provided"}</dd></div>
              <div><dt className="text-muted">Last inspected (pass)</dt><dd className="font-semibold text-forest">{fmtDate(v.lastVerified, tz, false)}</dd></div>
              <div><dt className="text-muted">Forecast completion</dt><dd className="font-semibold text-forest">{ctx.project.baselined && finalForecast ? `${fmtDate(finalForecast, tz, false)} (forecast, not a commitment)` : "Not yet baselined"}</dd></div>
            </dl>
          </div>
          <div className="mt-5 grid gap-3 border-t border-line pt-5 sm:grid-cols-3">
            {[["Last site report", v.lastSiteReport, "Field team"], ["Last office review", v.lastReview, "BuildGhana office"], ["Last inspection", v.lastInspection, "Qualified inspector"]].map(([l, d, who]) => (
              <div key={l as string} className="rounded-xl bg-ivory px-4 py-3"><p className="text-xs font-semibold uppercase tracking-wider text-gold-2">{l}</p><p className="mt-1 text-sm font-semibold text-forest">{fmtDate(d as string | null, tz)}</p><p className="text-xs text-muted">{who}</p></div>
            ))}
          </div>
        </Card>

        <Card title="Needs your attention" action={can(ctx.grant, "decisions.view", ctx.project) ? <Link href={`${base}/decisions`} className="text-sm font-semibold text-forest underline">All decisions</Link> : null}>
          {!can(ctx.grant, "decisions.view", ctx.project) ? <Empty>Decisions are not shared with your access level.</Empty> : open.length === 0 ? <Empty>Nothing waiting for you.</Empty> : (
            <ul className="space-y-3">{open.map((d) => (
              <li key={d.id} className="rounded-xl border border-line px-4 py-3"><p className="font-semibold text-forest">{d.title}</p><p className="mt-1 text-xs text-muted">Due {fmtDate(d.deadline, tz, false)} · {d.assignedTo === ctx.user.id ? "Assigned to you" : `Assigned to ${v.name(d.assignedTo)}`}</p></li>
            ))}</ul>
          )}
          {v.disputes.some((d) => d.status === "open") && <p className="mt-4 rounded-xl bg-[#f7e4df] px-4 py-3 text-sm text-[#8a2f1d]">{v.disputes.filter((d) => d.status === "open").length} open dispute(s) on published evidence.</p>}
        </Card>
      </div>

      <Card className="mt-5" title="Progress rail" action={<span className="text-xs text-muted">No percentage is calculated from photos.</span>}>
        <div className="-mx-1 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="px-2 py-2">Milestone</th><th className="px-2 py-2">Planned (baseline)</th><th className="px-2 py-2">Field reported</th><th className="px-2 py-2">Office reviewed</th><th className="px-2 py-2">Inspection</th><th className="px-2 py-2">Status</th></tr></thead>
            <tbody className="divide-y divide-line">
              {v.milestones.map((m) => {
                const rs = v.reports.filter((r) => r.milestoneId === m.id);
                const reviewed = rs.filter((r) => ["OFFICE_REVIEWED", "INSPECTION_PENDING", "PUBLISHED", "VERIFIED", "DISPUTED"].includes(r.status));
                const ins = v.inspections.filter((i) => i.milestoneId === m.id).sort((a, b) => a.inspectedAt.localeCompare(b.inspectedAt)).at(-1);
                const vd = varianceDays(m.baselineEnd, m.forecastEnd);
                return (
                  <tr key={m.id}>
                    <td className="px-2 py-3 font-semibold text-forest">{m.phase}. {m.title}</td>
                    <td className="px-2 py-3 text-muted">{fmtDate(m.baselineEnd, tz, false)}{vd > 0 && <span className="ml-1 font-semibold text-[#8a2f1d]">(+{vd} d forecast)</span>}</td>
                    <td className="px-2 py-3">{rs.length ? `${rs.length} report(s)` : "—"}</td>
                    <td className="px-2 py-3">{reviewed.length ? `${reviewed.length} reviewed` : "—"}</td>
                    <td className="px-2 py-3">{!m.requiresInspection ? <span className="text-muted">Not required</span> : ins ? <Pill tone={ins.result === "fail" ? "bad" : "good"}>{ins.result === "fail" ? "Failed" : "Passed"} · {ins.independence === "independent_third_party" ? "independent" : "internal"}</Pill> : <Pill tone="warn">Hold point — pending</Pill>}</td>
                    <td className="px-2 py-3"><span className="text-forest">{milestoneStatusLabel[m.status]}</span>{m.overlays.map((o) => <span key={o} className="ml-1"><Pill tone="bad">{o === "DISPUTED" ? "Disputed" : "Blocked"}</Pill></span>)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_1fr]">
        <Card title="Latest activity" action={<Link href={`${base}/updates`} className="text-sm font-semibold text-forest underline">All updates</Link>}>
          {v.reports.length === 0 ? <Empty>No published updates yet.</Empty> : (
            <ul className="space-y-3">
              {v.reports.slice(0, 5).map((r) => {
                const rev = r.revisions.at(-1);
                const reviewer = v.reviews.filter((x) => x.reportId === r.id).at(-1);
                return (
                  <li key={r.id} className="rounded-xl border border-line px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-forest">{rev?.summary || r.draft.summary || "Draft"}</p><EvidenceBadge state={v.ev(r)} /></div>
                    <p className="mt-1 text-xs text-muted">{fmtDate(rev?.submittedAt, tz)} · {v.wps.find((w) => w.id === r.workPackageId)?.title} · by {v.name(r.authorId)}{reviewer ? ` · reviewed by ${v.name(reviewer.reviewerId)}` : ""} · {rev?.mediaIds.length ?? 0} evidence file(s){v.staff ? ` · ${reportStatusLabel[r.status]}` : ""}</p>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>
        <Card title="What this portal does not mean">
          <ul className="space-y-2.5 text-sm leading-relaxed text-ink/85">
            <li>• Photos and videos show what was reported at a time. They are not engineering certification.</li>
            <li>• &ldquo;Office reviewed&rdquo; means BuildGhana checked the report. &ldquo;Inspected&rdquo; means a qualified inspection was recorded — always read its limitations{v.inspections[0] ? ` (e.g. “${independenceLabel[v.inspections[0].independence]}”)` : ""}.</li>
            <li>• A payment request is not a payment. Only reconciled payments are shown as paid.</li>
            <li>• Schedules are forecasts, not commitments.</li>
            <li>• Location is city/district only. Device location is never treated as proof.</li>
          </ul>
          {can(ctx.grant, "project.export", ctx.project) && <a href={`/api/portal/projects/${projectId}/export`} className="btn-ghost-dark mt-5 !min-h-11">Download progress record (PDF)</a>}
        </Card>
      </div>
    </ProjectFrame>
  );
}
