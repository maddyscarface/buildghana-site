import { requireProject } from "@/lib/transparency/page";
import { can } from "@/lib/transparency/rbac";
import { getStore } from "@/lib/transparency/service";
import { snapshot } from "@/lib/transparency/views";
import { formatMinor } from "@/lib/transparency/ledger";
import { ProjectFrame } from "@/components/portal/ProjectFrame";
import { JsonForm } from "@/components/portal/JsonForm";
import { Card, Empty, fmtDate, PageTitle, Pill } from "@/components/portal/ui";

export const dynamic = "force-dynamic";
const label = { OPEN: "Open", APPROVED: "Approved", REJECTED: "Rejected", CLARIFICATION_REQUESTED: "Clarification requested", WITHDRAWN: "Withdrawn" } as const;

export default async function Decisions({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await requireProject(projectId, "decisions.view");
  const v = await snapshot(ctx);
  const cos = await getStore().list("change_orders", { projectId });
  const money = can(ctx.grant, "budget.view", ctx.project);
  const tz = ctx.user.timezone;
  return (
    <ProjectFrame ctx={ctx} active="/decisions">
      <PageTitle eyebrow="Decisions" title="Change orders and owner decisions">Approving a change order adds it to the approved budget — it never releases a payment. Decisions are recorded with who acted, when and on which version. Approved decisions can&apos;t be edited.</PageTitle>
      {v.decisions.length === 0 ? <Empty>No decisions.</Empty> : (
        <div className="space-y-5">
          {v.decisions.map((d) => {
            const co = cos.find((c) => c.id === d.changeOrderId);
            const mine = d.assignedTo === ctx.user.id && can(ctx.grant, "decisions.respond") && (d.status === "OPEN" || d.status === "CLARIFICATION_REQUESTED");
            const late = (d.status === "OPEN" || d.status === "CLARIFICATION_REQUESTED") && d.deadline < new Date().toISOString().slice(0, 10);
            return (
              <Card key={d.id} title={d.title} action={<div className="flex gap-1.5"><Pill tone={d.status === "APPROVED" ? "good" : d.status === "REJECTED" ? "bad" : "warn"}>{label[d.status]}</Pill>{late && <Pill tone="bad">Overdue</Pill>}</div>}>
                <p className="text-[15px] leading-relaxed text-ink/85">{d.description}</p>
                <p className="mt-2 text-xs text-muted">Requested by {v.name(d.requestedBy)} · assigned to {v.name(d.assignedTo)} · due {fmtDate(d.deadline, tz, false)} · version {d.payloadVersion}</p>
                {co && <p className="mt-2 text-sm"><span className="font-semibold text-forest">{co.number}</span> · {money ? `proposed change ${formatMinor(co.proposedDeltaMinor, co.currency)} (synthetic figure)` : "amount hidden at your access level"} · source: {co.sourceDoc}</p>}
                {d.votes.length > 0 && <ul className="mt-3 space-y-1 rounded-xl bg-ivory px-4 py-3 text-sm">{d.votes.map((x, i) => <li key={i}><strong className="capitalize">{x.action}</strong> by {v.name(x.userId)} · {fmtDate(x.actedAt, tz)} · on version {x.payloadVersion}{x.comments ? ` — “${x.comments}”` : ""}</li>)}</ul>}
                {mine && (
                  <div className="mt-4 max-w-xl rounded-xl border border-line p-4">
                    <JsonForm endpoint={`/api/portal/decisions/${d.id}/respond`} extra={{ payloadVersion: d.payloadVersion }} fields={[{ name: "comments", label: "Comment (required if asking for clarification)", type: "textarea" }, { name: "confirmation", label: `Type ${ctx.project.code} to confirm`, type: "text", required: true, help: "Explicit confirmation. Production will use step-up sign-in (MFA) here." }]} actions={[{ value: "approve", label: "Approve" }, { value: "clarify", label: "Ask for clarification", tone: "ghost" }, { value: "reject", label: "Reject", tone: "danger" }]} done="Your decision was recorded." />
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </ProjectFrame>
  );
}
