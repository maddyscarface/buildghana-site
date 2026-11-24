import Link from "next/link";
import { requireUser } from "@/lib/transparency/page";
import { can, roleLabel } from "@/lib/transparency/rbac";
import { getStore, listMyProjects } from "@/lib/transparency/service";
import { staffNav } from "@/lib/transparency/nav";
import { milestoneStatusLabel } from "@/lib/transparency/states";
import { Card, Empty, PageTitle, Pill, PortalHeader } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function FieldProjects() {
  const user = await requireUser("/field/projects");
  const list = (await listMyProjects(user)).filter((x) => can(x.grant, "report.create"));
  const s = getStore();
  const mine = await s.list("site_reports", { authorId: user.id });
  return (
    <>
      <PortalHeader userName={user.name} roleLabel={user.staffRole ? roleLabel[user.staffRole] : undefined} area="Field reporting" nav={staffNav(user.staffRole, "field")} />
      <main className="mx-auto max-w-xl px-4 py-6">
        <PageTitle eyebrow="Field" title="Your assigned sites">Pick a site, then follow the safety check before taking any photos.</PageTitle>
        {list.length === 0 ? <Empty>You aren&apos;t assigned to any project.</Empty> : (
          <div className="space-y-4">
            {await Promise.all(list.map(async ({ project }) => {
              const ms = (await s.list("milestones", { projectId: project.id })).sort((a, b) => a.phase - b.phase).filter((m) => m.status !== "COMPLETE_VERIFIED");
              const returned = mine.filter((r) => r.projectId === project.id && r.status === "NEEDS_CORRECTION").length;
              const drafts = mine.filter((r) => r.projectId === project.id && r.status === "DRAFT").length;
              return (
                <Card key={project.id} title={project.name}>
                  <p className="text-sm text-muted">{project.code} · {project.locationPublic}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5">{project.synthetic && <Pill tone="warn">Synthetic demo</Pill>}{returned > 0 && <Pill tone="bad">{returned} returned for correction</Pill>}{drafts > 0 && <Pill>{drafts} draft(s)</Pill>}</div>
                  <ul className="mt-3 space-y-1 text-sm">{ms.map((m) => <li key={m.id} className="flex justify-between gap-2"><span>{m.phase}. {m.title}</span><span className="shrink-0 text-xs text-muted">{milestoneStatusLabel[m.status]}</span></li>)}</ul>
                  <Link href={`/field/projects/${project.id}/report/new`} className="btn-gold mt-4 w-full">New site report</Link>
                </Card>
              );
            }))}
            <Link href="/field/drafts" className="btn-ghost-dark w-full">Drafts &amp; corrections</Link>
          </div>
        )}
      </main>
    </>
  );
}
