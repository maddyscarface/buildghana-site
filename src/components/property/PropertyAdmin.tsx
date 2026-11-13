"use client";

import { useCallback, useEffect, useState } from "react";
import { Logo } from "@/components/ui/Icons";
import { labelFor } from "@/lib/lead/options";
import { leadTransitions, legalStateLabel, legalStates, statusLabel, type LeadStatus, type LegalState } from "@/lib/property/model";
import { areaUnits, buyerEligibility, currencies, propertyKinds, propertyUses, residenceCountries, titleStatusSelfReport } from "@/config/property";

type Summary = { id: string; kind: "seller" | "buyer"; reference: string; createdAt: string; status: LeadStatus; legalState: LegalState; sandbox: boolean; deleted: boolean; duplicateOf?: string; residence: string; where: string; type: string };
type MatchRow = { id: string; propertyId: string; buyerId: string; propertyRef?: string; buyerRef?: string; status: string; score: number; reasons: string[]; blockers: string[]; createdAt: string; fx?: { usdToGhs: number; source: string; date: string } | null };
type Overview = {
  role: string; sellers: Summary[]; buyers: Summary[]; matches: MatchRow[]; intros: { id: string; matchId: string; createdAt: string; status: string }[];
  requests: { id: string; type: string; createdAt: string; reference?: string; email: string; message: string; status: string }[];
  compliance: { key: string; label: string; done: boolean; note?: string; by?: string; at?: string }[];
  events: Record<string, unknown>[]; settings: Record<string, string | number>;
};
type Detail = { role: string; record: Record<string, any>; assets: { id: string; category: string; docType?: string; contentType: string; size: number; status: string; scan: string; filename: string; downloadable: boolean }[]; authorization: Record<string, any> | null; tasks: { id: string; title: string; type: string; status: string; assignee?: string }[]; audit: { at: string; actor: string; action: string; detail?: Record<string, unknown> }[]; matches: MatchRow[] };

const TABS = ["sellers", "buyers", "matches", "requests", "compliance", "activity"] as const;
const small = "field-input !py-2 text-sm";
const chip = "min-h-9 rounded-full border border-line px-3 py-1 text-xs hover:border-forest disabled:opacity-40";
const H = ({ children }: { children: React.ReactNode }) => <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">{children}</p>;
const money = (minor: number | null, c: string | null) => (minor === null || !c ? "—" : new Intl.NumberFormat("en-US", { style: "currency", currency: c, maximumFractionDigits: 0 }).format(minor / 100));

export function PropertyAdmin() {
  const [token, setToken] = useState(""); const [authed, setAuthed] = useState(false);
  const [ov, setOv] = useState<Overview | null>(null);
  const [tab, setTab] = useState<(typeof TABS)[number]>("sellers");
  const [sel, setSel] = useState<{ kind: "seller" | "buyer"; id: string; d: Detail } | null>(null);
  const [match, setMatch] = useState<Record<string, any> | null>(null);
  const [msg, setMsg] = useState(""); const [busy, setBusy] = useState(false);

  const api = useCallback(async (path: string, init?: RequestInit) => {
    const r = await fetch(path, { ...init, headers: { ...(init?.headers || {}), Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    if (r.status === 401) { setAuthed(false); try { sessionStorage.removeItem("bga_admin"); } catch {} }
    return { ok: r.ok && j.ok !== false, j };
  }, [token]);

  const refresh = useCallback(async () => {
    const r = await api("/api/admin/property");
    if (!r.ok) { setMsg(r.j.error || "Unauthorised"); return; }
    setOv(r.j); setAuthed(true);
  }, [api]);

  useEffect(() => { try { const t = sessionStorage.getItem("bga_admin"); if (t) setToken(t); } catch {} }, []);
  useEffect(() => { if (token && !authed) refresh(); }, [token, authed, refresh]);
  useEffect(() => {
    if (!authed) return;
    const q = new URLSearchParams(window.location.search);
    if (q.get("seller")) open("seller", q.get("seller")!); else if (q.get("buyer")) open("buyer", q.get("buyer")!); else if (q.get("match")) openMatch(q.get("match")!);
  }, [authed]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = async (kind: "seller" | "buyer", id: string) => { setMatch(null); const r = await api(`/api/admin/property/${kind}/${id}`); if (r.ok) setSel({ kind, id, d: r.j }); else setMsg(r.j.error); };
  const openMatch = async (id: string) => { setSel(null); const r = await api(`/api/admin/property/matches/${id}`); if (r.ok) setMatch(r.j); else setMsg(r.j.error); };
  const act = async (body: Record<string, unknown>, ok = "Saved") => {
    if (!sel) return; setBusy(true); setMsg("");
    const r = await api(`/api/admin/property/${sel.kind}/${sel.id}`, { method: "PATCH", body: JSON.stringify(body) });
    setMsg(r.ok ? ok : `⚠ ${r.j.error || "Failed"}`); await open(sel.kind, sel.id); await refresh(); setBusy(false);
  };
  const matchAct = async (id: string, action: string) => {
    const note = action === "approve_introduction" ? prompt("Note for the audit log (how the introduction will be made):") ?? undefined : undefined;
    setBusy(true); const r = await api(`/api/admin/property/matches/${id}`, { method: "PATCH", body: JSON.stringify({ action, note }) });
    setMsg(r.ok ? "Saved" : `⚠ ${r.j.error || "Failed"}`); await openMatch(id); await refresh(); setBusy(false);
  };
  const download = async (assetId: string) => { const r = await api(`/api/admin/property/assets/${assetId}`); if (r.ok) window.open(r.j.url, "_blank", "noopener"); else setMsg(`⚠ ${r.j.error}`); };

  if (!authed) {
    return (
      <main className="container-x flex min-h-screen max-w-md flex-col justify-center py-20">
        <Logo />
        <h1 className="mt-8 font-display text-3xl text-forest">Property introductions — staff</h1>
        <form className="mt-6 space-y-3" onSubmit={(e) => { e.preventDefault(); try { sessionStorage.setItem("bga_admin", token); } catch {} refresh(); }}>
          <label htmlFor="tok" className="field-label">Staff token</label>
          <input id="tok" type="password" autoComplete="off" value={token} onChange={(e) => setToken(e.target.value)} className="field-input" />
          <button className="btn-forest w-full">Sign in</button>
          {msg && <p className="field-error">{msg}</p>}
        </form>
      </main>
    );
  }
  if (!ov) return null;
  const rows = tab === "sellers" ? ov.sellers : ov.buyers;

  return (
    <main className="container-wide py-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4"><Logo /><span className="rounded-full bg-forest px-3 py-1 text-xs font-semibold text-gold">Property · {ov.role}</span></div>
        <nav className="flex flex-wrap gap-2 text-sm"><a href="/admin/readiness" className={chip}>Readiness Review queue</a><button className={chip} onClick={refresh}>Refresh</button></nav>
      </header>
      <p className="mt-4 rounded-xl border border-dashed border-gold-2/60 bg-gold/10 px-4 py-3 text-sm text-ink/80">Private. Never paste seller details, exact locations or documents into email, WhatsApp groups, ads or public pages. Introductions require seller authorisation + admin approval. Storage: <b>{String(ov.settings.storage)}</b> · Files: <b>{String(ov.settings.documents)}</b> · GHL: <b>{String(ov.settings.ghl)}</b> · Opportunities page: <b>{String(ov.settings.opportunitiesMode)}</b></p>
      {msg && <p className="mt-3 text-sm font-semibold text-forest" role="status">{msg}</p>}

      <div className="mt-6 flex flex-wrap gap-2" role="tablist">
        {TABS.map((t) => <button key={t} role="tab" aria-selected={tab === t} className={`${chip} ${tab === t ? "!border-forest bg-forest text-ivory" : ""}`} onClick={() => setTab(t)}>{t[0].toUpperCase() + t.slice(1)}{t === "sellers" ? ` (${ov.sellers.length})` : t === "buyers" ? ` (${ov.buyers.length})` : t === "matches" ? ` (${ov.matches.length})` : t === "requests" ? ` (${ov.requests.filter((r) => r.status === "open").length} open)` : ""}</button>)}
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1fr_1.1fr]">
        <section className="min-w-0 overflow-x-auto rounded-2xl border border-line bg-white">
          {(tab === "sellers" || tab === "buyers") && (
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory-2 text-xs uppercase tracking-wider text-muted"><tr><th className="p-3">Ref</th><th className="p-3">Where</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Legal</th><th className="p-3">Lives</th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className="cursor-pointer border-t border-line hover:bg-ivory-2/60" onClick={() => open(r.kind, r.id)}>
                    <td className="p-3 font-semibold text-forest">{r.reference}{r.sandbox && <span className="ml-1 text-xs text-gold-2">TEST</span>}{r.duplicateOf && <span className="ml-1 text-xs text-muted">DUP</span>}{r.deleted && <span className="ml-1 text-xs text-[#a2402b]">DELETED</span>}</td>
                    <td className="p-3">{r.where}</td><td className="p-3">{r.type.split(",").map((k) => labelFor(propertyKinds, k)).join(", ")}</td>
                    <td className="p-3">{statusLabel[r.status]}</td><td className="p-3">{legalStateLabel[r.legalState]}</td><td className="p-3">{r.residence}</td>
                  </tr>
                ))}
                {!rows.length && <tr><td className="p-6 text-muted" colSpan={6}>Nothing yet.</td></tr>}
              </tbody>
            </table>
          )}
          {tab === "matches" && (
            <table className="w-full text-left text-sm">
              <thead className="bg-ivory-2 text-xs uppercase tracking-wider text-muted"><tr><th className="p-3">Property</th><th className="p-3">Buyer</th><th className="p-3">Score</th><th className="p-3">Status</th><th className="p-3">Blockers</th></tr></thead>
              <tbody>{ov.matches.map((m) => (
                <tr key={m.id} className="cursor-pointer border-t border-line hover:bg-ivory-2/60" onClick={() => openMatch(m.id)}>
                  <td className="p-3 font-semibold">{m.propertyRef}</td><td className="p-3 font-semibold">{m.buyerRef}</td><td className="p-3">{m.score}</td><td className="p-3">{m.status}</td><td className="p-3 text-xs text-muted">{m.blockers.length}</td>
                </tr>))}
                {!ov.matches.length && <tr><td className="p-6 text-muted" colSpan={5}>No matches yet. Open a seller or buyer and run matching.</td></tr>}
              </tbody>
            </table>
          )}
          {tab === "requests" && (
            <ul className="divide-y divide-line">{ov.requests.map((r) => (
              <li key={r.id} className="p-4 text-sm">
                <p className="font-semibold text-forest">{r.type.replace("_", " ")} · {r.reference || "no ref"} · {r.status}</p>
                <p className="text-muted">{r.email} · {new Date(r.createdAt).toLocaleString()}</p>
                <p className="mt-1">{r.message}</p>
                {r.status === "open" && ov.role === "admin" && <div className="mt-2 flex gap-2">
                  <button className={chip} onClick={async () => { await api(`/api/admin/property/requests/${r.id}`, { method: "PATCH", body: JSON.stringify({ status: "done" }) }); refresh(); }}>Mark done</button>
                  <button className={chip} onClick={async () => { await api(`/api/admin/property/requests/${r.id}`, { method: "PATCH", body: JSON.stringify({ status: "rejected" }) }); refresh(); }}>Reject</button>
                </div>}
              </li>))}
              {!ov.requests.length && <li className="p-6 text-muted">No requests.</li>}
            </ul>
          )}
          {tab === "compliance" && (
            <div className="p-5">
              <H>Owner / legal gate — before charging fees or commissions</H>
              <ul className="mt-3 space-y-2">{ov.compliance.map((c) => (
                <li key={c.key} className="flex items-start gap-3 rounded-xl border border-line p-3 text-sm">
                  <input type="checkbox" className="mt-1 h-5 w-5" checked={c.done} disabled={ov.role === "reviewer"} onChange={async (e) => { await api("/api/admin/property", { method: "POST", body: JSON.stringify({ action: "compliance", key: c.key, done: e.target.checked }) }); refresh(); }} />
                  <span>{c.label}{c.at && <span className="block text-xs text-muted">Updated {new Date(c.at).toLocaleDateString()} by {c.by}</span>}</span>
                </li>))}
              </ul>
              {ov.role === "admin" && <button className={`${chip} mt-4`} onClick={async () => { const r = await api("/api/admin/property", { method: "POST", body: JSON.stringify({ action: "purge_expired" }) }); setMsg(r.ok ? `Retention purge: ${r.j.detail?.purged ?? 0} file(s)` : r.j.error); }}>Run retention purge ({String(ov.settings.retentionDays)} days)</button>}
            </div>
          )}
          {tab === "activity" && (
            <ul className="divide-y divide-line text-sm">{ov.events.map((e, i) => <li key={i} className="p-3"><span className="font-semibold">{String(e.name)}</span> <span className="text-muted">{String(e.at)}</span> <code className="text-xs">{JSON.stringify(Object.fromEntries(Object.entries(e).filter(([k]) => !["name", "at"].includes(k))))}</code></li>)}</ul>
          )}
        </section>

        <section className="min-w-0">
          {sel && <RecordPanel sel={sel} busy={busy} act={act} download={download} openMatch={openMatch} role={ov.role} />}
          {match && <MatchPanel m={match} busy={busy} act={matchAct} role={ov.role} open={open} />}
          {!sel && !match && <p className="rounded-2xl border border-dashed border-line p-8 text-center text-muted">Select a record or match.</p>}
        </section>
      </div>
    </main>
  );
}

function RecordPanel({ sel, busy, act, download, openMatch, role }: { sel: { kind: "seller" | "buyer"; d: Detail }; busy: boolean; act: (b: Record<string, unknown>, ok?: string) => void; download: (id: string) => void; openMatch: (id: string) => void; role: string }) {
  const r = sel.d.record; const a = sel.d.authorization;
  const [auth, setAuth] = useState({ shareDetailsWithMatchedBuyers: true, shareContactAfterApproval: false, publicListing: false, factualReviewDone: false, imagePermission: false, searchIndexConsent: false, evidence: "" });
  const next = leadTransitions[r.status as LeadStatus] || [];
  return (
    <div className="space-y-5 rounded-2xl border border-line bg-white p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><H>{sel.kind} · {r.reference}</H><p className="mt-1 font-display text-2xl text-forest">{r.contact.firstName} {r.contact.lastName ?? ""}</p><p className="text-sm text-muted">{r.contact.email ? `${r.contact.email} · ${r.contact.phone}` : "Contact restricted for your role"} {r.contact.whatsapp ? `· WA ${r.contact.whatsapp}` : ""} · prefers {r.contact.preferredContact} · lives in {labelFor(residenceCountries, r.contact.residenceCountry)}</p></div>
        <span className="rounded-full bg-ivory-2 px-3 py-1 text-xs font-semibold">{statusLabel[r.status as LeadStatus]}</span>
      </div>
      {r.deletedAt && <p className="rounded-lg bg-[#a2402b]/10 p-3 text-sm text-[#a2402b]">Personal data deleted {new Date(r.deletedAt).toLocaleString()}.</p>}

      {sel.kind === "seller" ? (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row k="Location" v={`${r.parcel.town}, ${r.parcel.district}, ${r.parcel.region}`} /><Row k="GhanaPost GPS (private)" v={r.parcel.ghanaPostGps || "—"} />
          <Row k="Directions (private)" v={r.parcel.locationNotes || "—"} /><Row k="Type / use" v={`${labelFor(propertyKinds, r.parcel.propertyKind)} · ${labelFor(propertyUses, r.parcel.propertyUse)}`} />
          <Row k="Size" v={r.parcel.sizeValue ? `${r.parcel.sizeValue} ${labelFor(areaUnits, r.parcel.sizeUnit)}` : "—"} /><Row k="Asking" v={`${money(r.pricing.askingMinor, r.pricing.currency)} (${r.pricing.negotiability})`} />
          <Row k="Title (self-reported)" v={labelFor(titleStatusSelfReport, r.legal.titleSelfReport)} /><Row k="Encumbrance" v={`${r.legal.encumbrance}${r.legal.encumbranceNotes ? ` — ${r.legal.encumbranceNotes}` : ""}`} />
          <Row k="Documents (exist)" v={r.legal.documentInventory.join(", ") || "—"} /><Row k="Inspection / representation" v={`${r.inspection} · ${r.representation}`} />
          {r.notes && <Row k="Notes" v={r.notes} />}
        </dl>
      ) : (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <Row k="Regions" v={r.wants.regions.join(", ")} /><Row k="Areas" v={r.wants.areas || "—"} />
          <Row k="Types" v={r.wants.propertyKinds.map((k: string) => labelFor(propertyKinds, k)).join(", ")} /><Row k="Use / purpose" v={`${r.wants.propertyUse} · ${r.wants.intendedUse}`} />
          <Row k="Budget" v={`${money(r.wants.budgetMinMinor, r.wants.currency)} – ${money(r.wants.budgetMaxMinor, r.wants.currency)}`} /><Row k="Size" v={`${r.wants.sizeMin ?? "—"}–${r.wants.sizeMax ?? "—"} ${r.wants.sizeUnit}`} />
          <Row k="Eligibility (self-reported)" v={labelFor(buyerEligibility, r.eligibility)} /><Row k="Tenure / counsel" v={`${r.wants.tenure} · ${r.wants.counsel}`} />
          <Row k="Timeline / funding" v={`${r.wants.timeline} · ${r.wants.financing || "—"}`} /><Row k="Site visit" v={r.wants.siteVisit} />
          {r.wants.mustHaves && <Row k="Must-haves" v={r.wants.mustHaves} />}
        </dl>
      )}

      <div><H>Lifecycle</H><div className="mt-2 flex flex-wrap gap-2">{next.map((s) => <button key={s} className={chip} disabled={busy} onClick={() => act({ action: "status", to: s, note: prompt(`Note for "${statusLabel[s]}" (optional)`) ?? undefined })}>→ {statusLabel[s]}</button>)}</div></div>
      <div><H>Legal review (counsel)</H>
        <select className={`${small} mt-2 max-w-xs`} value={r.legalState} disabled={busy || role === "reviewer"} onChange={(e) => act({ action: "legal", to: e.target.value })}>{legalStates.map((s) => <option key={s} value={s}>{legalStateLabel[s]}</option>)}</select>
      </div>

      {sel.kind === "seller" && (
        <div className="rounded-xl border border-line p-4">
          <H>Seller authorisation</H>
          {a && !a.revokedAt ? (
            <p className="mt-2 text-sm">Recorded {new Date(a.createdAt).toLocaleDateString()} · share details: <b>{String(a.shareDetailsWithMatchedBuyers)}</b> · share contact after approval: <b>{String(a.shareContactAfterApproval)}</b> · public listing: <b>{String(a.publicListing)}</b> · index consent: <b>{String(a.searchIndexConsent)}</b><br /><span className="text-muted">Evidence: {a.evidence}</span>
              {role === "admin" && <button className={`${chip} ml-2`} onClick={() => act({ action: "revoke", note: prompt("Reason") || "Revoked" }, "Authorisation revoked")}>Revoke</button>}</p>
          ) : <p className="mt-2 text-sm text-muted">{a?.revokedAt ? `Revoked ${new Date(a.revokedAt).toLocaleDateString()} — ${a.revokedReason}` : "None recorded. Nothing can be shared."}</p>}
          {role === "admin" && (
            <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              {(Object.keys(auth) as (keyof typeof auth)[]).filter((k) => k !== "evidence").map((k) => (
                <label key={k} className="flex items-center gap-2"><input type="checkbox" checked={Boolean(auth[k])} onChange={(e) => setAuth({ ...auth, [k]: e.target.checked })} />{k.replace(/([A-Z])/g, " $1").toLowerCase()}</label>
              ))}
              <input className={`${small} sm:col-span-2`} placeholder="Evidence, e.g. signed authorisation dated 14 Nov 2026 (file ref …)" value={auth.evidence} onChange={(e) => setAuth({ ...auth, evidence: e.target.value })} />
              <button className="btn-forest !min-h-10 !py-2 text-sm sm:col-span-2" disabled={busy} onClick={() => act({ action: "authorization", ...auth }, "Authorisation recorded")}>Record authorisation</button>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button className={chip} disabled={busy || role === "legal_reviewer"} onClick={() => act({ action: "match" }, "Matching run")}>Run matching</button>
        <button className={chip} disabled={busy} onClick={() => { const t = prompt("Task title"); if (t) act({ action: "task_add", title: t, type: "other" }); }}>Add task</button>
        {role === "admin" && <button className={`${chip} !border-[#a2402b]/40 text-[#a2402b]`} disabled={busy || r.deletedAt} onClick={() => { if (confirm("Delete this person's data and files? This cannot be undone.")) act({ action: "delete", note: prompt("Reason / request reference") || "Deletion request" }, "Data deleted"); }}>Delete data</button>}
      </div>

      {sel.d.matches.length > 0 && <div><H>Matches</H><ul className="mt-2 space-y-1 text-sm">{sel.d.matches.map((m) => <li key={m.id}><button className="underline" onClick={() => openMatch(m.id)}>{m.status} · score {m.score}</button></li>)}</ul></div>}
      <div><H>Verification tasks</H><ul className="mt-2 space-y-1.5 text-sm">{sel.d.tasks.map((t) => (
        <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ivory-2/50 px-3 py-2"><span>{t.status === "done" ? "✓ " : ""}{t.title} <span className="text-xs text-muted">({t.type}{t.assignee ? ` · ${t.assignee}` : ""})</span></span>{t.status === "open" && <button className={chip} onClick={() => act({ action: "task_update", taskId: t.id, status: "done" })}>Done</button>}</li>))}
      </ul></div>
      {sel.d.assets.length > 0 && <div><H>Files (private)</H><ul className="mt-2 space-y-1.5 text-sm">{sel.d.assets.map((f) => (
        <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-ivory-2/50 px-3 py-2"><span>{f.category} · {f.filename} · {Math.round(f.size / 1024)} KB · {f.status} · scan {f.scan}</span>{f.downloadable && <button className={chip} onClick={() => download(f.id)}>Open (5 min link)</button>}</li>))}
      </ul></div>}
      <details><summary className="cursor-pointer text-sm font-semibold text-forest">Audit log ({sel.d.audit.length})</summary><ul className="mt-2 space-y-1 text-xs text-muted">{sel.d.audit.map((e, i) => <li key={i}>{new Date(e.at).toLocaleString()} · {e.actor} · {e.action} {e.detail ? JSON.stringify(e.detail) : ""}</li>)}</ul></details>
    </div>
  );
}

function MatchPanel({ m, busy, act, role, open }: { m: Record<string, any>; busy: boolean; act: (id: string, a: string) => void; role: string; open: (k: "seller" | "buyer", id: string) => void }) {
  const x = m.match;
  return (
    <div className="space-y-4 rounded-2xl border border-line bg-white p-5 text-sm">
      <H>Match · score {x.score} · {x.status}</H>
      <p>Property <button className="font-semibold underline" onClick={() => open("seller", x.propertyId)}>{m.property?.reference}</button> ({m.property?.parcel?.district}, {m.property?.parcel?.region}) ↔ Buyer <button className="font-semibold underline" onClick={() => open("buyer", x.buyerId)}>{m.buyer?.reference}</button></p>
      <div><p className="font-semibold text-forest">Why (deterministic filters)</p><ul className="mt-1 list-disc pl-5">{x.reasons.map((r: string) => <li key={r}>{r}</li>)}</ul></div>
      {x.blockers.length > 0 && <div><p className="font-semibold text-[#a2402b]">Open issues</p><ul className="mt-1 list-disc pl-5">{x.blockers.map((r: string) => <li key={r}>{r}</li>)}</ul></div>}
      {x.fx && <p className="text-xs text-muted">FX used: {x.fx.usdToGhs} GHS/USD ({x.fx.source}{x.fx.date ? `, ${x.fx.date}` : ""}) at {new Date(x.fx.usedAt).toLocaleString()}</p>}
      <p className="text-xs text-muted">Seller authorisation: {m.authorization && !m.authorization.revokedAt ? `recorded ${new Date(m.authorization.createdAt).toLocaleDateString()} (share details: ${m.authorization.shareDetailsWithMatchedBuyers})` : "none / revoked"}</p>
      <div className="flex flex-wrap gap-2">
        <button className={chip} disabled={busy || !["suggested"].includes(x.status) || role === "legal_reviewer"} onClick={() => act(x.id, "review")}>Mark reviewed</button>
        <button className={chip} disabled={busy || !["suggested", "reviewed"].includes(x.status) || role === "legal_reviewer"} onClick={() => act(x.id, "reject")}>Reject</button>
        <button className="btn-forest !min-h-10 !py-2 text-sm" disabled={busy || x.status !== "reviewed" || role !== "admin"} onClick={() => act(x.id, "approve_introduction")}>Approve introduction</button>
      </div>
      <p className="text-xs text-muted">Approval does not message anyone. Staff make the introduction personally, sharing only what the seller authorised.</p>
    </div>
  );
}

const Row = ({ k, v }: { k: string; v: string }) => <div><dt className="text-xs uppercase tracking-wider text-muted">{k}</dt><dd className="break-words">{v}</dd></div>;
void currencies;
