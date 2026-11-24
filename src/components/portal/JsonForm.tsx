"use client";

import { useRouter } from "next/navigation";
import { useId, useState } from "react";
import { flash } from "./FlashHost";

export type Field =
  | { name: string; label: string; type: "text" | "textarea" | "date" | "number"; required?: boolean; help?: string; placeholder?: string; value?: string }
  | { name: string; label: string; type: "money"; required?: boolean; help?: string; value?: string }
  | { name: string; label: string; type: "select"; options: { value: string; label: string }[]; required?: boolean; help?: string; value?: string }
  | { name: string; label: string; type: "checks"; options: { value: string; label: string }[]; help?: string; value?: string[] };

/**
 * Small JSON form for portal/office actions. Posts same-origin with the session cookie; the server re-checks
 * permission and state on every call. `money` fields take major units (e.g. 1234.50) and send integer minor units.
 */
export function JsonForm({ endpoint, method = "POST", fields, extra = {}, actions, actionField = "action", submitLabel = "Save", done = "Saved.", compact = false }: {
  endpoint: string; method?: string; fields: Field[]; extra?: Record<string, unknown>;
  actions?: { value: string; label: string; tone?: "primary" | "ghost" | "danger" }[]; actionField?: string; submitLabel?: string; done?: string; compact?: boolean;
}) {
  const router = useRouter();
  const uid = useId();
  const [vals, setVals] = useState<Record<string, string | string[]>>(() => Object.fromEntries(fields.map((f) => [f.name, f.type === "checks" ? (f.value ?? []) : f.type === "select" ? (f.value ?? f.options[0]?.value ?? "") : (f.value ?? "")])));
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);
  async function send(action?: string) {
    setBusy(true); setMsg(null);
    const body: Record<string, unknown> = { ...extra };
    for (const f of fields) {
      const v = vals[f.name];
      if (f.type === "money") body[f.name] = Math.round(Number(String(v).replace(/,/g, "")) * 100);
      else if (f.type === "number") body[f.name] = v === "" ? null : Number(v);
      else body[f.name] = v;
    }
    if (action) body[actionField] = action;
    try {
      const r = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ ok: false, t: j.error || `Failed (${r.status})` }); return; }
      setMsg({ ok: true, t: done });
      flash(done);
      router.refresh();
    } catch { setMsg({ ok: false, t: "Network problem — nothing was saved. Try again." }); } finally { setBusy(false); }
  }
  const set = (n: string, v: string | string[]) => setVals((x) => ({ ...x, [n]: v }));
  return (
    <form className={compact ? "space-y-3" : "space-y-4"} onSubmit={(e) => { e.preventDefault(); void send(); }} noValidate>
      {fields.map((f) => {
        const id = `${uid}-${f.name}`;
        const help = "help" in f && f.help ? <p id={`${id}-h`} className="mt-1 text-xs text-muted">{f.help}</p> : null;
        if (f.type === "checks") return (
          <fieldset key={f.name}><legend className="field-label">{f.label}</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">{f.options.map((o) => {
              const arr = (vals[f.name] as string[]) || [];
              return <label key={o.value} className="inline-flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-[#12291f]" checked={arr.includes(o.value)} onChange={(e) => set(f.name, e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value))} />{o.label}</label>;
            })}</div>{help}
          </fieldset>
        );
        return (
          <div key={f.name}>
            <label htmlFor={id} className="field-label">{f.label}{"required" in f && f.required ? " *" : ""}</label>
            {f.type === "textarea" ? <textarea id={id} rows={3} className="field-input" value={vals[f.name] as string} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} aria-describedby={help ? `${id}-h` : undefined} />
              : f.type === "select" ? <select id={id} className="field-input" value={vals[f.name] as string} onChange={(e) => set(f.name, e.target.value)}>{f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                : <input id={id} className="field-input" type={f.type === "money" ? "text" : f.type} inputMode={f.type === "money" || f.type === "number" ? "decimal" : undefined} value={vals[f.name] as string} onChange={(e) => set(f.name, e.target.value)} placeholder={"placeholder" in f ? f.placeholder : undefined} aria-describedby={help ? `${id}-h` : undefined} />}
            {help}
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2.5">
        {actions ? actions.map((a) => (
          <button key={a.value} type="button" disabled={busy} onClick={() => void send(a.value)} className={`${a.tone === "ghost" ? "btn-ghost-dark" : a.tone === "danger" ? "btn border border-[#a2402b] text-[#8a2f1d] hover:bg-[#f7e4df]" : "btn-forest"} !min-h-11 disabled:opacity-60`}>{a.label}</button>
        )) : <button type="submit" disabled={busy} className="btn-forest !min-h-11 disabled:opacity-60">{busy ? "Saving…" : submitLabel}</button>}
      </div>
      <p aria-live="polite" className={`text-sm ${msg?.ok ? "text-[#1f4a33]" : "text-[#a2402b]"}`}>{msg?.t}</p>
    </form>
  );
}
