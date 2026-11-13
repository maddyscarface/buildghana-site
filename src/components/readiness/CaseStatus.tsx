"use client";

import Link from "next/link";
import { Suspense, useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { documentInventory, docAvailabilityLabel, readiness, uploadPolicy } from "@/config/readiness";
import { FeeSummary, type PublicPrice } from "./FeeSummary";
import { clientStatusLabel, titleStatusLabel, titleBand, titleBandLabel, type CaseStatus as CS, type TitleStatus } from "@/lib/readiness/model";
import { pushDataLayer, track, trackOnce } from "@/lib/client/analytics";
import { Icon } from "@/components/ui/Icons";

type View = {
  id: string; caseNumber: string; status: CS; paymentStatus: string; titleStatus: TitleStatus; sandbox: boolean; createdAt: string; firstName: string; region: string; locality?: string;
  inventory: Record<string, string>; payment?: { provider: string; amountMinor?: number; currency?: string; paidAt?: string; sandbox?: boolean; refundedAt?: string };
  documents: { id: string; docKey: string; filename: string; size: number; uploadedAt: string }[]; reportAvailable: boolean;
  siteVisit: { scheduledFor?: string; completed: boolean };
  report?: { version: number; deliveredAt?: string; acknowledgedAt?: string };
};

const fmt = (minor: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(minor / 100);
const reviewStarted: CS[] = ["documents_under_review", "legal_title_check_pending", "legal_title_check_complete", "report_drafting", "internal_qa", "delivered", "follow_up"];
const milestones = (v: View) => [
  { label: "Intake submitted", done: true },
  { label: "Payment confirmed", done: v.paymentStatus === "paid" || v.paymentStatus === "refunded" },
  { label: v.siteVisit.scheduledFor ? `Site visit scheduled · ${new Date(v.siteVisit.scheduledFor).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}` : "Site visit scheduled", done: Boolean(v.siteVisit.scheduledFor), active: v.status === "scheduling" && !v.siteVisit.scheduledFor },
  { label: "Site visit completed", done: v.siteVisit.completed, active: Boolean(v.siteVisit.scheduledFor) && !v.siteVisit.completed },
  { label: "Documents under review", done: reviewStarted.slice(1).includes(v.status), active: v.status === "documents_under_review" || v.status === "needs_more_documents" },
  { label: "Counsel-led title check", done: ["verified_with_qualifications", "adverse_findings", "unable_to_determine", "not_commissioned"].includes(v.titleStatus), active: v.titleStatus === "in_progress" },
  { label: "Report delivered", done: v.status === "delivered" || v.status === "follow_up", active: v.status === "report_drafting" || v.status === "internal_qa" },
];

const dateFmt = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

function Inner({ caseId }: { caseId: string }) {
  const q = useSearchParams();
  const token = q.get("t") || "";
  const [v, setV] = useState<View | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState<string>("");
  const [msg, setMsg] = useState("");
  const [price, setPrice] = useState<PublicPrice | null>(null);

  const load = useCallback(async () => {
    const r = await fetch(`/api/readiness/case/${caseId}?t=${encodeURIComponent(token)}`, { cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { setErr(j.error || "We couldn't find this case."); return null; }
    setV(j.case); setPrice(j.price ?? null); return j.case as View;
  }, [caseId, token]);

  useEffect(() => {
    load().then((c) => {
      if (c && q.get("paid") === "1" && c.paymentStatus === "paid" && !c.sandbox && c.payment?.amountMinor) {
        if (trackOnce(`rr_purchase_${c.id}`, "payment_confirmed", { revenue_stream: "readiness_review", value: c.payment.amountMinor / 100, currency: c.payment.currency, transaction_id: c.id }, `rr_purchase_${c.id}`))
          pushDataLayer("review_purchase", { revenue_stream: "readiness_review", value: c.payment.amountMinor / 100, currency: c.payment.currency, transaction_id: c.id }, `rr_purchase_${c.id}`);
      }
    });
  }, [load, q]);

  const pay = async (provider: "stripe" | "paystack") => {
    setBusy(provider); setMsg("");
    const r = await fetch("/api/readiness/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case_id: caseId, token, provider }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { setMsg(j.error || "Checkout unavailable"); setBusy(""); return; }
    track("checkout_started", { revenue_stream: "readiness_review", provider, sandbox: j.sandbox }, `rr_checkout_${caseId}`);
    window.location.href = j.url;
  };

  const acknowledge = async () => {
    setBusy("ack");
    const r = await fetch(`/api/readiness/case/${caseId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, action: "acknowledge" }) });
    if (r.ok) { track("report_acknowledged", { revenue_stream: "readiness_review" }); await load(); }
    setBusy("");
  };

  const upload = async (docKey: string, file: File) => {
    setBusy(docKey); setMsg("");
    try {
      const r = await fetch(`/api/readiness/case/${caseId}/uploads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, doc_key: docKey, filename: file.name, content_type: file.type || "application/octet-stream", size: file.size }) });
      const j = await r.json();
      if (!r.ok || !j.ok) throw new Error(j.error || "Upload refused");
      const put = await fetch(j.upload.url, { method: "PUT", headers: j.upload.headers, body: file });
      if (!put.ok) throw new Error("Upload failed — please try again");
      const c = await fetch(`/api/readiness/case/${caseId}/uploads/${j.docId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
      const cj = await c.json();
      if (!c.ok || !cj.ok) throw new Error(cj.error || "We couldn't verify the file");
      track("document_upload", { doc_key: docKey, revenue_stream: "readiness_review" });
      setMsg(`${file.name} uploaded securely.`);
      await load();
    } catch (e) { setMsg((e as Error).message); }
    finally { setBusy(""); }
  };

  if (err) return (
    <div className="rounded-[22px] border border-line bg-white p-8 text-center">
      <h1 className="font-display text-3xl text-forest">Case not found</h1>
      <p className="mt-3 text-muted">{err} Check you've used the full link from your confirmation. {""}</p>
      <Link href={readiness.path} className="btn-forest mt-6">Back to the Readiness Review</Link>
    </div>
  );
  if (!v) return <div className="h-96 animate-pulse rounded-[22px] bg-white/70" aria-busy="true" />;

  const paid = v.paymentStatus === "paid";
  const closed = v.status === "cancelled" || v.status === "refunded";
  const accept = Object.keys(uploadPolicy.allowedTypes).join(",");
  return (
    <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr]">
      <div className="space-y-8">
        <div className="rounded-[26px] border border-line bg-white p-7 shadow-xl sm:p-10">
          {v.sandbox && <p className="mb-5 inline-flex rounded-full bg-gold/20 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-gold-2">Sandbox test case</p>}
          <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold-2">Case {v.caseNumber}</p>
          <h1 className="mt-2 font-display text-[2.2rem] leading-tight text-forest">{clientStatusLabel[v.status]}</h1>
          <p className="mt-2 text-muted">Hello {v.firstName} — this private page tracks your review for land in {v.locality ? `${v.locality}, ` : ""}{v.region}. Keep the link safe; anyone with it can view this page.</p>
          {q.get("paid") === "1" && paid && <p className="mt-5 rounded-xl bg-[#e7f0ea] px-4 py-3 text-[15px] text-forest"><Icon name="check" className="mr-1.5 inline h-4 w-4" />Payment confirmed{v.payment?.amountMinor && v.payment.currency ? ` — ${fmt(v.payment.amountMinor, v.payment.currency)}` : ""}. We'll contact you to schedule the site visit. You can upload documents below at any time.</p>}
          {q.get("cancelled") === "1" && !paid && <p className="mt-5 rounded-xl bg-gold/15 px-4 py-3 text-[15px] text-ink/85">Payment wasn't completed. You can try again whenever you're ready.</p>}

          {v.status === "needs_more_documents" && <p className="mt-5 rounded-xl bg-gold/15 px-4 py-3 text-[15px] text-ink/85"><Icon name="doc" className="mr-1.5 inline h-4 w-4 text-gold-2" />We need one or more documents to continue — please upload them below. You don't need to start over.</p>}
          {!paid && !closed && (<>
            <div className="mt-6"><FeeSummary price={price} compact /></div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <button onClick={() => pay("stripe")} disabled={!!busy} className="btn-forest disabled:opacity-60"><Icon name="card" className="h-4 w-4" /> Pay by card (USD)</button>
              <button onClick={() => pay("paystack")} disabled={!!busy} className="btn-ghost-dark disabled:opacity-60">Card / mobile money (GHS)</button>
            </div>
          </>)}
          {v.reportAvailable && v.report && (
            <div className="mt-8 rounded-2xl border border-gold/40 bg-ivory p-5">
              <p className="font-semibold text-forest">Your Readiness Report (version {v.report.version}){v.report.deliveredAt ? ` · delivered ${dateFmt(v.report.deliveredAt)}` : ""}</p>
              <div className="mt-4 flex flex-wrap items-center gap-3">
                <a href={`/api/readiness/case/${v.id}/report?t=${encodeURIComponent(token)}`} onClick={() => track("report_download", { revenue_stream: "readiness_review" })} className="btn-gold"><Icon name="doc" className="h-4 w-4" /> Download report (PDF)</a>
                {v.report.acknowledgedAt
                  ? <span className="text-sm text-forest"><Icon name="check" className="mr-1 inline h-4 w-4 text-gold-2" />Receipt confirmed {dateFmt(v.report.acknowledgedAt)}</span>
                  : <button onClick={acknowledge} disabled={!!busy} className="btn-ghost-dark !px-5 disabled:opacity-60">I've received my report</button>}
              </div>
            </div>
          )}
        </div>

        <div className="rounded-[26px] border border-line bg-white p-7 sm:p-10">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-[1.7rem] text-forest">Documents</h2>
              <p className="mt-1 text-sm text-muted">PDF, JPG, PNG, WEBP or HEIC. Each upload goes straight to private storage through a link that expires in minutes.</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-sm text-forest"><Icon name="lock" className="h-4 w-4 text-gold-2" /> Private & audited</span>
          </div>
          <p className="mt-5 rounded-xl bg-ivory px-4 py-3 text-sm text-ink/80">Uploading a document doesn't verify title — only Ghanaian counsel can do that. Missing something? Upload it whenever you have it.</p>
          <ul className="mt-6 divide-y divide-line rounded-2xl border border-line">
            {documentInventory.map((d) => {
              const files = v.documents.filter((x) => x.docKey === d.key);
              return (
                <li key={d.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0">
                    <span className="block font-semibold text-forest">{d.label} {d.title && <span className="text-gold-2" title="Needed for title verification">✦</span>}</span>
                    <span className="block text-[13px] text-muted">{files.length ? files.map((f) => f.filename).join(", ") : `You marked this: ${docAvailabilityLabel[v.inventory[d.key] as keyof typeof docAvailabilityLabel]?.toLowerCase() ?? "—"}`}</span>
                  </span>
                  <label className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${!closed ? "border-forest/25 text-forest hover:bg-forest hover:text-ivory" : "pointer-events-none border-line text-muted"}`}>
                    {files.length ? <Icon name="check" className="h-4 w-4 text-gold-2" /> : <Icon name="upload" className="h-4 w-4" />}
                    {busy === d.key ? "Uploading…" : files.length ? "Add another" : "Upload"}
                    <input type="file" className="sr-only" accept={accept} disabled={closed || !!busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(d.key, f); e.currentTarget.value = ""; }} />
                  </label>
                </li>
              );
            })}
          </ul>
          {msg && <p role="status" className="mt-4 text-sm font-medium text-forest">{msg}</p>}
        </div>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
        <div className="rounded-[22px] bg-forest p-7 text-ivory">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">Progress</p>
          <ol className="mt-5 space-y-4">
            {milestones(v).map((m) => (
              <li key={m.label} className="flex items-center gap-3">
                <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${m.done ? "bg-gold text-forest" : m.active ? "border-2 border-gold" : "border border-ivory/25"}`}>{m.done && <Icon name="check" className="h-4 w-4" />}</span>
                <span className={m.done ? "text-ivory" : "text-ivory/60"}>{m.label}</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-[22px] border border-line bg-white p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-2">Land & title (counsel)</p>
          <p className="mt-2 font-display text-xl text-forest">{titleBandLabel[titleBand(v.titleStatus)]}</p>
          <p className="mt-1 text-sm text-muted">{titleStatusLabel[v.titleStatus]}</p>
          <p className="mt-2 text-[13.5px] leading-relaxed text-muted">Carried out by independent Ghana-qualified counsel. Only counsel can verify title — uploads alone never do. Counsel's findings are reported in their own section, with their name and reference.</p>
        </div>
        {v.payment && (
          <div className="rounded-[22px] border border-line bg-white p-6 text-sm">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-2">Payment</p>
            <p className="mt-2 text-forest">{v.paymentStatus === "paid" ? "Paid" : v.paymentStatus === "pending" ? "Started" : v.paymentStatus === "refunded" ? "Refunded" : v.paymentStatus}{v.payment.amountMinor && v.payment.currency ? ` · ${fmt(v.payment.amountMinor, v.payment.currency)}` : ""}</p>
            <p className="mt-1 text-muted">{v.payment.provider === "mock" ? "Sandbox (no money moved)" : v.payment.provider === "stripe" ? "Stripe" : "Paystack"}</p>
          </div>
        )}
      </aside>
    </div>
  );
}

export function CaseStatus({ caseId }: { caseId: string }) {
  return (
    <section className="bg-ivory-2/60 py-12 sm:py-16">
      <div className="container-x"><Suspense fallback={null}><Inner caseId={caseId} /></Suspense></div>
    </section>
  );
}
