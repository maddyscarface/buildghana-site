import { requireUser } from "@/lib/transparency/page";
import { can } from "@/lib/transparency/rbac";
import { getStore, listMyProjects } from "@/lib/transparency/service";
import { independenceLabel, milestoneStatusLabel } from "@/lib/transparency/states";
import { StaffFrame } from "@/components/portal/StaffFrame";
import { JsonForm } from "@/components/portal/JsonForm";
import { Card, Empty, fmtDate, PageTitle, Pill } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function Inspections() {
  const user = await requireUser("/office/inspections");
  const s = getStore();
  const mine = await listMyProjects(user);
  const projects = mine.filter((x) => can(x.grant, "inspection.record") || can(x.grant, "milestone.assess"));
  const users = await s.list("users", { tenantId: user.tenantId });
  const name = (id: string) => users.find((u) => u.id === id)?.name ?? "Unknown";
  if (!projects.length) return <StaffFrame user={user} active="inspections"><Empty>Your role doesn&apos;t record inspections.</Empty></StaffFrame>;
  return (
    <StaffFrame user={user} active="inspections">
      <PageTitle eyebrow="Inspections" title="Hold points and inspections">An inspection records scope, method and limitations. A pass marks the linked reports as inspected; a fail opens an issue. You can&apos;t inspect work you reported. Independence is derived from the inspector&apos;s organisation, not chosen here.</PageTitle>
      <div className="space-y-6">
        {await Promise.all(projects.map(async ({ project, grant }) => {
          const [ms, reports, ins] = await Promise.all([s.list("milestones", { projectId: project.id }), s.list("site_reports", { projectId: project.id }), s.list("inspections", { projectId: project.id })]);
          return (
            <Card key={project.id} title={`${project.name} · ${project.code}`}>
              <ul className="divide-y divide-line">{ms.sort((a, b) => a.phase - b.phase).map((m) => {
                const rs = reports.filter((r) => r.milestoneId === m.id && r.revisions.length && r.authorId !== user.id && !["ARCHIVED", "NEEDS_CORRECTION", "SUBMITTED"].includes(r.status));
                const done = ins.filter((i) => i.milestoneId === m.id);
                return (
                  <li key={m.id} className="py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-forest">{m.phase}. {m.title}</p><div className="flex gap-1.5">{m.requiresInspection && <Pill tone="warn">Hold point</Pill>}<Pill>{milestoneStatusLabel[m.status]}</Pill></div></div>
                    {done.map((i) => <p key={i.id} className="mt-1 text-sm"><strong>{i.result.replace(/_/g, " ")}</strong> · {fmtDate(i.inspectedAt, user.timezone)} · {name(i.inspectorId)} · {independenceLabel[i.independence]} · {i.credentialVerified ? "credential confirmed" : "credential not verified"}</p>)}
                    {can(grant, "inspection.record") && rs.length > 0 && (
                      <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-forest">Record an inspection</summary>
                        <div className="mt-3 max-w-xl"><JsonForm endpoint={`/api/office/milestones/${m.id}/inspection`} fields={[
                          { name: "result", label: "Result", type: "select", required: true, options: [{ value: "pass", label: "Pass" }, { value: "pass_with_conditions", label: "Pass with conditions" }, { value: "fail", label: "Fail" }] },
                          { name: "reportIds", label: "Reports covered", type: "checks", options: rs.map((r) => ({ value: r.id, label: `${r.revisions.at(-1)?.summary} (rev ${r.revisions.length})` })) },
                          { name: "scope", label: "Scope inspected", type: "textarea", required: true },
                          { name: "methods", label: "Method (visual, measured, tested…)", type: "text", required: true },
                          { name: "limitations", label: "Limitations (what was not checked)", type: "textarea", required: true },
                          { name: "signature", label: "Type your full name to sign", type: "text", required: true },
                        ]} submitLabel="Record inspection" done="Inspection recorded." /></div>
                      </details>
                    )}
                    {can(grant, "milestone.assess") && (
                      <details className="mt-2"><summary className="cursor-pointer text-sm font-semibold text-forest">Assess milestone status</summary>
                        <div className="mt-3 max-w-xl"><JsonForm endpoint={`/api/office/milestones/${m.id}/assess`} fields={[{ name: "to", label: "New status", type: "select", required: true, options: (["REPORTED_IN_PROGRESS", "UNDER_REVIEW", "APPROVED_PROGRESS", "COMPLETE_VERIFIED"] as const).map((x) => ({ value: x, label: milestoneStatusLabel[x] })) }, { name: "note", label: "Basis for this assessment", type: "textarea", required: true }]} submitLabel="Record assessment" done="Milestone updated." /></div>
                      </details>
                    )}
                  </li>
                );
              })}</ul>
            </Card>
          );
        }))}
      </div>
    </StaffFrame>
  );
}
