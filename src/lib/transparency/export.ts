import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { can } from "./rbac";
import { getStore, ledgerFor, visibleReports, type Ctx } from "./service";
import { evidenceLabel, evidenceState, independenceLabel, milestoneStatusLabel, varianceDays } from "./states";
import { formatMinor } from "./ledger";
import { DEMO_AMOUNT_NOTE, DEMO_LABEL } from "./seed";

/** Sanitised progress export: published evidence only, no media files, no document links, no personal contact details. */
export async function exportPdf(ctx: Ctx): Promise<Uint8Array> {
  const s = getStore();
  const [milestones, inspections, disputes] = await Promise.all([s.list("milestones", { projectId: ctx.project.id }), s.list("inspections", { projectId: ctx.project.id }), s.list("disputes", { projectId: ctx.project.id })]);
  const reports = (await visibleReports(ctx)).filter((r) => ["PUBLISHED", "VERIFIED", "DISPUTED"].includes(r.status)).sort((a, b) => (a.revisions.at(-1)?.submittedAt ?? "").localeCompare(b.revisions.at(-1)?.submittedAt ?? ""));
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica), bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595, 842]); let y = 800;
  const line = (t: string, o: { b?: boolean; size?: number; color?: [number, number, number] } = {}) => {
    const size = o.size ?? 10;
    const words = t.replace(/[^\x20-\x7E]/g, "-").split(" "); let cur = "";
    const flush = () => { if (y < 50) { page = pdf.addPage([595, 842]); y = 800; } page.drawText(cur, { x: 48, y, size, font: o.b ? bold : font, color: rgb(...(o.color ?? [0.07, 0.16, 0.12])) }); y -= size + 5; cur = ""; };
    for (const w of words) { if ((o.b ? bold : font).widthOfTextAtSize(`${cur} ${w}`, size) > 500) flush(); cur = cur ? `${cur} ${w}` : w; }
    if (cur) flush();
  };
  line(`${ctx.project.name} (${ctx.project.code}) - progress record`, { b: true, size: 16 });
  line(DEMO_LABEL.toUpperCase(), { b: true, color: [0.49, 0.36, 0.15] });
  line(`Location: ${ctx.project.locationPublic}. Generated ${new Date().toISOString().slice(0, 16).replace("T", " ")} UTC.`);
  line("Photos and videos document what was reported at a time. They are not engineering certification. Forecasts are not commitments.");
  y -= 8; line("Schedule (baseline vs latest forecast)", { b: true, size: 12 });
  for (const m of milestones.sort((a, b) => a.phase - b.phase)) line(`${m.phase}. ${m.title} - ${milestoneStatusLabel[m.status]}. Baseline end ${m.baselineEnd}; forecast end ${m.forecastEnd} (${varianceDays(m.baselineEnd, m.forecastEnd)} days).`);
  y -= 8; line("Published site reports", { b: true, size: 12 });
  for (const r of reports) {
    const rev = r.revisions.at(-1)!; const st = evidenceState(r, { inspections, disputes });
    line(`${rev.submittedAt.slice(0, 10)} - ${rev.summary} - ${st ? evidenceLabel[st].label : ""} (revision ${rev.revision}, ${rev.mediaIds.length} media)`);
  }
  y -= 8; line("Inspections", { b: true, size: 12 });
  for (const i of inspections) line(`${i.inspectedAt.slice(0, 10)} - ${i.result.toUpperCase()} - ${independenceLabel[i.independence]}. Scope: ${i.scope}. Limitations: ${i.limitations}`);
  if (can(ctx.grant, "budget.view", ctx.project)) {
    const { summary } = await ledgerFor(ctx);
    y -= 8; line("Financial visibility (separate buckets, never summed)", { b: true, size: 12 });
    line(DEMO_AMOUNT_NOTE);
    line(`Approved budget ${formatMinor(summary.currentApprovedBudgetMinor, "GHS")} (baseline ${formatMinor(summary.baselineMinor, "GHS")} + approved changes ${formatMinor(summary.approvedChangesMinor, "GHS")}).`);
    line(`Requested, not approved: ${formatMinor(summary.requested.minor, "GHS")}. Authorised, not paid: ${formatMinor(summary.authorisedUnpaid.minor, "GHS")}. Disbursed, awaiting reconciliation: ${formatMinor(summary.disbursedPendingReconciliation.minor, "GHS")}. Paid (reconciled): ${formatMinor(summary.reconciledPaid.minor, "GHS")}.`);
  } else line("Financial information is not included at your access level.");
  return pdf.save();
}
