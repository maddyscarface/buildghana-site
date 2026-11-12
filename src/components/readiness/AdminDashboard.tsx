"use client";

import { useCallback, useEffect, useState } from "react";
import {
  clientStatusLabel, titleStatusLabel, transitions, titleTransitions, siteChecks, permitStatuses, permitStatusLabel, recommendations, recommendationLabel,
  counselOutcomes, siteVisitDocumented, type ReadinessCase, type CaseStatus, type TitleStatus,
} from "@/lib/readiness/model";
import {
  documentInventory, docAvailabilityLabel, addOnServices, intendedUses, landControllers, acquiredStatuses, siteAccess, finishLevels, budgetBands,
  fundsStatuses, designStatuses, contactMethods, areaUnits, uploadPolicy,
} from "@/config/readiness";
import { labelFor } from "@/lib/lead/options";
import { Logo } from "@/components/ui/Icons";

type Row = {
  id: string; caseNumber: string; createdAt: string; status: CaseStatus; paymentStatus: string; titleStatus: TitleStatus; sandbox: boolean; name: string; email: string;
  region: string; docs: number; amountMinor?: number; currency?: string; source: string; reviewer?: string; dueDate?: string; siteVisit: string;
};
type Revenue = { totals: Record<string, { live: number; sandbox: number; count: number }>; paidCasesBySource: Record<string, number> };
type Audit = { at: string; actor: string; action: string; detail?: Record<string, unknown> };
type Settings = {
  usdMinor: number | null; ghsMinor: number | null; turnaroundDays: number | null;
  addOns: Record<string, { usdMinor: number | null; ghsMinor: number | null }>;
  fx: { usdToGhs: number; source: string; date: string } | null; coverage: string | null; refundPolicy: string | null;
  costAssumptions: { version: string; notes: string; updatedAt?: string; ghsPerSqm: Record<string, [number, number, number]> } | null;
};
const fmt = (m: number, c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(m / 100);
const n = (v: number) => v.toLocaleString("en-US");
const TABS = ["overview", "site", "title", "permits", "cost", "report", "files"] as const;
const TAB_LABEL: Record<(typeof TABS)[number], string> = { overview: "Overview", site: "Site visit", title: "Title (counsel)", permits: "Permits", cost: "Cost range", report: "Recommendation & report", files: "Files & audit" };
const fd = (e: React.FormEvent<HTMLFormElement>) => { e.preventDefault(); return Object.fromEntries(new FormData(e.currentTarget).entries()) as Record<string, string>; };
const small = "field-input !py-2 text-sm";
const chip = "rounded-full border border-line px-3 py-1 text-xs hover:border-forest";
const H = ({ children }: { children: React.ReactNode }) => <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">{children}</p>;

export function AdminDashboard() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [rev, setRev] = useState<Revenue | null>(null);
  const [sel, setSel] = useState<{ case: ReadinessCase; audit: Audit[]; clientLink: string } | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("overview");
  const [settings, setSettings] = useState<Settings | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [integrations, setIntegrations] = useState<Record<string, unknown>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const r = await fetch(path, { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { setAuthed(false); try { sessionStorage.removeItem("bga_admin"); } catch {} }
    return { ok: r.ok && j.ok !== false, j };
  }, [token]);

  const refresh = useCallback(async () => {
    const [l, s] = await Promise.all([api("/api/admin/readiness"), api("/api/admin/settings")]);
    if (!l.ok) { setMsg(l.j.error || "Unauthorised"); return false; }
    setRows(l.j.cases); setRev(l.j.revenue); setAuthed(true);
    if (s.ok) { setSettings(s.j.price); setIntegrations(s.j.integrations); }
    return true;
  }, [api]);

  useEffect(() => { try { const t = sessionStorage.getItem("bga_admin"); if (t) setToken(t); } catch {} }, []);
  useEffect(() => { if (token && !authed) refresh(); }, [token, authed, refresh]);
  useEffect(() => { if (authed) { const id = new URLSearchParams(window.location.search).get("case"); if (id) open(id); } }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = async (id: string) => { const r = await api(`/api/admin/readiness/${id}`); if (r.ok) setSel(r.j); };
  const act = async (body: Record<string, unknown>, ok = "Saved") => {
    if (!sel) return false;
    setMsg(""); setBusy(true);
    const r = await api(`/api/admin/readiness/${sel.case.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setMsg(r.ok ? ok : `⚠ ${r.j.error || "Failed"}`);
    await open(sel.case.id); await refresh(); setBusy(false);
    return r.ok;
  };
  const saveSettings = async (patch: Partial<Settings>) => {
    const r = await api("/api/admin/settings", { method: "PUT", body: JSON.stringify(patch) });
    setMsg(r.ok ? "Settings saved" : `⚠ ${r.j.error || "Failed"}`); if (r.ok) setSettings(r.j.price);
  };
  const download = async (docId: string) => {
    if (!sel) return;
    const r = await api(`/api/admin/readiness/${sel.case.id}/files/${docId}`);
    if (r.ok) window.open(r.j.url, "_blank", "noopener"); else setMsg(`⚠ ${r.j.error || "Download failed"}`);
  };
  const report = async () => {
    if (!sel) return;
    const r = await fetch(`/api/admin/readiness/${sel.case.id}/report`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { setMsg("⚠ Report failed"); return; }
    const url = URL.createObjectURL(await r.blob()); window.open(url, "_blank");
    await open(sel.case.id);
  };
  const adminUpload = async (docKey: string, file: File) => {
    if (!sel) return;
    setBusy(true); setMsg("");
    try {
      const r = await api(`/api/admin/readiness/${sel.case.id}/uploads`, { method: "POST", body: JSON.stringify({ doc_key: docKey, filename: file.name, content_type: file.type || "application/octet-stream", size: file.size }) });
      if (!r.ok) throw new Error(r.j.error || "Upload refused");
      const put = await fetch(r.j.upload.url, { method: "PUT", headers: r.j.upload.headers, body: file });
      if (!put.ok) throw new Error("Upload failed");
      const c = await api(`/api/admin/readiness/${sel.case.id}/uploads/${r.j.docId}`, { method: "POST", body: "{}" });
      if (!c.ok) throw new Error(c.j.error || "Verification failed");
      setMsg(`${file.name} uploaded`);
      await open(sel.case.id);
    } catch (e) { setMsg(`⚠ ${(e as Error).message}`); } finally { setBusy(false); }
  };

  if (!authed) {
    return (
      <main className="container-x flex min-h-screen max-w-md flex-col justify-center py-20">
        <Logo />
        <h1 className="mt-8 font-display text-3xl text-forest">Readiness Review admin</h1>
        <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); try { sessionStorage.setItem("bga_admin", token); } catch {} refresh(); }}>
          <label htmlFor="tok" className="field-label">Admin token</label>
          <input id="tok" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} className="field-input" />
          <button className="btn-forest w-full">Sign in</button>
          {msg && <p className="field-error">{msg}</p>}
        </form>
      </main>
    );
  }

  const c = sel?.case;
  const photos = c?.documents.filter((d) => d.docKey === "site_photo" && d.status === "uploaded") ?? [];
  const lastReport = c?.reports.at(-1);
  return (
    <main className="container-wide py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><Logo /><span className="rounded-full bg-forest px-3 py-1 text-xs font-semibold text-gold">Readiness Review operations</span></div>
        <div className="flex items-center gap-3 text-sm">
          <button onClick={() => setShowSettings((v) => !v)} className="btn-ghost-dark !min-h-10 !py-2">{showSettings ? "Close settings" : "Fees & settings"}</button>
          <button onClick={refresh} className="btn-ghost-dark !min-h-10 !py-2">Refresh</button>
          <button onClick={() => { try { sessionStorage.removeItem("bga_admin"); } catch {} setAuthed(false); setToken(""); }} className="text-muted underline">Sign out</button>
        </div>
      </header>
      {msg && <p role="status" className={`mt-4 rounded-lg px-4 py-2 text-sm ${msg.startsWith("⚠") ? "bg-[#fbeee9] text-[#8a3423]" : "bg-white text-forest"}`}>{msg}</p>}

      {showSettings && settings && <SettingsPanel s={settings} save={saveSettings} />}

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-forest p-5 text-ivory"><p className="text-xs uppercase tracking-wider text-gold">Cases</p><p className="mt-1 font-display text-3xl">{rows.length}</p><p className="text-xs text-ivory/60">{rows.filter((r) => r.paymentStatus === "paid").length} paid · {rows.filter((r) => r.status === "needs_more_documents").length} need documents</p></div>
        <div className="rounded-2xl bg-white p-5 md:col-span-2">
          <H>Readiness Review revenue (separate stream, net of refunds)</H>
          <div className="mt-2 flex flex-wrap gap-6">
            {Object.entries(rev?.totals ?? {}).map(([cur, t]) => <div key={cur}><p className="font-display text-2xl text-forest">{fmt(t.live, cur)}</p><p className="text-xs text-muted">live · {fmt(t.sandbox, cur)} sandbox · {t.count} entries</p></div>)}
            {!Object.keys(rev?.totals ?? {}).length && <p className="text-sm text-muted">No payments yet.</p>}
          </div>
          <p className="mt-2 text-xs text-muted">Paid cases by source: {Object.entries(rev?.paidCasesBySource ?? {}).filter(([k]) => k !== "refund").map(([k, v]) => `${k} ${v}`).join(" · ") || "—"}</p>
        </div>
        <div className="rounded-2xl bg-white p-5">
          <H>Base review fee</H>
          <p className="mt-2 font-display text-xl text-forest">{[settings?.usdMinor ? fmt(settings.usdMinor, "USD") : null, settings?.ghsMinor ? fmt(settings.ghsMinor, "GHS") : null].filter(Boolean).join(" · ") || "Not set"}</p>
          <p className="text-xs text-muted">FX: {settings?.fx ? `1 USD = ${settings.fx.usdToGhs} GHS (${settings.fx.source}, ${settings.fx.date})` : "not set"} · Cost assumptions: {settings?.costAssumptions?.version ?? "not set"}</p>
        </div>
      </section>
      <p className="mt-3 text-xs text-muted">Integrations: {Object.entries(integrations).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</p>

      <section className="mt-8 grid gap-6 2xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.3fr)]">
        <div className="self-start overflow-x-auto rounded-2xl bg-white">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-ivory text-xs uppercase tracking-wider text-muted"><tr><th className="p-3">Case</th><th className="p-3">Status</th><th className="p-3">Site</th><th className="p-3">Title</th><th className="p-3">Reviewer · due</th><th className="p-3">Paid</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => { open(r.id); setTab("overview"); }} className={`cursor-pointer border-t border-line hover:bg-ivory ${sel?.case.id === r.id ? "bg-ivory" : ""}`}>
                  <td className="p-3"><p className="font-semibold text-forest">{r.caseNumber} {r.sandbox && <span className="ml-1 rounded bg-gold/20 px-1.5 text-[10px] text-gold-2">SANDBOX</span>}</p><p className="text-xs text-muted">{r.name} · {r.region} · {r.source}</p></td>
                  <td className="p-3">{clientStatusLabel[r.status]}</td>
                  <td className="p-3 text-xs">{r.siteVisit}</td>
                  <td className="p-3 text-xs">{titleStatusLabel[r.titleStatus]}</td>
                  <td className="p-3 text-xs">{r.reviewer || "—"}{r.dueDate ? ` · ${r.dueDate}` : ""}</td>
                  <td className="p-3">{r.paymentStatus === "paid" && r.amountMinor && r.currency ? fmt(r.amountMinor, r.currency) : r.paymentStatus}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="p-6 text-center text-muted">No cases yet.</td></tr>}
            </tbody>
          </table>
        </div>

        {c ? (
          <div className="min-w-0 space-y-5 rounded-2xl bg-white p-6" data-testid="case-detail">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-display text-2xl text-forest">{c.caseNumber} · {c.contact.firstName} {c.contact.lastName}</h2>
                <p className="text-sm text-muted">{c.contact.email} · {c.contact.phone} · prefers {labelFor(contactMethods, c.contact.preferredContact)} · {c.contact.timeZone}</p>
                <p className="mt-1 text-sm"><span className="font-semibold text-forest">{clientStatusLabel[c.status]}</span> · title: {titleStatusLabel[c.titleStatus]} · payment: {c.paymentStatus}{c.sandbox ? " (sandbox)" : ""}</p>
              </div>
              <div className="flex gap-2"><button onClick={report} className="btn-forest !min-h-10 !py-2 text-sm">{lastReport?.final ? "View final report" : "Generate draft PDF"}</button><a href={sel!.clientLink} target="_blank" className="btn-ghost-dark !min-h-10 !py-2 text-sm">Client page</a></div>
            </div>

            <div className="flex flex-wrap gap-2 border-b border-line pb-3" role="tablist">
              {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={`rounded-full px-3.5 py-1.5 text-sm ${tab === t ? "bg-forest text-ivory" : "bg-ivory text-forest hover:bg-ivory-2"}`}>{TAB_LABEL[t]}</button>)}
            </div>

            {tab === "overview" && (
              <div className="space-y-5">
                <div className="rounded-xl border border-line p-4">
                  <H>Move case</H>
                  <div className="mt-3 flex flex-wrap gap-2">{transitions[c.status].filter((t) => t !== "delivered").map((t) => <button key={t} disabled={busy} onClick={() => act({ type: "status", to: t, note: t === "needs_more_documents" ? "requested" : undefined })} className={chip}>→ {clientStatusLabel[t]}</button>)}</div>
                  <p className="mt-2 text-xs text-muted">Gates: site visit complete needs a documented visit · title complete needs a counsel outcome · QA/delivery need site visit, title outcome and an approved recommendation. Moving to “needs more documents” sends the client a link-only email.</p>
                </div>
                <form className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-4" onSubmit={(e) => act({ type: "ops", ...fd(e) })}>
                  <div className="md:col-span-4"><H>Assignment</H></div>
                  <input name="reviewer" defaultValue={c.ops.reviewer} placeholder="Assigned reviewer" className={small} />
                  <input name="dueDate" type="date" defaultValue={c.ops.dueDate} className={small} aria-label="Due date" />
                  <input name="jurisdiction" defaultValue={c.ops.jurisdiction} placeholder="Jurisdiction (assembly)" className={small} />
                  <button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">Save</button>
                </form>
                <div className="rounded-xl border border-line p-4">
                  <H>Checklist & tasks</H>
                  <ul className="mt-2 space-y-1 text-sm">
                    {c.ops.tasks.map((t) => <li key={t.id}><label className="flex items-center gap-2"><input type="checkbox" checked={t.done} onChange={() => act({ type: "task_toggle", id: t.id })} /> <span className={t.done ? "text-muted line-through" : ""}>{t.text}</span>{t.due && <span className="text-xs text-muted">due {t.due}</span>}</label></li>)}
                    {!c.ops.tasks.length && <li className="text-muted">No tasks yet.</li>}
                  </ul>
                  <form className="mt-2 flex gap-2" onSubmit={(e) => { const v = fd(e); (e.currentTarget as HTMLFormElement).reset(); act({ type: "task_add", text: v.text, due: v.due || undefined }); }}>
                    <input name="text" required placeholder="Add a task" className={small} /><input name="due" type="date" className={`${small} !w-40`} aria-label="Task due" /><button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">Add</button>
                  </form>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-line p-4 text-sm">
                    <H>Parcel (as reported)</H>
                    <dl className="mt-2 space-y-0.5">
                      <div>{c.parcel.locality}, {c.parcel.district}, {c.parcel.region}</div>
                      <div>GPS: {c.parcel.gps || "—"} {c.parcel.mapPin && <a className="text-forest underline" target="_blank" rel="noopener" href={`https://www.google.com/maps?q=${c.parcel.mapPin.lat},${c.parcel.mapPin.lng}`}>map pin</a>}</div>
                      <div>Plot {c.parcel.plotNumber || "—"} · {c.parcel.area || "—"} {labelFor(areaUnits, c.parcel.areaUnit)}</div>
                      <div>{labelFor(siteAccess, c.parcel.access)} · controller: {labelFor(landControllers, c.parcel.controller)} · {labelFor(acquiredStatuses, c.parcel.acquired)}</div>
                      <div>Site contact: {c.parcel.siteContact ? `${c.parcel.siteContact.name ?? ""} ${c.parcel.siteContact.phone ?? ""} (${c.parcel.siteContact.relationship ?? "—"})${c.consents.siteContact ? " · consent ✓" : ""}` : "—"}</div>
                    </dl>
                  </div>
                  <div className="rounded-xl border border-line p-4 text-sm">
                    <H>Project & budget</H>
                    <dl className="mt-2 space-y-0.5">
                      <div>{labelFor(intendedUses, c.project.use)}{c.project.useOther ? ` — ${c.project.useOther}` : ""} · {labelFor(finishLevels, c.project.finish)}</div>
                      <div>Floor area {c.project.floorArea || "—"} · units {c.project.units || "—"} · floors {c.project.floors || "—"}</div>
                      <div>{labelFor(budgetBands, c.project.budgetBand)} {c.project.budgetCurrency}{c.project.landIncluded ? " incl. land" : ""} · {labelFor(fundsStatuses, c.project.funds)}</div>
                      <div>Start {c.project.targetStart || "—"} · {labelFor(designStatuses, c.project.designStatus)}</div>
                      <div>Add-ons requested: {c.project.addOns.map((a) => labelFor(addOnServices, a)).join(", ") || "none"}</div>
                      {c.project.description && <div className="text-muted">“{c.project.description}”</div>}
                      {c.project.concerns && <div className="text-muted">Concerns: “{c.project.concerns}”</div>}
                    </dl>
                  </div>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-line p-4 text-sm">
                    <H>Engagement / CRM</H>
                    <p className="mt-1">Stage: {c.engagement ?? "review only"} · CRM: {c.crm?.lastResult ?? "—"}</p>
                    <div className="mt-2 flex flex-wrap gap-2">{(["pm_proposal", "won", "lost"] as const).map((s) => <button key={s} onClick={() => act({ type: "engagement", stage: s })} className={chip}>{s === "pm_proposal" ? "PM proposal sent" : s === "won" ? "Project won" : "Lost"}</button>)}</div>
                  </div>
                  <form className="rounded-xl border border-line p-4 text-sm" onSubmit={(e) => { const v = fd(e); if (confirm("Mark this case refunded? Do this only after the refund is processed in Stripe/Paystack.")) act({ type: "refund_mark", note: v.note }, "Marked refunded"); }}>
                    <H>Refund</H>
                    <p className="mt-1 text-xs text-muted">Process the refund in the processor dashboard first (webhooks also mark it automatically), then record it here.</p>
                    <div className="mt-2 flex gap-2"><input name="note" placeholder="Processor refund ref / reason" className={small} disabled={c.paymentStatus !== "paid"} /><button disabled={c.paymentStatus !== "paid"} className="btn-ghost-dark !min-h-9 !py-1.5 text-xs disabled:opacity-50">Mark refunded</button></div>
                    {c.payment?.refundedAt && <p className="mt-1 text-xs">Refunded {new Date(c.payment.refundedAt).toLocaleString()} — {c.payment.refundNote}</p>}
                  </form>
                </div>
              </div>
            )}

            {tab === "site" && (
              <div className="space-y-5">
                <form className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-3" onSubmit={(e) => { const v = fd(e); act({ type: "site_schedule", scheduledFor: v.scheduledFor ? new Date(v.scheduledFor).toISOString() : "", inspector: v.inspector }, "Site visit scheduled"); }}>
                  <div className="md:col-span-3"><H>Schedule</H><p className="text-sm">{c.siteVisit.scheduledFor ? `Scheduled ${new Date(c.siteVisit.scheduledFor).toLocaleString()} · ${c.siteVisit.inspector}` : "Not scheduled"}</p></div>
                  <input name="scheduledFor" type="datetime-local" required className={small} aria-label="Visit date and time" />
                  <input name="inspector" required placeholder="Inspector" defaultValue={c.siteVisit.inspector} className={small} />
                  <button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">{c.siteVisit.scheduledFor ? "Reschedule" : "Schedule"}</button>
                </form>
                <form className="space-y-3 rounded-xl border border-line p-4" onSubmit={(e) => { const v = fd(e); const checklist = Object.fromEntries(siteChecks.map((k) => [k.key, v[`c_${k.key}`] || ""])); act({ type: "site_record", completedAt: v.completedAt ? new Date(v.completedAt).toISOString() : "", completedBy: v.completedBy, checklist }, "Visit recorded"); }}>
                  <H>Inspection record {siteVisitDocumented(c.siteVisit) ? `— documented ${new Date(c.siteVisit.completedAt!).toLocaleDateString()} by ${c.siteVisit.completedBy}` : "— not yet documented"}</H>
                  <p className="text-xs text-muted">Record only a visit that actually happened. At least five checklist items are required; the date can't be in the future.</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <input name="completedAt" type="datetime-local" className={small} aria-label="Visit completed at" />
                    <input name="completedBy" placeholder="Carried out by" defaultValue={c.siteVisit.completedBy} className={small} />
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {siteChecks.map((k) => <label key={k.key} className="text-xs font-semibold text-forest">{k.label}<textarea name={`c_${k.key}`} rows={2} defaultValue={c.siteVisit.checklist[k.key]} className={`${small} mt-1 font-normal`} /></label>)}
                  </div>
                  <button className="btn-forest !min-h-9 !py-1.5 text-sm">Save inspection record</button>
                </form>
                <div className="rounded-xl border border-line p-4">
                  <H>Site photos ({photos.length})</H>
                  <ul className="mt-2 space-y-1 text-sm">{photos.map((p) => <li key={p.id} className="flex justify-between"><span className="truncate">{p.filename}</span><button onClick={() => download(p.id)} className="text-forest underline">Open</button></li>)}</ul>
                  <label className="btn-ghost-dark mt-3 !min-h-9 cursor-pointer !py-1.5 text-xs">Upload photo<input type="file" accept="image/jpeg,image/png,image/webp,image/heic" className="sr-only" disabled={busy} onChange={(e) => { const f = e.target.files?.[0]; if (f) adminUpload("site_photo", f); e.currentTarget.value = ""; }} /></label>
                </div>
              </div>
            )}

            {tab === "title" && <TitlePanel c={c} act={act} busy={busy} />}

            {tab === "permits" && (
              <div className="space-y-4">
                <p className="text-sm text-muted">Jurisdiction: {c.ops.jurisdiction || "set on Overview"}. Each item needs an authority; add the source link and the date you checked it.</p>
                {c.permits.map((p) => <PermitRow key={p.id} p={p} act={act} />)}
                <PermitRow act={act} />
              </div>
            )}

            {tab === "cost" && (
              <div className="space-y-4">
                {c.cost && (
                  <div className="rounded-xl bg-ivory p-4 text-sm">
                    <H>Current range (assumptions {c.cost.assumptionsVersion}, {c.cost.confidence} confidence)</H>
                    <p className="mt-1">GHS {n(c.cost.ghs.low)} / {n(c.cost.ghs.base)} / {n(c.cost.ghs.high)} · ≈ USD {n(c.cost.usd.low)} / {n(c.cost.usd.base)} / {n(c.cost.usd.high)}</p>
                    <p className="text-xs text-muted">1 USD = {c.cost.fxRate} GHS ({c.cost.fxSource}, {c.cost.fxDate}) · prepared {new Date(c.cost.preparedAt).toLocaleString()}</p>
                  </div>
                )}
                {!settings?.fx && <p className="rounded-lg bg-[#fbeee9] px-3 py-2 text-sm text-[#8a3423]">Set the exchange rate, source and date in Fees & settings first.</p>}
                <form className="grid gap-3 rounded-xl border border-line p-4 md:grid-cols-3" onSubmit={(e) => { const v = fd(e); const manual = v.low && v.base && v.high; act({ type: "cost", assumptions: v.assumptions, confidence: v.confidence, ...(manual ? { ghs: { low: Number(v.low), base: Number(v.base), high: Number(v.high) } } : { floorAreaSqm: Number(v.sqm), finish: v.finish }) }); }}>
                  <div className="md:col-span-3"><H>Prepare range</H><p className="text-xs text-muted">Either enter GHS low/base/high manually, or leave them blank and calculate from the published cost assumptions ({settings?.costAssumptions?.version ?? "none published"}).</p></div>
                  <input name="low" type="number" min="1" placeholder="GHS low" className={small} /><input name="base" type="number" min="1" placeholder="GHS base" className={small} /><input name="high" type="number" min="1" placeholder="GHS high" className={small} />
                  <input name="sqm" type="number" min="1" placeholder="Floor area m² (for calculation)" className={small} />
                  <select name="finish" defaultValue={c.project.finish} className={small}>{finishLevels.map((f) => <option key={f.value} value={f.value}>{f.label}</option>)}</select>
                  <select name="confidence" defaultValue="low" className={small}><option value="low">Low confidence</option><option value="medium">Medium confidence</option><option value="high">High confidence</option></select>
                  <textarea name="assumptions" required rows={3} placeholder="Assumptions: scope, exclusions (land, furniture, external works?), contingency, price date…" defaultValue={c.cost?.assumptions} className={`${small} md:col-span-3`} />
                  <button disabled={!settings?.fx} className="btn-forest !min-h-9 w-fit !py-1.5 text-sm disabled:opacity-50">Save cost range</button>
                </form>
              </div>
            )}

            {tab === "report" && (
              <div className="space-y-5">
                <form className="space-y-3 rounded-xl border border-line p-4" onSubmit={(e) => { const v = fd(e); act({ type: "recommendation", decision: v.decision, rationale: v.rationale, conditions: v.conditions || undefined, nextSteps: v.nextSteps || undefined }); }}>
                  <H>Recommendation {c.recommendation?.approvedBy ? `— approved by ${c.recommendation.approvedBy}` : c.recommendation ? "— draft, awaiting approval" : ""}</H>
                  <select name="decision" defaultValue={c.recommendation?.decision ?? "proceed_after_conditions"} className={small}>{recommendations.map((r) => <option key={r} value={r}>{recommendationLabel[r]}</option>)}</select>
                  <textarea name="rationale" required minLength={10} rows={3} placeholder="Why" defaultValue={c.recommendation?.rationale} className={small} />
                  <textarea name="conditions" rows={2} placeholder="Conditions / open issues" defaultValue={c.recommendation?.conditions} className={small} />
                  <textarea name="nextSteps" rows={2} placeholder="Next steps" defaultValue={c.recommendation?.nextSteps} className={small} />
                  <p className="text-xs text-muted">Editing the recommendation clears any earlier approval.</p>
                  <button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">Save draft recommendation</button>
                </form>
                <form className="space-y-2 rounded-xl border border-line p-4" onSubmit={(e) => act({ type: "summary", text: fd(e).summary })}>
                  <H>Reviewer's summary (report section 1)</H>
                  <textarea name="summary" defaultValue={c.summary} rows={3} className={small} />
                  <button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">Save summary</button>
                </form>
                <div className="rounded-xl border border-line p-4">
                  <H>Internal QA & delivery</H>
                  <ReadinessChecklist c={c} />
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {c.status === "report_drafting" && <button onClick={() => act({ type: "status", to: "internal_qa" })} className={chip}>→ Send to internal QA</button>}
                    {c.status === "internal_qa" && !c.recommendation?.approvedBy && (
                      <form className="flex gap-2" onSubmit={(e) => act({ type: "approve", reviewer: fd(e).reviewer }, "Approved")}><input name="reviewer" required placeholder="Approver name" className={small} /><button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">Approve recommendation</button></form>
                    )}
                    {c.status === "internal_qa" && <button onClick={() => act({ type: "deliver" }, "Delivered — link-only email sent (or logged)")} disabled={busy || !c.recommendation?.approvedBy} className="btn-gold !min-h-9 !py-1.5 text-sm disabled:opacity-50">Deliver final report</button>}
                  </div>
                </div>
                <div className="rounded-xl border border-line p-4 text-sm">
                  <H>Report history</H>
                  <ul className="mt-2 space-y-1">{c.reports.slice().reverse().map((r) => <li key={`${r.version}-${r.generatedAt}`}>v{r.version} · {r.final ? "FINAL" : "draft"} · {new Date(r.generatedAt).toLocaleString()} · {r.by}{r.deliveredAt ? ` · delivered` : ""}{r.acknowledgedAt ? ` · client acknowledged ${new Date(r.acknowledgedAt).toLocaleDateString()}` : ""}</li>)}{!c.reports.length && <li className="text-muted">No versions yet.</li>}</ul>
                </div>
              </div>
            )}

            {tab === "files" && (
              <div className="space-y-4">
                <div className="rounded-xl border border-line p-4">
                  <H>Client paperwork</H>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {documentInventory.map((d) => {
                      const files = c.documents.filter((x) => x.docKey === d.key && x.status === "uploaded");
                      return <li key={d.key}><span className="font-semibold text-forest">{d.label}</span> <span className="text-xs text-muted">({docAvailabilityLabel[c.inventory[d.key] as keyof typeof docAvailabilityLabel] ?? "—"})</span>{files.map((f) => <span key={f.id} className="ml-2"><button onClick={() => download(f.id)} className="text-forest underline">{f.filename}</button></span>)}</li>;
                    })}
                  </ul>
                  <p className="mt-2 text-xs text-muted">Downloads use signed links valid {uploadPolicy.signedUrlTtlSec / 60} min and are recorded in the audit log.</p>
                </div>
                <div className="rounded-xl border border-line p-4">
                  <H>Internal notes</H>
                  <form onSubmit={(e) => { const v = fd(e); (e.currentTarget as HTMLFormElement).reset(); act({ type: "note", text: v.note }); }} className="mt-2 flex gap-2"><input name="note" required className={small} placeholder="Add a note" /><button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">Add</button></form>
                  <ul className="mt-2 max-h-40 space-y-1 overflow-auto text-xs text-muted">{c.internalNotes.map((x) => <li key={x.at}>{new Date(x.at).toLocaleString()}: {x.text}</li>)}</ul>
                </div>
                <details open className="rounded-xl border border-line p-4 text-xs">
                  <summary className="cursor-pointer font-semibold text-forest">Audit log ({sel!.audit.length})</summary>
                  <ul className="mt-2 max-h-72 space-y-1 overflow-auto font-mono">{sel!.audit.map((a, i) => <li key={i}>{a.at} · {a.actor} · {a.action} {a.detail ? JSON.stringify(a.detail) : ""}</li>)}</ul>
                </details>
              </div>
            )}
          </div>
        ) : <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">Select a case to review it.</div>}
      </section>
    </main>
  );
}

function ReadinessChecklist({ c }: { c: ReadinessCase }) {
  const items: [string, boolean][] = [
    ["Payment confirmed", c.paymentStatus === "paid"],
    ["Site visit documented", siteVisitDocumented(c.siteVisit)],
    ["Title: counsel outcome recorded or not commissioned", counselOutcomes.includes(c.titleStatus) || c.titleStatus === "not_commissioned"],
    ["Permit checklist has items", c.permits.length > 0],
    ["Cost range prepared", Boolean(c.cost)],
    ["Recommendation drafted", Boolean(c.recommendation)],
    ["Recommendation approved by a named reviewer", Boolean(c.recommendation?.approvedBy)],
  ];
  return <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">{items.map(([l, ok]) => <li key={l} className={ok ? "text-forest" : "text-muted"}>{ok ? "✓" : "○"} {l}</li>)}</ul>;
}

function TitlePanel({ c, act, busy }: { c: ReadinessCase; act: (b: Record<string, unknown>, ok?: string) => Promise<boolean>; busy: boolean }) {
  const [f, setF] = useState({ firm: c.counsel?.firm ?? "", lawyer: c.counsel?.lawyer ?? "", reference: c.counsel?.reference ?? "", searchReference: c.counsel?.searchReference ?? "", summary: c.counsel?.summary ?? "", limitations: c.counsel?.limitations ?? "" });
  useEffect(() => { setF({ firm: c.counsel?.firm ?? "", lawyer: c.counsel?.lawyer ?? "", reference: c.counsel?.reference ?? "", searchReference: c.counsel?.searchReference ?? "", summary: c.counsel?.summary ?? "", limitations: c.counsel?.limitations ?? "" }); }, [c.id, c.counsel]);
  const inp = (k: keyof typeof f, ph: string, area = false) => area
    ? <textarea placeholder={ph} rows={3} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={small} />
    : <input placeholder={ph} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} className={small} />;
  return (
    <div className="space-y-3 rounded-xl border border-line p-4">
      <H>Counsel-owned title workstream — {titleStatusLabel[c.titleStatus]}</H>
      <p className="text-xs text-muted">Only Ghana-qualified counsel produces an outcome. An outcome needs the firm, lawyer of record and counsel's reference. Uploads never equal verified title.</p>
      <div className="grid gap-2 md:grid-cols-2">{inp("firm", "Counsel firm")}{inp("lawyer", "Lawyer of record")}{inp("reference", "Counsel's reference")}{inp("searchReference", "Official search reference (Lands Commission)")}</div>
      {inp("summary", "Counsel's findings (appears verbatim in report section 3)", true)}
      {inp("limitations", "Limitations stated by counsel", true)}
      <div className="flex flex-wrap gap-2">{titleTransitions[c.titleStatus].map((t) => <button key={t} disabled={busy} onClick={() => act({ type: "title", to: t, counsel: f })} className={chip}>→ {titleStatusLabel[t]}</button>)}</div>
      {c.counsel?.signedOffAt && <p className="text-xs text-muted">Outcome recorded {new Date(c.counsel.signedOffAt).toLocaleString()}</p>}
    </div>
  );
}

function PermitRow({ p, act }: { p?: ReadinessCase["permits"][number]; act: (b: Record<string, unknown>, ok?: string) => Promise<boolean> }) {
  return (
    <form className="grid gap-2 rounded-xl border border-line p-3 md:grid-cols-[1.2fr_1fr_170px_1fr_140px_auto]" onSubmit={(e) => { const v = fd(e); act({ type: "permit_upsert", item: { id: p?.id, item: v.item, authority: v.authority, status: v.status, sourceUrl: v.sourceUrl || undefined, lastChecked: v.lastChecked || undefined, notes: v.notes || undefined } }); if (!p) (e.currentTarget as HTMLFormElement).reset(); }}>
      <input name="item" required defaultValue={p?.item} placeholder={p ? "" : "New item, e.g. Building permit"} className={small} />
      <input name="authority" required defaultValue={p?.authority} placeholder="Authority" className={small} />
      <select name="status" defaultValue={p?.status ?? "pending_confirmation"} className={small}>{permitStatuses.map((s) => <option key={s} value={s}>{permitStatusLabel[s]}</option>)}</select>
      <input name="sourceUrl" type="url" defaultValue={p?.sourceUrl} placeholder="Source link" className={small} />
      <input name="lastChecked" type="date" defaultValue={p?.lastChecked} className={small} aria-label="Last checked" />
      <div className="flex gap-1"><button className="btn-ghost-dark !min-h-9 !px-3 !py-1.5 text-xs">{p ? "Save" : "Add"}</button>{p && <button type="button" onClick={() => act({ type: "permit_remove", id: p.id })} className="px-2 text-xs text-muted underline">Remove</button>}</div>
      <input name="notes" defaultValue={p?.notes} placeholder="Notes" className={`${small} md:col-span-6`} />
    </form>
  );
}

function SettingsPanel({ s, save }: { s: Settings; save: (p: Partial<Settings>) => Promise<void> }) {
  const m = (v: number | null | undefined) => (v ? String(v / 100) : "");
  const toMinor = (v: string) => (v.trim() ? Math.round(Number(v) * 100) : null);
  const ca = s.costAssumptions;
  return (
    <section className="mt-6 grid gap-5 rounded-2xl bg-white p-6 lg:grid-cols-2" data-testid="settings">
      <form className="space-y-3" onSubmit={(e) => {
        const v = fd(e);
        const addOns = Object.fromEntries(addOnServices.map((a) => [a.value, { usdMinor: toMinor(v[`a_${a.value}_usd`] || ""), ghsMinor: toMinor(v[`a_${a.value}_ghs`] || "") }]));
        save({ usdMinor: toMinor(v.usd), ghsMinor: toMinor(v.ghs), turnaroundDays: v.days ? Number(v.days) : null, addOns, coverage: v.coverage || null, refundPolicy: v.refund || null });
      }}>
        <H>Fees (BASE_REVIEW_FEE + optional add-ons)</H>
        <div className="grid grid-cols-3 gap-2">
          <input name="usd" defaultValue={m(s.usdMinor)} placeholder="Base USD" aria-label="Base fee USD" className={small} />
          <input name="ghs" defaultValue={m(s.ghsMinor)} placeholder="Base GHS" aria-label="Base fee GHS" className={small} />
          <input name="days" defaultValue={s.turnaroundDays ?? ""} placeholder="Turnaround days" aria-label="Turnaround days" className={small} />
        </div>
        {addOnServices.map((a) => (
          <div key={a.value} className="grid grid-cols-[1fr_110px_110px] items-center gap-2 text-xs">
            <span>{a.label}</span>
            <input name={`a_${a.value}_usd`} defaultValue={m(s.addOns?.[a.value]?.usdMinor)} placeholder="USD (blank = quoted)" className={small} />
            <input name={`a_${a.value}_ghs`} defaultValue={m(s.addOns?.[a.value]?.ghsMinor)} placeholder="GHS" className={small} />
          </div>
        ))}
        <textarea name="coverage" defaultValue={s.coverage ?? ""} rows={2} placeholder="Coverage (service area) shown to clients" className={small} />
        <textarea name="refund" defaultValue={s.refundPolicy ?? ""} rows={3} placeholder="Refund & cancellation terms shown to clients" className={small} />
        <p className="text-xs text-muted">Add-ons are never charged at checkout — they're quoted per case and charged only after the client approves.</p>
        <button className="btn-forest !min-h-9 !py-1.5 text-sm">Save fees & terms</button>
      </form>
      <div className="space-y-5">
        <form className="space-y-2" onSubmit={(e) => { const v = fd(e); save({ fx: v.rate ? { usdToGhs: Number(v.rate), source: v.source, date: v.date } : null }); }}>
          <H>Exchange rate (shown wherever two currencies appear)</H>
          <div className="grid grid-cols-3 gap-2">
            <input name="rate" type="number" step="0.0001" defaultValue={s.fx?.usdToGhs ?? ""} placeholder="1 USD = ? GHS" className={small} />
            <input name="source" defaultValue={s.fx?.source ?? ""} placeholder="Source, e.g. Bank of Ghana" className={small} />
            <input name="date" type="date" defaultValue={s.fx?.date ?? ""} className={small} aria-label="Rate date" />
          </div>
          <button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">Save rate</button>
        </form>
        <form className="space-y-2" onSubmit={(e) => {
          const v = fd(e);
          const t = (k: string): [number, number, number] => [Number(v[`${k}_l`]), Number(v[`${k}_b`]), Number(v[`${k}_h`])];
          save({ costAssumptions: { version: v.version, notes: v.notes, ghsPerSqm: { basic: t("basic"), standard: t("standard"), high: t("high"), luxury: t("luxury") } } });
        }}>
          <H>Cost assumptions (versioned) — GHS per m² of floor area</H>
          <p className="text-xs text-muted">Owner-supplied benchmarks only. Changing rates under the same version automatically bumps the version so earlier reports stay traceable.</p>
          {(["basic", "standard", "high", "luxury"] as const).map((k) => (
            <div key={k} className="grid grid-cols-[80px_1fr_1fr_1fr] items-center gap-2 text-xs"><span className="capitalize">{k}</span>
              {(["l", "b", "h"] as const).map((x, i) => <input key={x} name={`${k}_${x}`} type="number" min="1" required defaultValue={ca?.ghsPerSqm?.[k]?.[i] ?? ""} placeholder={["low", "base", "high"][i]} className={small} />)}
            </div>
          ))}
          <div className="grid grid-cols-[120px_1fr] gap-2"><input name="version" required defaultValue={ca?.version ?? "v1"} className={small} aria-label="Version" /><input name="notes" defaultValue={ca?.notes ?? ""} placeholder="Basis / date of benchmarks" className={small} /></div>
          <button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">Publish assumptions</button>
        </form>
      </div>
    </section>
  );
}
