import { requireProject } from "@/lib/transparency/page";
import { snapshot } from "@/lib/transparency/views";
import { can } from "@/lib/transparency/rbac";
import { getStore } from "@/lib/transparency/service";
import { milestoneStatusLabel, varianceDays } from "@/lib/transparency/states";
import { ProjectFrame } from "@/components/portal/ProjectFrame";
import { JsonForm } from "@/components/portal/JsonForm";
import { Card, fmtDate, PageTitle, Pill } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function Schedule({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await requireProject(projectId, "schedule.view");
  const v = await snapshot(ctx);
  const revs = (await getStore().list("schedule_revisions", { projectId })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const tz = ctx.user.timezone;
  const all = v.milestones.flatMap((m) => [m.baselineStart, m.baselineEnd, m.forecastStart, m.forecastEnd]).map(Date.parse);
  const min = Math.min(...all), max = Math.max(...all), span = Math.max(1, max - min);
  const pos = (a: string, b: string) => ({ left: `${((Date.parse(a) - min) / span) * 100}%`, width: `${Math.max(1.5, ((Date.parse(b) - Date.parse(a)) / span) * 100)}%` });
  const edit = can(ctx.grant, "schedule.edit");
  return (
    <ProjectFrame ctx={ctx} active="/schedule">
      <PageTitle eyebrow="Schedule" title="Original baseline vs latest forecast">Forecasts are estimates, not commitments. Every forecast change keeps the reason and who approved it.</PageTitle>
      <Card>
        <div className="mb-3 flex flex-wrap gap-4 text-xs text-muted"><span className="inline-flex items-center gap-2"><span className="h-2.5 w-6 rounded bg-forest/25" /> Baseline</span><span className="inline-flex items-center gap-2"><span className="h-2.5 w-6 rounded bg-gold" /> Latest forecast</span></div>
        <ol className="space-y-5">
          {v.milestones.map((m) => {
            const vd = varianceDays(m.baselineEnd, m.forecastEnd);
            return (
              <li key={m.id} className="border-b border-line pb-5 last:border-0 last:pb-0">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-semibold text-forest">{m.phase}. {m.title}</p>
                  <div className="flex flex-wrap gap-1.5"><Pill>{milestoneStatusLabel[m.status]}</Pill>{vd > 0 ? <Pill tone="bad">+{vd} days vs baseline</Pill> : vd < 0 ? <Pill tone="good">{vd} days</Pill> : <Pill tone="good">On baseline</Pill>}{m.requiresInspection && <Pill tone="warn">Inspection hold point</Pill>}</div>
                </div>
                <div className="relative mt-3 h-7 rounded bg-ivory" aria-hidden>
                  <span className="absolute top-1 h-2 rounded bg-forest/25" style={pos(m.baselineStart, m.baselineEnd)} />
                  <span className="absolute top-4 h-2 rounded bg-gold" style={pos(m.forecastStart, m.forecastEnd)} />
                </div>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
                  <div><dt className="text-xs text-muted">Baseline</dt><dd>{fmtDate(m.baselineStart, tz, false)} – {fmtDate(m.baselineEnd, tz, false)}</dd></div>
                  <div><dt className="text-xs text-muted">Latest forecast</dt><dd>{fmtDate(m.forecastStart, tz, false)} – {fmtDate(m.forecastEnd, tz, false)}</dd></div>
                  <div><dt className="text-xs text-muted">Responsible</dt><dd>{m.responsible}</dd></div>
                  <div><dt className="text-xs text-muted">Blockers</dt><dd>{m.blockers.length ? m.blockers.join("; ") : "None recorded"}</dd></div>
                </dl>
                {edit && <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-forest">Revise forecast</summary><div className="mt-3 max-w-xl"><JsonForm compact endpoint={`/api/office/milestones/${m.id}/forecast`} fields={[{ name: "forecastStart", label: "Forecast start", type: "date", value: m.forecastStart }, { name: "forecastEnd", label: "Forecast end", type: "date", value: m.forecastEnd }, { name: "reason", label: "Reason (shown to the owner)", type: "textarea", required: true }]} submitLabel="Save forecast" done="Forecast revised and logged." /></div></details>}
              </li>
            );
          })}
        </ol>
      </Card>
      <Card className="mt-5" title="Schedule change history">
        <ul className="divide-y divide-line text-sm">{revs.map((r) => (
          <li key={r.id} className="py-3"><p className="font-semibold text-forest">{v.milestones.find((m) => m.id === r.milestoneId)?.title} — forecast revision {r.revision}</p><p className="text-muted">{fmtDate(r.from.end, tz, false)} → {fmtDate(r.to.end, tz, false)} · {r.reason} · approved by {v.name(r.approvedBy)} on {fmtDate(r.createdAt, tz)}</p></li>
        ))}</ul>
      </Card>
    </ProjectFrame>
  );
}
