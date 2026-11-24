import Link from "next/link";
import { requireUser } from "@/lib/transparency/page";
import { can } from "@/lib/transparency/rbac";
import { getStore, listMyProjects } from "@/lib/transparency/service";
import { reportStatusLabel } from "@/lib/transparency/states";
import { StaffFrame } from "@/components/portal/StaffFrame";
import { Card, Empty, fmtDate, PageTitle, Pill } from "@/components/portal/ui";
import type { ReportStatus } from "@/lib/transparency/types";

export const dynamic = "force-dynamic";
const QUEUE: ReportStatus[] = ["SUBMITTED", "OFFICE_REVIEWED", "INSPECTION_PENDING", "DISPUTED"];

export default async function Queue({ searchParams }: { searchParams: Promise<{ status?: string; project?: string }> }) {
  const user = await requireUser("/office");
  const sp = await searchParams;
  const projects = (await listMyProjects(user)).filter((x) => can(x.grant, "report.review"));
  const s = getStore();
  const [users, ms] = await Promise.all([s.list("users", { tenantId: user.tenantId }), s.list("milestones", {})]);
  const rows = (await Promise.all(projects.map(async ({ project }) => (await s.list("site_reports", { projectId: project.id })).map((r) => ({ r, project })))))
    .flat()
    .filter(({ r }) => (sp.status ? r.status === sp.status : QUEUE.includes(r.status)) && (!sp.project || r.projectId === sp.project))
    .sort((a, b) => (a.r.revisions.at(-1)?.submittedAt ?? "").localeCompare(b.r.revisions.at(-1)?.submittedAt ?? ""));
  const age = (iso?: string) => (iso ? Math.max(0, Math.floor((Date.now() - Date.parse(iso)) / 86400000)) : 0);
  const chip = (label: string, q: Record<string, string>) => {
    const href = `/office?${new URLSearchParams({ ...(sp.project ? { project: sp.project } : {}), ...q })}`;
    const on = (q.status ?? "") === (sp.status ?? "");
    return <Link key={label} href={href} className={`inline-flex min-h-11 items-center rounded-full px-4 text-sm font-semibold ${on ? "bg-forest text-gold" : "bg-white text-forest"}`}>{label}</Link>;
  };
  if (!projects.length) return <StaffFrame user={user} active="queue"><Empty>Your role doesn&apos;t review reports.</Empty></StaffFrame>;
  return (
    <StaffFrame user={user} active="queue">
      <PageTitle eyebrow="Office" title="Review queue">Oldest first. Nothing reaches the owner until it is published. You can&apos;t review reports you wrote.</PageTitle>
      <div className="mb-4 flex flex-wrap gap-2">{chip("All open", {})}{QUEUE.map((q) => chip(reportStatusLabel[q], { status: q }))}{chip("Returned", { status: "NEEDS_CORRECTION" })}{chip("Published", { status: "PUBLISHED" })}</div>
      <div className="mb-5 flex flex-wrap gap-2 text-sm">{projects.map(({ project }) => <Link key={project.id} href={`/office?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), project: project.id })}`} className={`rounded-full border px-3 py-1.5 ${sp.project === project.id ? "border-forest bg-forest/5 font-semibold" : "border-line"}`}>{project.code}</Link>)}{sp.project && <Link href={`/office${sp.status ? `?status=${sp.status}` : ""}`} className="px-2 py-1.5 underline">all projects</Link>}</div>
      <Card>
        {rows.length === 0 ? <Empty>Queue is clear.</Empty> : (
          <div className="-mx-1 overflow-x-auto"><table className="w-full min-w-[720px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="px-2 py-2">Report</th><th className="px-2 py-2">Project</th><th className="px-2 py-2">Milestone</th><th className="px-2 py-2">Author</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Age</th></tr></thead>
            <tbody className="divide-y divide-line">{rows.map(({ r, project }) => {
              const sub = r.revisions.at(-1)?.submittedAt;
              return (
                <tr key={r.id}>
                  <td className="px-2 py-3"><Link href={`/office/reports/${r.id}`} className="font-semibold text-forest underline-offset-2 hover:underline">{r.revisions.at(-1)?.summary ?? r.draft.summary ?? r.id}</Link><p className="text-xs text-muted">rev {r.revisions.length} · {fmtDate(sub, user.timezone)}</p></td>
                  <td className="px-2 py-3">{project.code}</td>
                  <td className="px-2 py-3">{ms.find((m) => m.id === r.milestoneId)?.title}</td>
                  <td className="px-2 py-3">{users.find((u) => u.id === r.authorId)?.name}</td>
                  <td className="px-2 py-3"><Pill tone={r.status === "DISPUTED" ? "bad" : "warn"}>{reportStatusLabel[r.status]}</Pill></td>
                  <td className="px-2 py-3">{age(sub)} d</td>
                </tr>
              );
            })}</tbody>
          </table></div>
        )}
      </Card>
    </StaffFrame>
  );
}
