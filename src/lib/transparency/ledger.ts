/**
 * Project accounting VISIBILITY ledger (spec 02 §8). Not a wallet, bank or escrow: nothing here moves money.
 * Requested, authorised, recorded-disbursed and reconciled amounts are kept in separate buckets and are
 * never summed together. Totals are per currency — no FX conversion is ever applied or invented.
 */
import type { BudgetLine, ChangeOrder, Currency, Disbursement, PaymentRequest, PaymentStatus } from "./types";

export type LedgerBucket = { count: number; minor: number };
export type LedgerSummary = {
  currency: Currency;
  baselineMinor: number;
  approvedChangesMinor: number;
  currentApprovedBudgetMinor: number;
  committedMinor: number;
  pendingChangeOrders: LedgerBucket;
  /** Submitted and still under review / awaiting owner — NOT approved. */
  requested: LedgerBucket;
  /** Owner-authorised for payment but no disbursement recorded yet — NOT paid. */
  authorisedUnpaid: LedgerBucket;
  /** Disbursement recorded from evidence but not yet reconciled — NOT shown as paid. */
  disbursedPendingReconciliation: LedgerBucket;
  /** Reconciled actual payments — the only figure labelled "Paid". */
  reconciledPaid: LedgerBucket;
  rejectedOrCancelled: LedgerBucket;
};

const REQUESTED: PaymentStatus[] = ["SUBMITTED", "EVIDENCE_REVIEW", "AWAITING_OWNER_APPROVAL"];
const add = (b: LedgerBucket, minor: number) => { b.count += 1; b.minor += minor; };
const empty = (): LedgerBucket => ({ count: 0, minor: 0 });

export function summarizeLedger(currency: Currency, input: { lines: BudgetLine[]; changeOrders: ChangeOrder[]; requests: PaymentRequest[]; disbursements: Disbursement[] }): LedgerSummary {
  const lines = input.lines.filter((l) => l.currency === currency);
  const cos = input.changeOrders.filter((c) => c.currency === currency);
  const reqs = input.requests.filter((r) => r.currency === currency);
  const disb = input.disbursements.filter((d) => d.currency === currency);
  const baselineMinor = lines.reduce((s, l) => s + l.baselineMinor, 0);
  const approvedChangesMinor = cos.filter((c) => c.status === "APPROVED").reduce((s, c) => s + (c.approvedDeltaMinor ?? 0), 0);
  const s: LedgerSummary = {
    currency, baselineMinor, approvedChangesMinor, currentApprovedBudgetMinor: baselineMinor + approvedChangesMinor,
    committedMinor: lines.reduce((x, l) => x + l.committedMinor, 0),
    pendingChangeOrders: empty(), requested: empty(), authorisedUnpaid: empty(), disbursedPendingReconciliation: empty(), reconciledPaid: empty(), rejectedOrCancelled: empty(),
  };
  for (const c of cos) if (c.status === "PROPOSED" || c.status === "AWAITING_OWNER") add(s.pendingChangeOrders, c.proposedDeltaMinor);
  for (const r of reqs) {
    if (r.status === "DRAFT") continue;
    if (REQUESTED.includes(r.status)) add(s.requested, r.amountMinor);
    else if (r.status === "APPROVED_FOR_PAYMENT") add(s.authorisedUnpaid, r.amountMinor);
    else if (r.status === "REJECTED" || r.status === "CANCELLED") add(s.rejectedOrCancelled, r.amountMinor);
  }
  for (const d of disb) {
    const req = reqs.find((r) => r.id === d.paymentRequestId);
    if (!req) continue;
    if (d.reconciledAt && req.status === "RECONCILED") add(s.reconciledPaid, d.paidMinor);
    else add(s.disbursedPendingReconciliation, d.paidMinor);
  }
  return s;
}

/** A disbursement may only be recorded against an owner-authorised request, from evidence, for ≤ the authorised amount. */
export function validateDisbursement(req: PaymentRequest, d: Pick<Disbursement, "paidMinor" | "currency" | "sourceReference" | "evidenceDocId" | "paidAt">): string | null {
  if (req.status !== "APPROVED_FOR_PAYMENT") return "Only an owner-authorised request can have a disbursement recorded.";
  if (d.currency !== req.currency) return "Disbursement currency must match the authorised currency (no FX conversion is applied).";
  if (!Number.isInteger(d.paidMinor) || d.paidMinor <= 0) return "Amount must be a positive whole number of minor units.";
  if (d.paidMinor > req.amountMinor) return "Disbursement cannot exceed the authorised amount.";
  if (!d.sourceReference.trim()) return "A bank or payment-system reference is required.";
  if (!d.evidenceDocId.trim()) return "Payment evidence (bank statement line or processor event) is required.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d.paidAt)) return "Paid date is required (YYYY-MM-DD).";
  return null;
}

export function formatMinor(minor: number, currency: Currency): string {
  const v = (minor / 100).toLocaleString("en-GB", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${currency} ${v}`;
}
