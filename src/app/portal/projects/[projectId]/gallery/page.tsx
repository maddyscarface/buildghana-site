import { requireProject } from "@/lib/transparency/page";
import { snapshot } from "@/lib/transparency/views";
import { getStore } from "@/lib/transparency/service";
import { ProjectFrame } from "@/components/portal/ProjectFrame";
import { MediaThumb } from "@/components/portal/ReportCard";
import { Card, Empty, EvidenceBadge, fmtDate, PageTitle } from "@/components/portal/ui";

export const dynamic = "force-dynamic";

export default async function Gallery({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const ctx = await requireProject(projectId, "gallery.view");
  const v = await snapshot(ctx);
  const media = await getStore().list("media_assets", { projectId });
  const tz = ctx.user.timezone;
  return (
    <ProjectFrame ctx={ctx} active="/gallery">
      <PageTitle eyebrow="Evidence gallery" title="Photos and videos by phase">Grouped by phase and report, with before / during / after labels, server receipt time and file fingerprint. Images in this demo are synthetic diagrams, not site photographs. Links expire after a few minutes.</PageTitle>
      {v.milestones.map((m) => {
        const rs = v.reports.filter((r) => r.milestoneId === m.id && r.revisions.length);
        if (!rs.length) return null;
        return (
          <Card key={m.id} className="mb-5" title={`${m.phase}. ${m.title}`}>
            <div className="space-y-5">
              {rs.map((r) => {
                const rev = r.revisions.at(-1)!;
                const items = rev.mediaIds.map((id) => media.find((x) => x.id === id)).filter((x): x is NonNullable<typeof x> => !!x).sort((a, b) => ["before", "overview", "during", "detail", "after"].indexOf(a.stage) - ["before", "overview", "during", "detail", "after"].indexOf(b.stage));
                return (
                  <div key={r.id}>
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-sm"><a href={`/portal/projects/${projectId}/updates#${r.id}`} className="font-semibold text-forest underline">{rev.summary}</a><span className="text-muted">{fmtDate(rev.submittedAt, tz)}</span><EvidenceBadge state={v.ev(r)} /></div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{items.map((x) => <MediaThumb key={x.id} m={x} userId={ctx.user.id} />)}</div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
      {v.reports.length === 0 && <Empty>No published evidence yet.</Empty>}
      <p className="text-xs text-muted">Downloads of originals: not enabled in the demo (needs owner policy on download rights, watermarking and consent).</p>
    </ProjectFrame>
  );
}
