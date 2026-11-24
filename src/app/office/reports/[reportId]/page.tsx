import { notFound } from "next/navigation";
import { requireUser } from "@/lib/transparency/page";
import { can } from "@/lib/transparency/rbac";
import { getStore, projectCtx, ServiceError } from "@/lib/transparency/service";
import { snapshot } from "@/lib/transparency/views";
import { reportTransitions, reportStatusLabel } from "@/lib/transparency/states";
import { StaffFrame } from "@/components/portal/StaffFrame";
import { ReportCard } from "@/components/portal/ReportCard";
import { JsonForm } from "@/components/portal/JsonForm";
import { Card, PageTitle } from "@/components/portal/ui";
import type { ReviewDecision } from "@/lib/transparency/types";

export const dynamic = "force-dynamic";
const to: Record<ReviewDecision, string> = { approve: "OFFICE_REVIEWED", request_correction: "NEEDS_CORRECTION", require_inspection: "INSPECTION_PENDING", publish: "PUBLISHED" };
const lbl: Record<ReviewDecision, string> = { approve: "Mark office reviewed", request_correction: "Return for correction", require_inspection: "Require inspection", publish: "Publish to owner" };

export default async function ReviewReport({ params }: { params: Promise<{ reportId: string }> }) {
  const { reportId } = await params;
  const user = await requireUser(`/office/reports/${reportId}`);
  const s = getStore();
  const r = await s.get("site_reports", reportId);
  if (!r || r.tenantId !== user.tenantId || !r.revisions.length) notFound();
  let ctx;
  try { ctx = await projectCtx(user, r.projectId, "report.review"); } catch (e) { if (e instanceof ServiceError) notFound(); throw e; }
  const v = await snapshot(ctx);
  const media = await s.list("media_assets", { reportId });
  const allowed = (Object.keys(to) as ReviewDecision[]).filter((d) => reportTransitions[r.status].includes(to[d] as never) && (d !== "publish" || can(ctx.grant, "report.publish")));
  const own = r.authorId === user.id;
  const open = v.disputes.filter((d) => d.reportId === r.id && d.status === "open");
  return (
    <StaffFrame user={user} active="queue">
      <PageTitle eyebrow={`${ctx.project.code} · ${reportStatusLabel[r.status]}`} title="Review site report">Check the evidence against the notes. Field-reported quantities are not measurements. Returning a report keeps the original revision on record.</PageTitle>
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <ReportCard r={r} state={v.ev(r)} wps={v.wps} media={media} name={v.name} tz={user.timezone} userId={user.id} reviews={v.reviews.filter((x) => x.reportId === r.id)} inspections={v.inspections} disputes={v.disputes} comments={v.comments.filter((c) => c.parentRef === `report:${r.id}`)} staff />
        <div className="space-y-5">
          <Card title="Decision">
            {own ? <p className="text-sm text-muted">You wrote this report, so someone else has to review it.</p> : allowed.length === 0 ? <p className="text-sm text-muted">No review action is available in this state.</p> : (
              <JsonForm endpoint={`/api/office/reports/${r.id}/review`} actionField="decision" fields={[{ name: "notes", label: "Notes for the field team (required to return)", type: "textarea", placeholder: "e.g. Need a closer shot of the spacer blocks under the rebar." }]} actions={allowed.map((d) => ({ value: d, label: lbl[d], tone: d === "request_correction" ? "danger" : d === "publish" ? "primary" : "ghost" }))} done="Decision recorded." />
            )}
          </Card>
          <Card title="Review history">
            <ul className="space-y-2 text-sm">{v.reviews.filter((x) => x.reportId === r.id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)).map((x) => <li key={x.id}><strong>{lbl[x.decision]}</strong> (rev {x.revision}) — {v.name(x.reviewerId)}{x.notes ? `: ${x.notes}` : ""}</li>)}</ul>
          </Card>
          {open.length > 0 && can(ctx.grant, "dispute.resolve") && open.map((d) => (
            <Card key={d.id} title="Resolve dispute"><p className="mb-3 text-sm">{d.reason}</p><JsonForm endpoint={`/api/office/disputes/${d.id}/resolve`} fields={[{ name: "resolution", label: "Resolution (added to the record)", type: "textarea", required: true }]} submitLabel="Record resolution" done="Resolution recorded." /></Card>
          ))}
        </div>
      </div>
    </StaffFrame>
  );
}
