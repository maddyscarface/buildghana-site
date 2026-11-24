import { requireProject } from "@/lib/transparency/page";
import { can } from "@/lib/transparency/rbac";
import { getStore } from "@/lib/transparency/service";
import { ProjectFrame } from "@/components/portal/ProjectFrame";
import { Card, Empty, fmtDate, PageTitle, Pill } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function Documents({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await requireProject(projectId, "documents.view");
  const all = await getStore().list("documents", { projectId });
  const restrictedOk = ["accountant", "project_manager", "ops_admin"].includes(ctx.grant.role);
  const docs = all.filter((d) => d.accessClass === "project" || (d.accessClass === "financial" && can(ctx.grant, "documents.view_financial", ctx.project)) || (d.accessClass === "restricted" && restrictedOk));
  const hidden = all.length - docs.length;
  const tz = ctx.user.timezone;
  return (
    <ProjectFrame ctx={ctx} active="/documents">
      <PageTitle eyebrow="Documents" title="Drawings, inspection records and approved documents">Published drawings show revision, date and author. Superseded revisions are kept. Source drawings are never edited in the browser.</PageTitle>
      <Card>
        {docs.length === 0 ? <Empty>No documents shared with you.</Empty> : (
          <ul className="divide-y divide-line">
            {docs.sort((a, b) => a.title.localeCompare(b.title) || b.version - a.version).map((d) => (
              <li key={d.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0"><p className="font-semibold text-forest">{d.title}</p><p className="text-xs text-muted">{d.revisionLabel} · {d.author} · issued {fmtDate(d.issuedAt, tz, false)}</p></div>
                <div className="flex flex-wrap gap-1.5"><Pill tone={d.approvalState === "superseded" ? "neutral" : "good"}>{d.approvalState === "superseded" ? "Superseded" : "Published"}</Pill><Pill>{d.accessClass === "project" ? "Project" : d.accessClass === "financial" ? "Financial" : "Restricted"}</Pill>{d.synthetic && <Pill tone="warn">Synthetic — no file</Pill>}</div>
              </li>
            ))}
          </ul>
        )}
        {hidden > 0 && <p className="mt-4 text-sm text-muted">{hidden} document(s) are restricted at your access level.</p>}
      </Card>
    </ProjectFrame>
  );
}
