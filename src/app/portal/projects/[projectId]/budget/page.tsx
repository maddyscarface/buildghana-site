import { requireProject } from "@/lib/transparency/page";
import { can } from "@/lib/transparency/rbac";
import { ledgerFor } from "@/lib/transparency/service";
import { snapshot } from "@/lib/transparency/views";
import { formatMinor } from "@/lib/transparency/ledger";
import { paymentStatusLabel } from "@/lib/transparency/states";
import { DEMO_AMOUNT_NOTE } from "@/lib/transparency/seed";
import { ProjectFrame } from "@/components/portal/ProjectFrame";
import { JsonForm } from "@/components/portal/JsonForm";
import { Card, fmtDate, PageTitle, Pill } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function Budget({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await requireProject(projectId, "budget.view");
  const [{ summary: s, lines, changeOrders, requests, disbursements }, v] = await Promise.all([ledgerFor(ctx), snapshot(ctx)]);
  const g = (n: number) => formatMinor(n, s.currency);
  const tz = ctx.user.timezone;
  const buckets: [string, string, { count: number; minor: number }, string][] = [
    ["Requested", "Submitted by the contractor, not yet approved", s.requested, "bg-ivory-2"],
    ["Authorised — not paid", "Owner authorised; no payment recorded", s.authorisedUnpaid, "bg-[#fbefd9]"],
    ["Disbursed — awaiting reconciliation", "Payment recorded from evidence; not yet reconciled", s.disbursedPendingReconciliation, "bg-[#e9eef3]"],
    ["Paid — reconciled", "Matched to bank or payment-system evidence", s.reconciledPaid, "bg-[#e5efe8]"],
  ];
  return (
    <ProjectFrame ctx={ctx} active="/budget">
      <PageTitle eyebrow="Budget & payments" title="Approved budget and money ledger">
        This is a project accounting visibility ledger — not a wallet, bank or escrow. The portal never sends or releases money. {DEMO_AMOUNT_NOTE} Currency: {s.currency}. FX rate: Not provided (no conversion is shown).
      </PageTitle>
      <div className="grid gap-4 sm:grid-cols-3">
        <Card><p className="text-xs uppercase tracking-wider text-muted">Baseline budget</p><p className="mt-1 font-display text-2xl text-forest">{g(s.baselineMinor)}</p></Card>
        <Card><p className="text-xs uppercase tracking-wider text-muted">Approved changes</p><p className="mt-1 font-display text-2xl text-forest">{g(s.approvedChangesMinor)}</p><p className="text-xs text-muted">Pending change orders (not included): {g(s.pendingChangeOrders.minor)}</p></Card>
        <Card><p className="text-xs uppercase tracking-wider text-muted">Current approved budget</p><p className="mt-1 font-display text-2xl text-forest">{g(s.currentApprovedBudgetMinor)}</p><p className="text-xs text-muted">Committed: {g(s.committedMinor)}</p></Card>
      </div>
      <h2 className="mt-8 font-display text-[1.5rem] text-forest">Payment pipeline — four separate figures, never added together</h2>
      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {buckets.map(([t, d, b, bg]) => <div key={t} className={`rounded-[18px] border border-line p-5 ${bg}`}><p className="text-sm font-semibold text-forest">{t}</p><p className="mt-1 font-display text-2xl text-forest">{g(b.minor)}</p><p className="text-xs text-muted">{b.count} request(s) · {d}</p></div>)}
      </div>

      <Card className="mt-6" title="Payment requests">
        <div className="-mx-1 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
          <thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="px-2 py-2">Request</th><th className="px-2 py-2">Milestone</th><th className="px-2 py-2">Amount requested</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Disbursement evidence</th></tr></thead>
          <tbody className="divide-y divide-line">{requests.sort((a, b) => a.number.localeCompare(b.number)).map((r) => {
            const d = disbursements.find((x) => x.paymentRequestId === r.id);
            return (
              <tr key={r.id} className="align-top">
                <td className="px-2 py-3 font-semibold text-forest">{r.number}<p className="text-xs font-normal text-muted">{r.payee} · cost code {r.costCode}</p></td>
                <td className="px-2 py-3">{v.milestones.find((m) => m.id === r.milestoneId)?.title}</td>
                <td className="px-2 py-3">{g(r.amountMinor)}</td>
                <td className="px-2 py-3"><Pill tone={r.status === "RECONCILED" ? "good" : r.status === "REJECTED" || r.status === "CANCELLED" ? "bad" : "warn"}>{paymentStatusLabel[r.status]}</Pill>
                  <details className="mt-1 text-xs text-muted"><summary className="cursor-pointer">History</summary><ul className="mt-1 space-y-0.5">{r.history.map((h, i) => <li key={i}>{paymentStatusLabel[h.status]} — {v.name(h.by)}, {fmtDate(h.at, tz, false)}</li>)}</ul></details>
                  {r.status === "AWAITING_OWNER_APPROVAL" && can(ctx.grant, "payment.owner_authorize", ctx.project) && (
                    <div className="mt-3 max-w-sm rounded-xl border border-line p-3"><p className="mb-2 text-xs text-muted">Authorising records your approval only. It does not send money.</p>
                      <JsonForm compact endpoint={`/api/portal/payment-requests/${r.id}/authorize`} fields={[{ name: "reason", label: "Note (required to reject or ask)", type: "text" }, { name: "confirmation", label: `Type ${ctx.project.code} to confirm`, type: "text", required: true }]} actions={[{ value: "approve", label: "Authorise" }, { value: "clarify", label: "Ask for clarification", tone: "ghost" }, { value: "reject", label: "Reject", tone: "danger" }]} done="Recorded." /></div>
                  )}
                </td>
                <td className="px-2 py-3 text-xs">{d ? <>Recorded {fmtDate(d.paidAt, tz, false)} · ref {d.sourceReference}<br />{d.reconciledAt ? `Reconciled ${fmtDate(d.reconciledAt, tz, false)} by ${v.name(d.reconciledBy ?? "")}` : "Not yet reconciled"}</> : <span className="text-muted">None</span>}</td>
              </tr>
            );
          })}</tbody>
        </table></div>
      </Card>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card title="Budget lines">
          <table className="w-full text-left text-sm"><thead className="text-xs uppercase tracking-wider text-muted"><tr><th className="py-2">Cost code</th><th className="py-2">Baseline</th><th className="py-2">Approved changes</th></tr></thead>
            <tbody className="divide-y divide-line">{lines.map((l) => { const ch = changeOrders.filter((c) => c.costCode === l.costCode && c.status === "APPROVED").reduce((x, c) => x + (c.approvedDeltaMinor ?? 0), 0); return <tr key={l.id}><td className="py-2">{l.costCode} · {l.label}</td><td className="py-2">{g(l.baselineMinor)}</td><td className="py-2">{ch ? g(ch) : "—"}</td></tr>; })}</tbody></table>
        </Card>
        <Card title="Change orders">
          <ul className="divide-y divide-line text-sm">{changeOrders.map((c) => (
            <li key={c.id} className="py-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-forest">{c.number}</p><Pill tone={c.status === "APPROVED" ? "good" : c.status === "REJECTED" ? "bad" : "warn"}>{c.status === "AWAITING_OWNER" ? "Awaiting owner decision" : c.status.charAt(0) + c.status.slice(1).toLowerCase()}</Pill></div><p className="mt-1">{c.description}</p><p className="text-xs text-muted">Proposed {g(c.proposedDeltaMinor)}{c.approvedDeltaMinor !== null ? ` · approved ${g(c.approvedDeltaMinor)} on ${fmtDate(c.approvedAt, tz, false)}` : ""} · source: {c.sourceDoc}. Approved change orders are immutable; changes need a superseding amendment.</p></li>
          ))}</ul>
        </Card>
      </div>
    </ProjectFrame>
  );
}
