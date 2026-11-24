import { notFound } from "next/navigation";
import { requireProject } from "@/lib/transparency/page";
import { can, roleLabel } from "@/lib/transparency/rbac";
import { getStore } from "@/lib/transparency/service";
import { staffNav } from "@/lib/transparency/nav";
import { ATTESTATION_TEXT } from "@/lib/transparency/seed";
import { FieldReportWizard } from "@/components/portal/FieldReportWizard";
import { PortalHeader } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function NewReport({ params, searchParams }: { params: Promise<{ projectId: string }>; searchParams: Promise<{ report?: string }> }) {
  const { projectId } = await params;
  const { report } = await searchParams;
  const ctx = await requireProject(projectId, "report.create", `/field/projects/${projectId}/report/new`);
  if (!can(ctx.grant, "report.create")) notFound();
  const s = getStore();
  const [ms, wps] = await Promise.all([s.list("milestones", { projectId }), s.list("work_packages", { projectId })]);
  const milestones = ms.filter((m) => m.status !== "COMPLETE_VERIFIED").sort((a, b) => a.phase - b.phase).map((m) => ({ id: m.id, title: m.title, phase: m.phase, trade: wps.find((w) => w.id === m.workPackageId)?.trade ?? "site_prep" }));
  let existing;
  if (report) {
    const r = await s.get("site_reports", report);
    if (!r || r.projectId !== projectId || r.authorId !== ctx.user.id || !(r.status === "DRAFT" || r.status === "NEEDS_CORRECTION")) notFound();
    const media = (await s.list("media_assets", { reportId: r.id })).filter((m) => r.draft.mediaIds.includes(m.id) || (m.uploadState === "pending" && m.uploaderId === ctx.user.id));
    const last = (await s.list("report_reviews", { reportId: r.id })).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    const { mediaIds: _m, updatedAt: _u, capturedAt: _c, ...text } = r.draft; // eslint-disable-line @typescript-eslint/no-unused-vars
    existing = {
      id: r.id, status: r.status, milestoneId: r.milestoneId,
      correction: r.status === "NEEDS_CORRECTION" ? last?.notes : undefined,
      draft: { ...text, crewCount: text.crewCount ?? "", quantities: text.quantities.map((q) => ({ item: q.item, qty: q.qty, unit: q.unit })) },
      media: media.map((m) => ({ id: m.id, stage: m.stage, caption: m.caption, sizeBytes: m.sizeBytes, receivedBytes: m.receivedBytes, uploadState: m.uploadState, mime: m.mime })),
    };
  }
  return (
    <>
      <PortalHeader userName={ctx.user.name} roleLabel={ctx.user.staffRole ? roleLabel[ctx.user.staffRole] : undefined} area="Field reporting" nav={staffNav(ctx.user.staffRole, "field")} />
      <main className="mx-auto max-w-xl px-4 py-5">
        <p className="eyebrow">{existing ? "Correction / draft" : "New site report"}</p>
        <h1 className="mt-1 font-display text-2xl text-forest">{ctx.project.name}</h1>
        <div className="mt-4"><FieldReportWizard project={{ id: ctx.project.id, code: ctx.project.code, name: ctx.project.name }} milestones={milestones} attestation={ATTESTATION_TEXT} existing={existing} /></div>
      </main>
    </>
  );
}
