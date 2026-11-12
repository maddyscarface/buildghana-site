"use client";

import { useCallback, useEffect, useState } from "react";
import { caseStatuses, titleStatuses, clientStatusLabel, titleStatusLabel, transitions, titleTransitions, type ReadinessCase, type CaseStatus, type TitleStatus } from "@/lib/readiness/model";
import { reviewAreas, documentInventory } from "@/config/readiness";
import { Logo } from "@/components/ui/Icons";

type Row = { id: string; createdAt: string; status: CaseStatus; paymentStatus: string; titleStatus: TitleStatus; sandbox: boolean; name: string; email: string; region: string; docs: number; amountMinor?: number; currency?: string; source: string };
type Revenue = { totals: Record<string, { live: number; sandbox: number; count: number }>; paidCasesBySource: Record<string, number> };
const fmt = (m: number, c: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: c }).format(m / 100);
void caseStatuses; void titleStatuses;

export function AdminDashboard() {
  const [token, setToken] = useState("");
  const [authed, setAuthed] = useState(false);
  const [rows, setRows] = useState<Row[]>([]);
  const [rev, setRev] = useState<Revenue | null>(null);
  const [sel, setSel] = useState<{ case: ReadinessCase; audit: { at: string; actor: string; action: string; detail?: Record<string, unknown> }[]; clientLink: string } | null>(null);
  const [price, setPrice] = useState<{ usd: string; ghs: string; days: string }>({ usd: "", ghs: "", days: "" });
  const [integrations, setIntegrations] = useState<Record<string, unknown>>({});
  const [msg, setMsg] = useState("");
  const [counsel, setCounsel] = useState({ firm: "", lawyer: "", reference: "", summary: "" });

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
    if (s.ok) {
      const p = s.j.price; setIntegrations(s.j.integrations);
      setPrice({ usd: p.usdMinor ? String(p.usdMinor / 100) : "", ghs: p.ghsMinor ? String(p.ghsMinor / 100) : "", days: p.turnaroundDays ? String(p.turnaroundDays) : "" });
    }
    return true;
  }, [api]);

  useEffect(() => { try { const t = sessionStorage.getItem("bga_admin"); if (t) setToken(t); } catch {} }, []);
  useEffect(() => { if (token && !authed) refresh(); }, [token, authed, refresh]);

  const open = async (id: string) => {
    const r = await api(`/api/admin/readiness/${id}`);
    if (r.ok) { setSel(r.j); setCounsel({ firm: r.j.case.counsel?.firm || "", lawyer: r.j.case.counsel?.lawyer || "", reference: r.j.case.counsel?.reference || "", summary: r.j.case.counsel?.summary || "" }); }
  };
  const act = async (body: Record<string, unknown>) => {
    if (!sel) return;
    setMsg("");
    const r = await api(`/api/admin/readiness/${sel.case.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setMsg(r.ok ? "Saved" : r.j.error || "Failed");
    await open(sel.case.id); await refresh();
  };
  const savePrice = async () => {
    const toMinor = (v: string) => (v.trim() ? Math.round(Number(v) * 100) : null);
    const r = await api("/api/admin/settings", { method: "PUT", body: JSON.stringify({ usdMinor: toMinor(price.usd), ghsMinor: toMinor(price.ghs), turnaroundDays: price.days ? Number(price.days) : null }) });
    setMsg(r.ok ? "Price saved" : r.j.error || "Failed");
  };
  const download = async (docId: string) => {
    if (!sel) return;
    const r = await api(`/api/admin/readiness/${sel.case.id}/files/${docId}`);
    if (r.ok) window.open(r.j.url, "_blank", "noopener");
  };
  const report = async () => {
    if (!sel) return;
    const r = await fetch(`/api/admin/readiness/${sel.case.id}/report`, { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { setMsg("Report failed"); return; }
    const url = URL.createObjectURL(await r.blob()); window.open(url, "_blank");
    await open(sel.case.id);
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
  return (
    <main className="container-wide py-10">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><Logo /><span className="rounded-full bg-forest px-3 py-1 text-xs font-semibold text-gold">Readiness Review queue</span></div>
        <div className="flex items-center gap-3 text-sm"><button onClick={refresh} className="btn-ghost-dark !min-h-10 !py-2">Refresh</button><button onClick={() => { try { sessionStorage.removeItem("bga_admin"); } catch {} setAuthed(false); setToken(""); }} className="text-muted underline">Sign out</button></div>
      </header>
      {msg && <p className="mt-4 rounded-lg bg-white px-4 py-2 text-sm text-forest">{msg}</p>}

      <section className="mt-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-2xl bg-forest p-5 text-ivory"><p className="text-xs uppercase tracking-wider text-gold">Cases</p><p className="mt-1 font-display text-3xl">{rows.length}</p><p className="text-xs text-ivory/60">{rows.filter((r) => r.paymentStatus === "paid").length} paid</p></div>
        <div className="rounded-2xl bg-white p-5 md:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">Readiness Review revenue (separate stream)</p>
          <div className="mt-2 flex flex-wrap gap-6">
            {Object.entries(rev?.totals ?? {}).map(([cur, t]) => <div key={cur}><p className="font-display text-2xl text-forest">{fmt(t.live, cur)}</p><p className="text-xs text-muted">live · {fmt(t.sandbox, cur)} sandbox · {t.count} payments</p></div>)}
            {!Object.keys(rev?.totals ?? {}).length && <p className="text-sm text-muted">No payments yet.</p>}
          </div>
          <p className="mt-2 text-xs text-muted">Paid cases by source: {Object.entries(rev?.paidCasesBySource ?? {}).map(([k, v]) => `${k} ${v}`).join(" · ") || "—"}</p>
        </div>
        <div className="rounded-2xl bg-white p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">Price (owner-set)</p>
          <div className="mt-2 grid grid-cols-3 gap-2">
            <input aria-label="USD price" placeholder="USD" value={price.usd} onChange={(e) => setPrice({ ...price, usd: e.target.value })} className="field-input !px-2 !py-2 text-sm" />
            <input aria-label="GHS price" placeholder="GHS" value={price.ghs} onChange={(e) => setPrice({ ...price, ghs: e.target.value })} className="field-input !px-2 !py-2 text-sm" />
            <input aria-label="Turnaround days" placeholder="Days" value={price.days} onChange={(e) => setPrice({ ...price, days: e.target.value })} className="field-input !px-2 !py-2 text-sm" />
          </div>
          <button onClick={savePrice} className="btn-forest mt-2 !min-h-9 w-full !py-1.5 text-sm">Save price</button>
        </div>
      </section>
      <p className="mt-3 text-xs text-muted">Integrations: {Object.entries(integrations).map(([k, v]) => `${k}: ${String(v)}`).join(" · ")}</p>

      <section className="mt-8 grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <div className="self-start overflow-hidden rounded-2xl bg-white">
          <table className="w-full text-left text-sm">
            <thead className="bg-ivory text-xs uppercase tracking-wider text-muted"><tr><th className="p-3">Client</th><th className="p-3">Status</th><th className="p-3">Title</th><th className="p-3">Docs</th><th className="p-3">Paid</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} onClick={() => open(r.id)} className={`cursor-pointer border-t border-line hover:bg-ivory ${sel?.case.id === r.id ? "bg-ivory" : ""}`}>
                  <td className="p-3"><p className="font-semibold text-forest">{r.name} {r.sandbox && <span className="ml-1 rounded bg-gold/20 px-1.5 text-[10px] text-gold-2">SANDBOX</span>}</p><p className="text-xs text-muted">{r.region} · {r.source} · {new Date(r.createdAt).toLocaleDateString()}</p></td>
                  <td className="p-3">{clientStatusLabel[r.status]}</td>
                  <td className="p-3 text-xs">{titleStatusLabel[r.titleStatus]}</td>
                  <td className="p-3">{r.docs}</td>
                  <td className="p-3">{r.paymentStatus === "paid" && r.amountMinor && r.currency ? fmt(r.amountMinor, r.currency) : r.paymentStatus}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5} className="p-6 text-center text-muted">No cases yet.</td></tr>}
            </tbody>
          </table>
        </div>

        {c ? (
          <div className="space-y-5 rounded-2xl bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><h2 className="font-display text-2xl text-forest">{c.contact.firstName} {c.contact.lastName}</h2><p className="text-sm text-muted">{c.contact.email} · {c.contact.phone} · case {c.id.slice(0, 8)}</p></div>
              <div className="flex gap-2"><button onClick={report} className="btn-forest !min-h-10 !py-2 text-sm">{c.status === "delivered" ? "View final report" : "Generate draft PDF"}</button><a href={sel!.clientLink} target="_blank" className="btn-ghost-dark !min-h-10 !py-2 text-sm">Client page</a></div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-line p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">Case status</p>
                <p className="mt-1 font-semibold text-forest">{clientStatusLabel[c.status]}</p>
                <div className="mt-3 flex flex-wrap gap-2">{transitions[c.status].map((t) => <button key={t} onClick={() => act({ type: "status", to: t })} className="rounded-full border border-line px-3 py-1 text-xs hover:border-forest">→ {clientStatusLabel[t]}</button>)}</div>
                {c.status === "report_ready" && <button onClick={() => act({ type: "deliver" })} className="btn-gold mt-3 !min-h-9 !py-1.5 text-sm">Deliver final report</button>}
              </div>
              <div className="rounded-xl border border-line p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">Title verification (counsel-gated)</p>
                <p className="mt-1 font-semibold text-forest">{titleStatusLabel[c.titleStatus]}</p>
                <div className="mt-2 grid gap-2">
                  <input placeholder="Counsel firm" value={counsel.firm} onChange={(e) => setCounsel({ ...counsel, firm: e.target.value })} className="field-input !py-2 text-sm" />
                  <input placeholder="Lawyer of record" value={counsel.lawyer} onChange={(e) => setCounsel({ ...counsel, lawyer: e.target.value })} className="field-input !py-2 text-sm" />
                  <input placeholder="Counsel reference" value={counsel.reference} onChange={(e) => setCounsel({ ...counsel, reference: e.target.value })} className="field-input !py-2 text-sm" />
                  <textarea placeholder="Counsel's summary (appears in report)" rows={2} value={counsel.summary} onChange={(e) => setCounsel({ ...counsel, summary: e.target.value })} className="field-input !py-2 text-sm" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">{titleTransitions[c.titleStatus].map((t) => <button key={t} onClick={() => act({ type: "title", to: t, counsel })} className="rounded-full border border-line px-3 py-1 text-xs hover:border-forest">→ {titleStatusLabel[t]}</button>)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-line p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">Findings</p>
              <div className="mt-3 space-y-3">
                {reviewAreas.map((a) => {
                  const f = c.findings[a.key] ?? { rating: "not_assessed", notes: "" };
                  return (
                    <form key={a.key} className="grid gap-2 md:grid-cols-[180px_150px_1fr_auto] md:items-start" onSubmit={(e) => { e.preventDefault(); const fd = new FormData(e.currentTarget); act({ type: "finding", area: a.key, rating: fd.get("rating"), notes: String(fd.get("notes") || "") }); }}>
                      <span className="text-sm font-semibold text-forest">{a.title}</span>
                      <select name="rating" defaultValue={f.rating} className="field-input !py-2 text-sm"><option value="not_assessed">Not assessed</option><option value="ready">Ready</option><option value="attention">Needs attention</option><option value="not_ready">Not ready</option></select>
                      <textarea name="notes" defaultValue={f.notes} rows={2} className="field-input !py-2 text-sm" />
                      <button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">Save</button>
                    </form>
                  );
                })}
                <form onSubmit={(e) => { e.preventDefault(); act({ type: "summary", text: String(new FormData(e.currentTarget).get("summary") || "") }); }} className="grid gap-2">
                  <textarea name="summary" defaultValue={c.summary} rows={3} placeholder="Executive summary for the report" className="field-input text-sm" />
                  <button className="btn-ghost-dark !min-h-9 w-fit !py-1.5 text-xs">Save summary</button>
                </form>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-line p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">Documents</p>
                <ul className="mt-2 space-y-1.5 text-sm">
                  {c.documents.filter((d) => d.status === "uploaded").map((d) => <li key={d.id} className="flex justify-between gap-2"><span className="truncate">{documentInventory.find((x) => x.key === d.docKey)?.label}: {d.filename}</span><button onClick={() => download(d.id)} className="shrink-0 text-forest underline">Open</button></li>)}
                  {!c.documents.some((d) => d.status === "uploaded") && <li className="text-muted">None uploaded yet.</li>}
                </ul>
              </div>
              <div className="rounded-xl border border-line p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">Internal notes</p>
                <form onSubmit={(e) => { e.preventDefault(); const f = e.currentTarget; act({ type: "note", text: String(new FormData(f).get("note") || "") }); f.reset(); }} className="mt-2 flex gap-2"><input name="note" className="field-input !py-2 text-sm" placeholder="Add a note" /><button className="btn-ghost-dark !min-h-9 !py-1.5 text-xs">Add</button></form>
                <ul className="mt-2 max-h-32 space-y-1 overflow-auto text-xs text-muted">{c.internalNotes.map((n) => <li key={n.at}>{new Date(n.at).toLocaleString()}: {n.text}</li>)}</ul>
              </div>
            </div>

            <details className="rounded-xl border border-line p-4 text-xs">
              <summary className="cursor-pointer font-semibold text-forest">Audit log ({sel!.audit.length})</summary>
              <ul className="mt-2 max-h-56 space-y-1 overflow-auto font-mono">{sel!.audit.map((a, i) => <li key={i}>{a.at} · {a.actor} · {a.action} {a.detail ? JSON.stringify(a.detail) : ""}</li>)}</ul>
            </details>
          </div>
        ) : <div className="rounded-2xl border border-dashed border-line p-10 text-center text-muted">Select a case to review it.</div>}
      </section>
    </main>
  );
}
