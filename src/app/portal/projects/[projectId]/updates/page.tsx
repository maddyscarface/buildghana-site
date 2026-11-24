import { requireProject } from "@/lib/transparency/page";
import { snapshot } from "@/lib/transparency/views";
import { can } from "@/lib/transparency/rbac";
import { getStore } from "@/lib/transparency/service";
import { ProjectFrame } from "@/components/portal/ProjectFrame";
import { ReportCard } from "@/components/portal/ReportCard";
import { JsonForm } from "@/components/portal/JsonForm";
import { Empty, PageTitle } from "@/components/portal/ui";
import { evidenceLabel } from "@/lib/transparency/states";

export const dynamic = "force-dynamic";

export default async function Updates({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await requireProject(projectId, "project.view");
  if (!can(ctx.grant, "reports.view_published", ctx.project) && !can(ctx.grant, "reports.view_all")) return <ProjectFrame ctx={ctx} active="/updates"><Empty>Site reports are not shared with your access level.</Empty></ProjectFrame>;
  const v = await snapshot(ctx);
  const media = await getStore().list("media_assets", { projectId });
  const reports = v.reports.filter((r) => r.revisions.length);
  return (
    <ProjectFrame ctx={ctx} active="/updates">
      <PageTitle eyebrow="Site updates" title="Timeline of reports">
        Each update shows its evidence state: {Object.values(evidenceLabel).map((e) => e.label).join(" → ")}. Disputes are appended to the record, never deleted. {v.staff ? "As staff you also see reports that are not yet published." : "Only reports the office has published are shown."}
      </PageTitle>
      {reports.length === 0 ? <Empty>No updates yet.</Empty> : (
        <div className="space-y-5">
          {reports.map((r) => (
            <ReportCard key={r.id} r={r} state={v.ev(r)} wps={v.wps} media={media} name={v.name} tz={ctx.user.timezone} userId={ctx.user.id} reviews={v.reviews.filter((x) => x.reportId === r.id)} inspections={v.inspections} disputes={v.disputes} comments={v.comments.filter((c) => c.parentRef === `report:${r.id}`)} staff={v.staff}>
              <div className="mt-4 grid gap-4 border-t border-line pt-4 md:grid-cols-2">
                {can(ctx.grant, "comments.write") && <details><summary className="cursor-pointer text-sm font-semibold text-forest">Ask a question</summary><div className="mt-3"><JsonForm compact endpoint={`/api/portal/projects/${projectId}/comments`} extra={{ parentRef: `report:${r.id}` }} fields={[{ name: "text", label: "Your question", type: "textarea", required: true }]} submitLabel="Send question" done="Question added to the project record." /></div></details>}
                {can(ctx.grant, "dispute.raise") && r.status !== "DISPUTED" && ["PUBLISHED", "VERIFIED"].includes(r.status) && <details><summary className="cursor-pointer text-sm font-semibold text-[#8a2f1d]">Question this evidence (dispute)</summary><div className="mt-3"><JsonForm compact endpoint={`/api/portal/reports/${r.id}/dispute`} fields={[{ name: "reason", label: "What are you questioning?", type: "textarea", required: true, help: "The original report stays on record; your dispute is added to it." }]} submitLabel="Raise dispute" done="Dispute recorded. The project manager will respond." /></div></details>}
              </div>
            </ReportCard>
          ))}
        </div>
      )}
    </ProjectFrame>
  );
}
