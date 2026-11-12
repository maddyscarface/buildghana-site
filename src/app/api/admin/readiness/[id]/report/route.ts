import { requireAdmin } from "@/lib/readiness/admin-http";
import { json, noStore } from "@/lib/readiness/http";
import { audit, getCase, saveCase } from "@/lib/readiness/store";
import { renderReportPdf } from "@/lib/readiness/report";

export const runtime = "nodejs";

/** Admin preview of the report. Draft (watermarked) unless the case has been delivered. */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const deny = await requireAdmin(req); if (deny) return deny;
  const { id } = await params;
  const c = await getCase(id);
  if (!c) return json({ ok: false, error: "Not found" }, 404);
  const last = c.reports.at(-1);
  const final = ["delivered", "follow_up"].includes(c.status) && Boolean(last?.final);
  const version = final ? last!.version : (last?.version ?? 0) + 1;
  const pdf = await renderReportPdf(c, { final, version });
  if (!final) { c.reports.push({ version, generatedAt: new Date().toISOString(), final: false, by: "admin" }); await saveCase(c); }
  await audit(id, "admin", final ? "report_viewed" : "draft_report_generated", { version });
  return new Response(Buffer.from(pdf), { headers: { ...noStore, "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="${c.caseNumber}-v${version}${final ? "" : "-draft"}.pdf"` } });
}
