import Link from "next/link";
import { requireUser } from "@/lib/transparency/page";
import { roleLabel } from "@/lib/transparency/rbac";
import { getStore } from "@/lib/transparency/service";
import { staffNav } from "@/lib/transparency/nav";
import { reportStatusLabel } from "@/lib/transparency/states";
import { Card, Empty, fmtDate, PageTitle, Pill, PortalHeader } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function Drafts() {
  const user = await requireUser("/field/drafts");
  const s = getStore();
  const mine = (await s.list("site_reports", { authorId: user.id })).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const reviews = await s.list("report_reviews", {});
  const ms = await s.list("milestones", {});
  const open = mine.filter((r) => r.status === "DRAFT" || r.status === "NEEDS_CORRECTION");
  const sent = mine.filter((r) => !open.includes(r)).slice(0, 8);
  const row = (r: (typeof mine)[number], editable: boolean) => {
    const last = reviews.filter((v) => v.reportId === r.id).sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];
    return (
      <li key={r.id} className="py-3">
        <div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="font-semibold text-forest">{r.draft.summary || r.revisions.at(-1)?.summary || "Untitled draft"}</p><p className="text-xs text-muted">{ms.find((m) => m.id === r.milestoneId)?.title} · {r.revisions.length} revision(s) · updated {fmtDate(r.draft.updatedAt, user.timezone)}</p></div><Pill tone={r.status === "NEEDS_CORRECTION" ? "bad" : "neutral"}>{reportStatusLabel[r.status]}</Pill></div>
        {r.status === "NEEDS_CORRECTION" && last && <p className="mt-2 rounded-lg bg-[#fdf3f0] p-2 text-sm">Office note: {last.notes}</p>}
        {editable && <Link href={`/field/projects/${r.projectId}/report/new?report=${r.id}`} className="btn-forest mt-2 !min-h-11 w-full">{r.status === "NEEDS_CORRECTION" ? "Fix and resubmit" : "Continue draft"}</Link>}
      </li>
    );
  };
  return (
    <>
      <PortalHeader userName={user.name} roleLabel={user.staffRole ? roleLabel[user.staffRole] : undefined} area="Field reporting" nav={staffNav(user.staffRole, "drafts")} />
      <main className="mx-auto max-w-xl px-4 py-6">
        <PageTitle eyebrow="Field" title="Drafts & corrections" />
        <Card title="Needs your action">{open.length ? <ul className="divide-y divide-line">{open.map((r) => row(r, true))}</ul> : <Empty>Nothing waiting.</Empty>}</Card>
        <Card className="mt-4" title="Recently submitted">{sent.length ? <ul className="divide-y divide-line">{sent.map((r) => row(r, false))}</ul> : <Empty>No submitted reports yet.</Empty>}</Card>
      </main>
    </>
  );
}
