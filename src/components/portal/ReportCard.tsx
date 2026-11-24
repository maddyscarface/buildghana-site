import { signedMediaUrl } from "@/lib/transparency/auth";
import { independenceLabel, reportStatusLabel } from "@/lib/transparency/states";
import type { Comment, Dispute, EvidenceState, Inspection, MediaAsset, ReportReview, SiteReport, WorkPackage } from "@/lib/transparency/types";
import { EvidenceBadge, fmtDate, Pill } from "./ui";
import type { ReactNode } from "react";

export function MediaThumb({ m, userId }: { m: MediaAsset; userId: string }) {
  return (
    <figure className="min-w-0">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={signedMediaUrl(m.id, userId)} alt={`${m.caption} (${m.stage})${m.provenance === "synthetic_placeholder" ? " — synthetic placeholder, not a photograph" : ""}`} loading="lazy" decoding="async" className="aspect-[4/3] w-full rounded-lg bg-forest-2 object-cover" width={400} height={300} />
      <figcaption className="mt-1 text-[11.5px] leading-snug text-muted"><span className="font-semibold capitalize text-forest">{m.stage}</span> · {m.caption}<br />Received {fmtDate(m.serverReceivedAt, "Africa/Accra")} (server){m.deviceCapturedAt ? ` · device time ${fmtDate(m.deviceCapturedAt, "Africa/Accra")}` : ""}<br />{m.locationLabel}{m.sha256 ? ` · SHA-256 ${m.sha256.slice(0, 10)}…` : ""}</figcaption>
    </figure>
  );
}

export function ReportCard({ r, state, wps, media, name, tz, userId, reviews, inspections, disputes, comments, staff, children }: {
  r: SiteReport; state: EvidenceState | null; wps: WorkPackage[]; media: MediaAsset[]; name: (id: string) => string; tz: string; userId: string;
  reviews: ReportReview[]; inspections: Inspection[]; disputes: Dispute[]; comments: Comment[]; staff: boolean; children?: ReactNode;
}) {
  const rev = r.revisions.at(-1);
  const older = r.revisions.slice(0, -1);
  const ins = inspections.filter((i) => i.reportIds.includes(r.id));
  const dis = disputes.filter((d) => d.reportId === r.id);
  const byId = (ids: string[]) => ids.map((id) => media.find((m) => m.id === id)).filter((m): m is MediaAsset => !!m);
  return (
    <article id={r.id} className="scroll-mt-24 rounded-[18px] border border-line bg-white p-5 sm:p-6">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">{fmtDate(rev?.submittedAt, tz)} · {wps.find((w) => w.id === r.workPackageId)?.title}</p>
          <h3 className="mt-1 font-display text-[1.35rem] leading-snug text-forest">{rev?.summary ?? "Draft"}</h3>
          <p className="mt-1 text-xs text-muted">Reported by {name(r.authorId)} · revision {rev?.revision ?? 0}{older.length ? ` (${older.length} earlier revision${older.length > 1 ? "s" : ""} kept)` : ""}{staff ? ` · ${reportStatusLabel[r.status]}` : ""}</p>
        </div>
        <EvidenceBadge state={state} />
      </header>
      {rev && (
        <div className="mt-4 grid gap-4 text-[14.5px] leading-relaxed text-ink/85 md:grid-cols-2">
          <div><p className="font-semibold text-forest">Work reported</p><p>{rev.workReported}</p>
            {rev.quantities.length > 0 && <ul className="mt-2 text-sm">{rev.quantities.map((q, i) => <li key={i}>{q.item}: {q.qty} {q.unit} <span className="text-muted">— field reported, not independently measured</span></li>)}</ul>}
          </div>
          <div className="space-y-1.5 text-sm">
            {rev.issues && <p><span className="font-semibold text-forest">Issues:</span> {rev.issues}</p>}
            {rev.safetyIssues && <p><span className="font-semibold text-forest">Safety / quality:</span> {rev.safetyIssues}</p>}
            {rev.materials && <p><span className="font-semibold text-forest">Materials:</span> {rev.materials}</p>}
            {rev.weather && <p><span className="font-semibold text-forest">Weather / access:</span> {rev.weather}{rev.siteAccess ? ` · ${rev.siteAccess}` : ""}</p>}
            {rev.nextSteps && <p><span className="font-semibold text-forest">Next:</span> {rev.nextSteps}</p>}
            {rev.crewCount !== null && <p><span className="font-semibold text-forest">Crew on site:</span> {rev.crewCount} (count only, no identities)</p>}
          </div>
        </div>
      )}
      {rev && <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">{byId(rev.mediaIds).map((m) => <MediaThumb key={m.id} m={m} userId={userId} />)}</div>}
      {older.length > 0 && (
        <details className="mt-4 rounded-xl bg-ivory px-4 py-3 text-sm">
          <summary className="cursor-pointer font-semibold text-forest">Earlier revisions (preserved, not deleted)</summary>
          {older.map((o) => (
            <div key={o.revision} className="mt-3 border-t border-line pt-3">
              <p className="font-semibold">Revision {o.revision} · {fmtDate(o.submittedAt, tz)} — {o.summary}</p>
              {staff && reviews.filter((x) => x.revision === o.revision && x.decision === "request_correction").map((x) => <p key={x.id} className="text-[#8a2f1d]">Returned for correction: {x.notes}</p>)}
              <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-5">{byId(o.mediaIds).map((m) => <MediaThumb key={m.id} m={m} userId={userId} />)}</div>
            </div>
          ))}
        </details>
      )}
      {ins.map((i) => (
        <div key={i.id} className={`mt-4 rounded-xl px-4 py-3 text-sm ${i.result === "fail" ? "bg-[#f7e4df] text-[#5a1f13]" : "bg-[#e5efe8] text-[#173a28]"}`}>
          <p className="font-semibold">Inspection {i.result === "fail" ? "FAILED" : i.result === "pass" ? "passed" : "passed with conditions"} · {fmtDate(i.inspectedAt, tz)} · {name(i.inspectorId)}</p>
          <p className="mt-1"><Pill tone={i.independence === "independent_third_party" ? "good" : "warn"}>{independenceLabel[i.independence]}</Pill> <span className="ml-1">{i.credentialVerified ? "Credential confirmed by admin" : `Credential: ${i.credentialReference}`}</span></p>
          <p className="mt-1">Scope: {i.scope}. Method: {i.methods}. <strong>Limitations:</strong> {i.limitations}</p>
        </div>
      ))}
      {dis.map((d) => (
        <div key={d.id} className="mt-4 rounded-xl border border-[#d9a093] bg-[#fdf3f0] px-4 py-3 text-sm">
          <p className="font-semibold text-[#8a2f1d]">Dispute {d.status === "open" ? "open" : "resolved"} · raised by {name(d.raisedBy)} · {fmtDate(d.createdAt, tz)}</p>
          <p className="mt-1">{d.reason}</p>
          {d.resolution && <p className="mt-1"><strong>Resolution:</strong> {d.resolution} ({name(d.resolvedBy ?? "")})</p>}
        </div>
      ))}
      {comments.length > 0 && (
        <ul className="mt-4 space-y-2 border-t border-line pt-3 text-sm">{comments.map((c) => <li key={c.id}><span className="font-semibold text-forest">{name(c.authorId)}</span> <span className="text-xs text-muted">{fmtDate(c.createdAt, tz)}</span><br />{c.text}</li>)}</ul>
      )}
      {children}
    </article>
  );
}
