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
  const final = c.status === "delivered" && Boolean(c.report?.final);
  const pdf = await renderReportPdf(c, { final });
  if (!final) { c.report = { generatedAt: new Date().toISOString(), version: (c.report?.version ?? 0) + 1, final: false }; await saveCase(c); }
  await audit(id, "admin", final ? "report_viewed" : "draft_report_generated", { version: c.report?.version });
  return new Response(Buffer.from(pdf), { headers: { ...noStore, "Content-Type": "application/pdf", "Content-Disposition": `inline; filename="readiness-review-${id.slice(0, 8)}${final ? "" : "-draft"}.pdf"` } });
}
