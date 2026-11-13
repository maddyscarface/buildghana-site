"use client";

import Script from "next/script";
import { useRef, useState } from "react";

const types = [
  { value: "withdrawal", label: "Withdraw my listing or inquiry" },
  { value: "deletion", label: "Delete my data" },
  { value: "access_revocation", label: "Stop sharing my details" },
  { value: "abuse_report", label: "Report misuse or a false listing" },
];

export function PrivacyRequestForm() {
  const [s, setS] = useState({ type: "withdrawal", email: "", reference: "", message: "", company_website: "" });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const formRef = useRef<HTMLFormElement>(null);
  const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [err, setErr] = useState<Record<string, string>>({});
  const submit = async (e: React.FormEvent) => {
    e.preventDefault(); setState("sending"); setErr({});
    const r = await fetch("/api/property/requests", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...s, turnstile_token: (formRef.current?.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value || undefined }) }).catch(() => null);
    const j = r ? await r.json().catch(() => ({})) : {};
    if (r?.ok && j.ok) setState("done"); else { setErr(j.fieldErrors || { _: j.error || "Something went wrong" }); setState("error"); }
  };
  if (state === "done") return <p role="status" className="rounded-xl bg-white p-5 text-[15px] text-forest">Thank you — your request has been logged for a person to action. We'll confirm by email.</p>;
  return (
    <form ref={formRef} onSubmit={submit} noValidate className="relative space-y-4 rounded-[22px] border border-line bg-white p-6 sm:p-7">
      <div aria-hidden className="absolute left-[-9999px]"><input tabIndex={-1} autoComplete="off" value={s.company_website} onChange={(e) => setS({ ...s, company_website: e.target.value })} /></div>
      <div>
        <label htmlFor="pr-type" className="field-label">Request</label>
        <select id="pr-type" className="field-input" value={s.type} onChange={(e) => setS({ ...s, type: e.target.value })}>{types.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}</select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="pr-email" className="field-label">Email used on your inquiry</label>
          <input id="pr-email" type="email" autoComplete="email" className="field-input" value={s.email} onChange={(e) => setS({ ...s, email: e.target.value })} aria-invalid={Boolean(err.email)} />
          {err.email && <p className="field-error">{err.email}</p>}
        </div>
        <div>
          <label htmlFor="pr-ref" className="field-label">Reference (optional)</label>
          <input id="pr-ref" className="field-input" placeholder="S-1A2B3C" value={s.reference} onChange={(e) => setS({ ...s, reference: e.target.value })} />
        </div>
      </div>
      <div>
        <label htmlFor="pr-msg" className="field-label">Details</label>
        <textarea id="pr-msg" rows={3} className="field-input" value={s.message} onChange={(e) => setS({ ...s, message: e.target.value })} aria-invalid={Boolean(err.message)} />
        {err.message && <p className="field-error">{err.message}</p>}
      </div>
      {turnstileKey && <><Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer /><div className="cf-turnstile" data-sitekey={turnstileKey} data-theme="light" /></>}
      {err._ && <p role="alert" className="field-error">{err._}</p>}
      <button className="btn-forest w-full sm:w-auto" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send request"}</button>
    </form>
  );
}
