"use client";

import { useState } from "react";

export function LoginForm({ personas, next }: { personas: { userId: string; label: string }[]; next: string }) {
  const [code, setCode] = useState("");
  const [persona, setPersona] = useState(personas[0]?.userId ?? "");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const r = await fetch("/api/portal/session", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ code, persona }) });
      const j = await r.json();
      if (!r.ok) { setErr(j.error || "Sign-in failed"); return; }
      window.location.assign(next || j.next);
    } catch { setErr("Network problem. Check your connection and try again."); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      <div>
        <label htmlFor="persona" className="field-label">Demo persona</label>
        <select id="persona" value={persona} onChange={(e) => setPersona(e.target.value)} className="field-input">
          {personas.map((p) => <option key={p.userId} value={p.userId}>{p.label}</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="code" className="field-label">Demo access code</label>
        <input id="code" type="password" autoComplete="current-password" value={code} onChange={(e) => setCode(e.target.value)} className="field-input" required aria-describedby="code-help" />
        <p id="code-help" className="mt-1.5 text-sm text-muted">Provided privately by BuildGhana for the staging demo.</p>
      </div>
      {err && <p role="alert" className="field-error">{err}</p>}
      <button type="submit" disabled={busy || !code} className="btn-forest w-full disabled:opacity-60">{busy ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}
