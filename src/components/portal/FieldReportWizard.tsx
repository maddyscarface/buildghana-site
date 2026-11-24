"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SAFETY_CHECKLIST, SAFETY_RULE, STAGES, shotList } from "@/lib/transparency/checklists";
import type { Trade } from "@/lib/transparency/types";

type Ms = { id: string; title: string; phase: number; trade: Trade };
type Draft = { summary: string; workReported: string; quantities: { item: string; qty: number | string; unit: string }[]; crewCount: number | string | null; materials: string; weather: string; siteAccess: string; issues: string; safetyIssues: string; nextSteps: string };
type Item = { key: string; id?: string; file?: File; name: string; stage: string; caption: string; size: number; received: number; state: "queued" | "uploading" | "paused" | "done" | "error" | "needs_file"; error?: string; sha?: string; preview?: string };
type Existing = { id: string; status: string; correction?: string; milestoneId: string; draft: Draft; media: { id: string; stage: string; caption: string; sizeBytes: number; receivedBytes: number; uploadState: string; mime: string }[] };

const emptyDraft: Draft = { summary: "", workReported: "", quantities: [], crewCount: "", materials: "", weather: "", siteAccess: "", issues: "", safetyIssues: "", nextSteps: "" };
const uuid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const mb = (n: number) => `${(n / 1024 / 1024).toFixed(n > 1024 * 1024 ? 1 : 2)} MB`;

async function api(path: string, init: RequestInit & { json?: unknown } = {}) {
  const r = await fetch(path, { ...init, headers: { ...(init.json !== undefined ? { "Content-Type": "application/json" } : {}), ...(init.headers || {}) }, body: init.json !== undefined ? JSON.stringify(init.json) : init.body });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || `Request failed (${r.status})`) as Error & { status?: number }; e.status = r.status; throw e; }
  return j;
}

export function FieldReportWizard({ project, milestones, attestation, existing }: { project: { id: string; code: string; name: string }; milestones: Ms[]; attestation: string; existing?: Existing }) {
  const [step, setStep] = useState(0);
  const [safety, setSafety] = useState<boolean[]>(SAFETY_CHECKLIST.map(() => false));
  const [milestoneId, setMilestoneId] = useState(existing?.milestoneId ?? "");
  const [confirmProject, setConfirmProject] = useState(!!existing);
  const [reportId, setReportId] = useState(existing?.id ?? "");
  const [draft, setDraft] = useState<Draft>(existing?.draft ?? emptyDraft);
  const [items, setItems] = useState<Item[]>(() => (existing?.media ?? []).map((m) => ({ key: m.id, id: m.id, name: m.caption || m.stage, stage: m.stage, caption: m.caption, size: m.sizeBytes, received: m.receivedBytes, state: m.uploadState === "complete" ? "done" : "needs_file" })));
  const [stage, setStage] = useState("overview");
  const [caption, setCaption] = useState("");
  const [online, setOnline] = useState(true);
  const [simulateDrop, setSimulateDrop] = useState(false);
  const [saved, setSaved] = useState("");
  const [error, setError] = useState("");
  const [flags, setFlags] = useState<string[]>([]);
  const [attest, setAttest] = useState(false);
  const [done, setDone] = useState<null | { revision: number }>(null);
  const [busy, setBusy] = useState(false);
  const itemsRef = useRef(items); itemsRef.current = items;
  const dropOnce = useRef(false);
  const submitKey = useRef(uuid());
  const ms = milestones.find((m) => m.id === milestoneId);
  const localKey = reportId ? `bg_field_draft:${reportId}` : "";

  useEffect(() => { setOnline(navigator.onLine); const on = () => setOnline(true), off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, []);
  // Local text-only draft copy (no media, no tokens) so notes survive a reload or a dropped connection.
  useEffect(() => { if (!localKey) return; try { const raw = localStorage.getItem(localKey); if (raw && !existing?.draft.summary) setDraft({ ...emptyDraft, ...JSON.parse(raw) }); } catch { /* ignore */ } }, [localKey, existing?.draft.summary]);

  const update = (id: string, patch: Partial<Item>) => setItems((xs) => xs.map((x) => (x.key === id ? { ...x, ...patch } : x)));

  const saveDraft = useCallback(async (d: Draft) => {
    if (!reportId) return;
    try { localStorage.setItem(`bg_field_draft:${reportId}`, JSON.stringify(d)); } catch { /* storage full or disabled */ }
    if (!navigator.onLine) { setSaved("Saved on this phone — will sync when you're back online"); return; }
    try {
      await api(`/api/field/reports/${reportId}`, { method: "PATCH", json: { ...d, crewCount: d.crewCount === "" ? null : d.crewCount, quantities: d.quantities.map((q) => ({ ...q, qty: Number(q.qty) })) } });
      setSaved(`Draft saved ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`);
    } catch (e) { setSaved(""); setError((e as Error).message); }
  }, [reportId]);

  useEffect(() => { if (!reportId || step !== 3) return; const t = setTimeout(() => void saveDraft(draft), 1200); return () => clearTimeout(t); }, [draft, reportId, step, saveDraft]);
  useEffect(() => { if (online && reportId) void saveDraft(draft); }, [online]); // eslint-disable-line react-hooks/exhaustive-deps

  async function start() {
    setError(""); setBusy(true);
    try {
      if (!reportId) {
        const key = `bg_field_create:${project.id}:${milestoneId}`;
        let idk = sessionStorage.getItem(key); if (!idk) { idk = uuid(); sessionStorage.setItem(key, idk); }
        const j = await api(`/api/field/projects/${project.id}/reports`, { method: "POST", json: { milestoneId, confirmProjectCode: project.code, idempotencyKey: idk } });
        setReportId(j.report.id);
        sessionStorage.removeItem(key);
        history.replaceState(null, "", `?report=${j.report.id}`);
      }
      setStep(2);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  async function upload(key: string) {
    const it = itemsRef.current.find((x) => x.key === key);
    if (!it?.file || !reportId) return;
    const file = it.file;
    update(key, { state: "uploading", error: undefined });
    try {
      let id = it.id, chunk = 256 * 1024;
      if (!id) {
        const j = await api(`/api/field/reports/${reportId}/media/init`, { method: "POST", json: { stage: it.stage, caption: it.caption, sizeBytes: file.size, mime: file.type || "application/octet-stream", deviceCapturedAt: file.lastModified ? new Date(file.lastModified).toISOString() : null, idempotencyKey: key } });
        id = j.media.id as string; chunk = j.chunkBytes; update(key, { id });
      }
      let offset = (await api(`/api/field/media/${id}`)).media.receivedBytes as number;
      let tries = 0;
      while (offset < file.size) {
        const slice = file.slice(offset, offset + chunk);
        try {
          if (simulateDrop && !dropOnce.current && offset > 0) { dropOnce.current = true; throw new TypeError("Simulated dropped connection"); }
          const j = await api(`/api/field/media/${id}/chunk?offset=${offset}`, { method: "PUT", body: slice, headers: { "Content-Type": "application/octet-stream" } });
          offset = j.receivedBytes; tries = 0;
          update(key, { received: offset });
        } catch (e) {
          if ((e as Error & { status?: number }).status && (e as Error & { status?: number }).status! < 500) throw e;
          tries += 1;
          if (tries > 3 || (e as Error).message.startsWith("Simulated")) { update(key, { state: "paused", error: "Connection lost — upload paused. Your progress is saved on the server." }); return; }
          await sleep(1000 * tries * tries);
          offset = (await api(`/api/field/media/${id}`)).media.receivedBytes;
        }
      }
      const c = await api(`/api/field/reports/${reportId}/media/complete`, { method: "POST", json: { mediaId: id } });
      update(key, { state: "done", received: file.size, sha: c.media.sha256 });
    } catch (e) { update(key, { state: "error", error: (e as Error).message }); }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const add: Item[] = [...list].slice(0, 12).map((f) => ({ key: uuid(), file: f, name: f.name, stage, caption: caption || STAGES.find((s) => s.value === stage)!.label, size: f.size, received: 0, state: "queued", preview: f.type.startsWith("image/") ? URL.createObjectURL(f) : undefined }));
    setItems((xs) => [...xs, ...add]);
    setCaption("");
    setTimeout(() => add.forEach((a) => void upload(a.key)), 0);
  }

  function reattach(key: string, list: FileList | null) {
    const f = list?.[0]; const it = itemsRef.current.find((x) => x.key === key);
    if (!f || !it) return;
    if (f.size !== it.size) { update(key, { error: "That's a different file (size doesn't match). Pick the original or remove this item." }); return; }
    update(key, { file: f, state: "queued" });
    setTimeout(() => void upload(key), 0);
  }

  async function remove(key: string) {
    const it = itemsRef.current.find((x) => x.key === key);
    if (it?.id) { try { await api(`/api/field/media/${it.id}`, { method: "DELETE" }); } catch (e) { setError((e as Error).message); return; } }
    setItems((xs) => xs.filter((x) => x.key !== key));
  }

  async function toReview() {
    await saveDraft(draft);
    try { const j = await api(`/api/field/reports/${reportId}`); setFlags(j.flags || []); } catch { /* flags are advisory */ }
    setStep(4);
  }

  async function submit() {
    setError(""); setBusy(true);
    try {
      await saveDraft(draft);
      const fresh = await api(`/api/field/reports/${reportId}`);
      const j = await api(`/api/field/reports/${reportId}/submit`, { method: "POST", json: { attestation: attest, idempotencyKey: submitKey.current, version: fresh.report.version } });
      try { localStorage.removeItem(`bg_field_draft:${reportId}`); } catch { /* ignore */ }
      setDone({ revision: j.report.revision });
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }

  const uploading = items.some((i) => i.state === "uploading" || i.state === "queued");
  const doneCount = items.filter((i) => i.state === "done").length;
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setDraft((d) => ({ ...d, [k]: v }));
  const steps = ["Safety", "Project", "Evidence", "Notes", "Submit"];

  if (done) return (
    <div className="rounded-[20px] bg-white p-6 text-center shadow-sm">
      <p className="font-display text-2xl text-forest">Report submitted</p>
      <p className="mt-2 text-sm text-muted">Revision {done.revision} is now in the office review queue. It is <strong>field submitted</strong> — not reviewed and not verified. The owner sees it only after the office publishes it.</p>
      <div className="mt-5 flex flex-col gap-2"><a href="/field/projects" className="btn-forest">Back to projects</a><a href="/field/drafts" className="btn-ghost-dark">Drafts & corrections</a></div>
    </div>
  );

  return (
    <div className="space-y-4">
      <ol className="flex gap-1" aria-label="Progress">{steps.map((s, i) => <li key={s} aria-current={i === step ? "step" : undefined} className={`flex-1 rounded-full py-1 text-center text-[11px] font-semibold ${i === step ? "bg-forest text-gold" : i < step ? "bg-forest/15 text-forest" : "bg-ivory-2 text-muted"}`}>{s}</li>)}</ol>
      <p role="status" className={`rounded-lg px-3 py-2 text-xs font-semibold ${online ? "bg-[#e5efe8] text-[#1f4a33]" : "bg-[#fbefd9] text-[#6b4a12]"}`}>{online ? "Online" : "Offline — notes are kept on this phone; uploads resume when you reconnect."}</p>
      {existing?.correction && <div className="rounded-xl border border-[#d9a093] bg-[#fdf3f0] p-4 text-sm"><p className="font-semibold text-[#8a2f1d]">Returned for correction</p><p className="mt-1">{existing.correction}</p><p className="mt-1 text-xs text-muted">Your earlier revision is preserved. Submitting creates a new revision.</p></div>}
      {error && <p role="alert" className="rounded-lg bg-[#f7e4df] px-3 py-2 text-sm text-[#8a2f1d]">{error}</p>}

      {step === 0 && (
        <section className="rounded-[20px] bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl text-forest">Before you take any photos</h2>
          <p className="mt-2 rounded-lg bg-[#fbefd9] p-3 text-sm font-semibold text-[#6b4a12]">{SAFETY_RULE}</p>
          <div className="mt-4 space-y-3">{SAFETY_CHECKLIST.map((t, i) => (
            <label key={i} className="flex min-h-11 gap-3 text-[15px]"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#12291f]" checked={safety[i]} onChange={(e) => setSafety((s) => s.map((x, k) => (k === i ? e.target.checked : x)))} /><span>{t}</span></label>
          ))}</div>
          <button className="btn-forest mt-5 w-full disabled:opacity-50" disabled={!safety.every(Boolean)} onClick={() => setStep(existing ? 2 : 1)}>I&apos;m in a safe position — continue</button>
        </section>
      )}

      {step === 1 && (
        <section className="rounded-[20px] bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl text-forest">Which work package?</h2>
          <fieldset className="mt-3 space-y-2"><legend className="sr-only">Milestone</legend>{milestones.map((m) => (
            <label key={m.id} className={`flex min-h-12 items-center gap-3 rounded-xl border px-3 py-2 text-[15px] ${milestoneId === m.id ? "border-forest bg-forest/5" : "border-line"}`}><input type="radio" name="ms" className="h-5 w-5 accent-[#12291f]" checked={milestoneId === m.id} onChange={() => setMilestoneId(m.id)} />{m.phase}. {m.title}</label>
          ))}</fieldset>
          <label className="mt-4 flex min-h-11 gap-3 rounded-xl bg-ivory p-3 text-[15px]"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#12291f]" checked={confirmProject} onChange={(e) => setConfirmProject(e.target.checked)} /><span>I am reporting for <strong>{project.name}</strong> ({project.code}). Evidence is tied to this project and can&apos;t be moved later.</span></label>
          <button className="btn-forest mt-5 w-full disabled:opacity-50" disabled={!milestoneId || !confirmProject || busy} onClick={start}>{busy ? "Creating draft…" : "Start report"}</button>
        </section>
      )}

      {step === 2 && (
        <section className="rounded-[20px] bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl text-forest">Photos &amp; video</h2>
          {ms && <div className="mt-2 rounded-xl bg-ivory p-3 text-sm"><p className="font-semibold text-forest">Suggested shots — {shotList[ms.trade].phase}</p><ul className="mt-1 list-disc pl-5">{shotList[ms.trade].shots.map((s) => <li key={s}>{s}</li>)}</ul>{shotList[ms.trade].holdPoint && <p className="mt-2 text-xs font-semibold text-[#6b4a12]">Hold point: {shotList[ms.trade].holdPoint} Photos don&apos;t replace it.</p>}<p className="mt-2 text-xs text-muted">At least one overview plus close-ups. Skip any shot you can&apos;t take safely.</p></div>}
          <div className="mt-4 grid grid-cols-5 gap-1.5" role="radiogroup" aria-label="Shot type">{STAGES.map((s) => <button key={s.value} type="button" role="radio" aria-checked={stage === s.value} onClick={() => setStage(s.value)} className={`min-h-11 rounded-lg text-xs font-semibold ${stage === s.value ? "bg-forest text-gold" : "bg-ivory-2 text-forest"}`}>{s.label}</button>)}</div>
          <label htmlFor="cap" className="field-label mt-3">Caption (optional)</label>
          <input id="cap" className="field-input" value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="e.g. North wall corner" />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <label className="btn-gold cursor-pointer text-center">Take photo / video<input type="file" accept="image/*,video/*" capture="environment" className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /></label>
            <label className="btn-ghost-dark cursor-pointer text-center">Choose files<input type="file" accept="image/jpeg,image/png,image/webp,image/heic,video/mp4,video/quicktime,video/webm" multiple className="sr-only" onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }} /></label>
          </div>
          <p className="mt-2 text-xs text-muted">Photos up to 12 MB, videos up to 40 MB in this demo. Uploads go in small pieces and resume after a dropped connection. Location is not collected.</p>
          <label className="mt-3 flex min-h-11 items-center gap-2 text-xs text-muted"><input type="checkbox" className="h-4 w-4" checked={simulateDrop} onChange={(e) => { setSimulateDrop(e.target.checked); dropOnce.current = false; }} />Demo: simulate a dropped connection during the next upload</label>
          <ul className="mt-3 space-y-2">{items.map((it) => (
            <li key={it.key} className="rounded-xl border border-line p-3 text-sm">
              <div className="flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {it.preview ? <img src={it.preview} alt="" className="h-12 w-12 shrink-0 rounded object-cover" /> : <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded bg-ivory-2 text-[10px] uppercase text-muted">{it.stage}</span>}
                <div className="min-w-0 flex-1"><p className="truncate font-semibold text-forest">{it.caption} <span className="font-normal text-muted">· {it.stage}</span></p><p className="text-xs text-muted">{mb(it.received)} / {mb(it.size)} · {it.state === "done" ? `Uploaded${it.sha ? ` · fingerprint ${it.sha.slice(0, 8)}…` : ""}` : it.state === "needs_file" ? "Partly uploaded — re-select the file to resume" : it.state}</p>
                  <div className="mt-1 h-1.5 overflow-hidden rounded bg-ivory-2" role="progressbar" aria-label={`Upload ${it.caption}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((it.received / Math.max(1, it.size)) * 100)}><div className="h-full bg-forest" style={{ width: `${(it.received / Math.max(1, it.size)) * 100}%` }} /></div>
                </div>
              </div>
              {it.error && <p className="mt-2 text-xs text-[#8a2f1d]">{it.error}</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {(it.state === "paused" || it.state === "error") && it.file && <button type="button" className="btn-forest !min-h-11 !px-4 !text-sm" onClick={() => void upload(it.key)}>Resume upload</button>}
                {it.state === "needs_file" && <label className="btn-forest !min-h-11 !px-4 !text-sm cursor-pointer">Re-select file<input type="file" className="sr-only" onChange={(e) => reattach(it.key, e.target.files)} /></label>}
                {it.state !== "uploading" && <button type="button" className="btn-ghost-dark !min-h-11 !px-4 !text-sm" onClick={() => void remove(it.key)}>Remove</button>}
              </div>
            </li>
          ))}</ul>
          <div className="mt-4 grid grid-cols-2 gap-2"><button className="btn-ghost-dark" onClick={() => setStep(existing ? 0 : 1)}>Back</button><button className="btn-forest disabled:opacity-50" disabled={!doneCount || uploading} onClick={() => setStep(3)}>Next: notes</button></div>
        </section>
      )}

      {step === 3 && (
        <section className="space-y-3 rounded-[20px] bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl text-forest">What was done today</h2>
          <p className="text-xs text-muted">{saved || "Notes save automatically."}</p>
          {([["summary", "Short summary *", "input"], ["workReported", "Work reported *", "textarea"], ["materials", "Material deliveries / tickets", "textarea"], ["weather", "Weather", "input"], ["siteAccess", "Site access", "input"], ["issues", "Issues / delays", "textarea"], ["safetyIssues", "Safety or quality concerns", "textarea"], ["nextSteps", "Next-day plan", "textarea"]] as const).map(([k, l, t]) => (
            <div key={k}><label htmlFor={`f-${k}`} className="field-label">{l}</label>{t === "textarea" ? <textarea id={`f-${k}`} rows={2} className="field-input" value={draft[k] as string} onChange={(e) => set(k, e.target.value)} /> : <input id={`f-${k}`} className="field-input" value={draft[k] as string} onChange={(e) => set(k, e.target.value)} />}</div>
          ))}
          <div><label htmlFor="f-crew" className="field-label">Crew on site (number only — no names or IDs)</label><input id="f-crew" inputMode="numeric" className="field-input" value={draft.crewCount ?? ""} onChange={(e) => set("crewCount", e.target.value.replace(/\D/g, ""))} /></div>
          <fieldset><legend className="field-label">Quantities (field reported — not independently measured)</legend>
            {draft.quantities.map((q, i) => (
              <div key={i} className="mb-2 grid grid-cols-[1fr_72px_64px_auto] gap-1.5">
                <input aria-label="Item" className="field-input" value={q.item} onChange={(e) => set("quantities", draft.quantities.map((x, k) => (k === i ? { ...x, item: e.target.value } : x)))} placeholder="Blockwork" />
                <input aria-label="Quantity" inputMode="decimal" className="field-input" value={q.qty} onChange={(e) => set("quantities", draft.quantities.map((x, k) => (k === i ? { ...x, qty: e.target.value } : x)))} />
                <input aria-label="Unit" className="field-input" value={q.unit} onChange={(e) => set("quantities", draft.quantities.map((x, k) => (k === i ? { ...x, unit: e.target.value } : x)))} placeholder="m²" />
                <button type="button" aria-label="Remove quantity" className="min-h-11 px-2 text-muted" onClick={() => set("quantities", draft.quantities.filter((_, k) => k !== i))}>✕</button>
              </div>
            ))}
            {draft.quantities.length < 5 && <button type="button" className="text-sm font-semibold text-forest underline" onClick={() => set("quantities", [...draft.quantities, { item: "", qty: "", unit: "" }])}>+ Add quantity</button>}
          </fieldset>
          <div className="grid grid-cols-2 gap-2 pt-2"><button className="btn-ghost-dark" onClick={() => setStep(2)}>Back</button><button className="btn-forest disabled:opacity-50" disabled={!draft.summary || !draft.workReported} onClick={toReview}>Review</button></div>
        </section>
      )}

      {step === 4 && (
        <section className="space-y-3 rounded-[20px] bg-white p-5 shadow-sm">
          <h2 className="font-display text-xl text-forest">Check and submit</h2>
          <dl className="space-y-1 text-sm"><div><dt className="inline font-semibold">Project: </dt><dd className="inline">{project.name} ({project.code})</dd></div><div><dt className="inline font-semibold">Work package: </dt><dd className="inline">{ms?.title}</dd></div><div><dt className="inline font-semibold">Evidence: </dt><dd className="inline">{doneCount} file(s)</dd></div><div><dt className="inline font-semibold">Summary: </dt><dd className="inline">{draft.summary}</dd></div></dl>
          {flags.length > 0 && <div className="rounded-xl bg-[#fbefd9] p-3 text-sm text-[#6b4a12]"><p className="font-semibold">For the reviewer (advisory, not a judgement):</p><ul className="list-disc pl-5">{flags.map((f) => <li key={f}>{f}</li>)}</ul></div>}
          <label className="flex min-h-11 gap-3 rounded-xl bg-ivory p-3 text-[15px]"><input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#12291f]" checked={attest} onChange={(e) => setAttest(e.target.checked)} /><span>{attestation}</span></label>
          <div className="grid grid-cols-2 gap-2"><button className="btn-ghost-dark" onClick={() => setStep(3)}>Back</button><button className="btn-gold disabled:opacity-50" disabled={!attest || busy || !online} onClick={submit}>{busy ? "Submitting…" : "Submit report"}</button></div>
          {!online && <p className="text-xs text-muted">You&apos;re offline. Your draft is safe; submit when you reconnect.</p>}
        </section>
      )}
    </div>
  );
}
