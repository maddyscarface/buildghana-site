import { clientCase, json, noStore } from "@/lib/readiness/http";
import { renderReportPdf } from "@/lib/readiness/report";
import { audit } from "@/lib/readiness/store";

export const runtime = "nodejs";

/** Client download of the FINAL report only (after delivery). */
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await clientCase(id, new URL(req.url).searchParams.get("t"));
  if (!c) return json({ ok: false, error: "Case not found" }, 404);
  const last = c.reports?.at(-1);
  if (!["delivered", "follow_up"].includes(c.status) || !last?.final) return json({ ok: false, error: "Your report isn't ready yet." }, 409);
  const pdf = await renderReportPdf(c, { final: true, version: last.version });
  await audit(c.id, "client", "report_downloaded", { version: last.version });
  return new Response(Buffer.from(pdf), { headers: { ...noStore, "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="${c.caseNumber}-v${last.version}.pdf"` } });
}
