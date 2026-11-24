import { requireUser } from "@/lib/transparency/page";
import { can } from "@/lib/transparency/rbac";
import { getStore, ledgerFor, listMyProjects, projectCtx } from "@/lib/transparency/service";
import { formatMinor } from "@/lib/transparency/ledger";
import { paymentStatusLabel } from "@/lib/transparency/states";
import { DEMO_AMOUNT_NOTE } from "@/lib/transparency/seed";
import { StaffFrame } from "@/components/portal/StaffFrame";
import { JsonForm } from "@/components/portal/JsonForm";
import { Card, Empty, PageTitle, Pill } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function Financials() {
  const user = await requireUser("/office/financials");
  const s = getStore();
  const projects = (await listMyProjects(user)).filter((x) => can(x.grant, "budget.view", x.project));
  if (!projects.length) return <StaffFrame user={user} active="financials"><Empty>No projects with financial access.</Empty></StaffFrame>;
  return (
    <StaffFrame user={user} active="financials">
      <PageTitle eyebrow="Financials" title="Payment workflow">Every step is a person acting and is logged. Recording a disbursement needs bank or payment-system evidence; only reconciled payments show as paid. {DEMO_AMOUNT_NOTE}</PageTitle>
      <div className="space-y-6">
        {await Promise.all(projects.map(async ({ project }) => {
          const ctx = await projectCtx(user, project.id, "budget.view");
          const { summary: sm, requests } = await ledgerFor(ctx);
          const [ms, docs] = await Promise.all([s.list("milestones", { projectId: project.id }), s.list("documents", { projectId: project.id })]);
          const bank = docs.filter((d) => d.documentType === "bank_evidence" && d.approvalState !== "superseded");
          const g = (n: number) => formatMinor(n, sm.currency);
          return (
            <Card key={project.id} title={`${project.name} · ${project.code}`}>
              <div className="grid gap-3 text-sm sm:grid-cols-4">
                {([["Requested", sm.requested], ["Authorised — not paid", sm.authorisedUnpaid], ["Disbursed — awaiting reconciliation", sm.disbursedPendingReconciliation], ["Paid — reconciled", sm.reconciledPaid]] as const).map(([t, b]) => <div key={t} className="rounded-xl bg-ivory p-3"><p className="text-xs text-muted">{t}</p><p className="font-display text-lg text-forest">{g(b.minor)}</p></div>)}
              </div>
              <ul className="mt-4 divide-y divide-line">{requests.sort((a, b) => a.number.localeCompare(b.number)).map((r) => (
                <li key={r.id} className="py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-forest">{r.number} · {g(r.amountMinor)} <span className="font-normal text-muted">· {ms.find((m) => m.id === r.milestoneId)?.title}</span></p><Pill tone={r.status === "RECONCILED" ? "good" : r.status === "REJECTED" || r.status === "CANCELLED" ? "bad" : "warn"}>{paymentStatusLabel[r.status]}</Pill></div>
                  {(r.status === "SUBMITTED" || r.status === "EVIDENCE_REVIEW") && can(ctx.grant, "payment.evidence_review") && (
                    <div className="mt-3 max-w-xl"><JsonForm compact endpoint={`/api/office/payment-requests/${r.id}/review`} fields={[{ name: "reason", label: "Evidence review note", type: "text" }]} actions={r.status === "SUBMITTED" ? [{ value: "start_review", label: "Start evidence review" }, { value: "cancel", label: "Cancel", tone: "danger" }] : [{ value: "recommend", label: "Send to owner for authorisation" }, { value: "reject", label: "Reject", tone: "danger" }]} done="Recorded." /></div>
                  )}
                  {r.status === "APPROVED_FOR_PAYMENT" && can(ctx.grant, "payment.record_disbursement") && (
                    <div className="mt-3 max-w-xl"><p className="mb-2 text-xs text-muted">Record only a payment that actually happened outside this portal, with evidence.</p><JsonForm compact endpoint={`/api/office/payment-requests/${r.id}/disburse`} fields={[
                      { name: "paidMinor", label: `Amount paid (${sm.currency})`, type: "money", required: true, value: String(r.amountMinor / 100) },
                      { name: "paidAt", label: "Date paid", type: "date", required: true },
                      { name: "sourceReference", label: "Bank / payment reference", type: "text", required: true, placeholder: "DEMO-REF-…" },
                      { name: "evidenceDocId", label: "Evidence document", type: "select", required: true, options: bank.map((d) => ({ value: d.id, label: d.title })) },
                    ]} submitLabel="Record disbursement" done="Disbursement recorded — awaiting reconciliation." /></div>
                  )}
                  {r.status === "PAID_PENDING_RECONCILIATION" && can(ctx.grant, "payment.reconcile") && (
                    <div className="mt-3 max-w-xl"><JsonForm compact endpoint={`/api/office/payment-requests/${r.id}/reconcile`} fields={[{ name: "note", label: "Reconciliation note", type: "text" }]} submitLabel="Mark reconciled" done="Reconciled." /></div>
                  )}
                </li>
              ))}</ul>
              {can(ctx.grant, "payment.request.create") && (
                <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-forest">New payment request</summary><div className="mt-3 max-w-xl"><JsonForm endpoint={`/api/office/projects/${project.id}/payment-requests`} fields={[{ name: "milestoneId", label: "Milestone", type: "select", required: true, options: ms.sort((a, b) => a.phase - b.phase).map((m) => ({ value: m.id, label: m.title })) }, { name: "amountMinor", label: `Amount (${sm.currency}, synthetic)`, type: "money", required: true }, { name: "costCode", label: "Cost code", type: "text", required: true }, { name: "supportingEvidence", label: "Supporting evidence", type: "checks", options: docs.filter((d) => d.approvalState !== "superseded").map((d) => ({ value: d.id, label: d.title })) }]} submitLabel="Submit request" done="Payment request submitted." /></div></details>
              )}
              {can(ctx.grant, "change_order.propose") && (
                <details className="mt-3"><summary className="cursor-pointer text-sm font-semibold text-forest">Propose change order</summary><div className="mt-3 max-w-xl"><JsonForm endpoint={`/api/office/projects/${project.id}/change-orders`} fields={[{ name: "description", label: "What changes and why", type: "textarea", required: true }, { name: "sourceDoc", label: "Source document / quote reference", type: "text", required: true }, { name: "proposedDeltaMinor", label: `Cost change (${sm.currency}, synthetic)`, type: "money", required: true }, { name: "costCode", label: "Cost code", type: "text", required: true }, { name: "deadline", label: "Owner decision needed by", type: "date", required: true }]} submitLabel="Send to owner" done="Change order sent to the owner as a decision request." /></div></details>
              )}
            </Card>
          );
        }))}
      </div>
    </StaffFrame>
  );
}
