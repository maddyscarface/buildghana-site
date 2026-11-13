"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Option } from "@/lib/lead/options";
import { buyerSchema, sellerSchema } from "@/lib/property/schema";
import { getAttribution } from "@/lib/client/attribution";
import { adsConsentGranted, safePropertyParams, track, trackOnce } from "@/lib/client/analytics";
import {
  areaUnits, buyerEligibility, buyerRoles, buyerTimelines, contactMethods, counselStatuses, currencies, encumbranceAnswers,
  financingStatuses, inspectionAvailability, intendedUses, negotiability, occupancyOptions, planningStatuses, propertyKinds,
  propertyRegions, propertyUses, representationRequests, residenceCountries, sellerDocumentInventory, sellerRoles,
  siteVisitPrefs, tenurePreferences, titleStatusSelfReport,
} from "@/config/property";
import { PropertyUploads } from "./PropertyUploads";

type Kind = "seller" | "buyer";
type Val = string | boolean | string[];
type Field = {
  name: string; label: string; type: "text" | "email" | "tel" | "number" | "select" | "radio" | "multi" | "textarea" | "check";
  options?: Option[]; hint?: string; optional?: boolean; half?: boolean; placeholder?: string; autoComplete?: string; inputMode?: "numeric" | "decimal" | "tel" | "email";
  /** Never written to the on-device draft (private location / disclosure fields). */
  noDraft?: boolean;
  show?: (d: Record<string, Val>) => boolean;
};
type Step = { title: string; intro?: string; fields: Field[] };

const contactStep: Step = {
  title: "You",
  intro: "Ghana-based and international owners and buyers are equally welcome. Use any phone number with its country code — Ghana numbers like 024 123 4567 are fine.",
  fields: [
    { name: "first_name", label: "First name", type: "text", half: true, autoComplete: "given-name" },
    { name: "last_name", label: "Last name", type: "text", half: true, autoComplete: "family-name" },
    { name: "email", label: "Email", type: "email", autoComplete: "email", inputMode: "email" },
    { name: "phone", label: "Phone (with country code)", type: "tel", half: true, autoComplete: "tel", inputMode: "tel", placeholder: "+233 24 123 4567" },
    { name: "whatsapp", label: "WhatsApp, if different", type: "tel", half: true, optional: true, inputMode: "tel", placeholder: "+44 7700 900123" },
    { name: "preferred_contact", label: "Best way to reach you", type: "radio", options: contactMethods },
    { name: "residence_country", label: "Where do you live?", type: "select", options: residenceCountries },
  ],
};

const sellerSteps: Step[] = [
  { ...contactStep, fields: [...contactStep.fields, { name: "seller_role", label: "Your relationship to the property", type: "select", options: sellerRoles }] },
  {
    title: "Location",
    intro: "Nothing is published by default. Exact location details stay private to authorised BuildGhana staff and counsel.",
    fields: [
      { name: "region", label: "Region", type: "select", options: propertyRegions, half: true },
      { name: "district", label: "District / municipality", type: "text", half: true, placeholder: "e.g. Ga East" },
      { name: "town", label: "Town or area", type: "text", placeholder: "e.g. Abokobi" },
      { name: "ghana_post_gps", label: "GhanaPost GPS address (optional, private)", type: "text", optional: true, noDraft: true, placeholder: "GA-183-8164", hint: "Helps counsel and surveyors find the parcel. Never shown publicly or sent to analytics." },
      { name: "location_notes", label: "Directions or landmarks (optional, private)", type: "textarea", optional: true, noDraft: true },
    ],
  },
  {
    title: "Property",
    fields: [
      { name: "property_kind", label: "What are you offering?", type: "select", options: propertyKinds },
      { name: "size_value", label: "Approximate size", type: "number", half: true, optional: true, inputMode: "decimal" },
      { name: "size_unit", label: "Unit", type: "select", options: areaUnits, half: true },
      { name: "property_use", label: "Current or permitted use", type: "select", options: propertyUses, half: true },
      { name: "occupancy", label: "Occupancy", type: "select", options: occupancyOptions, half: true },
      { name: "asking_price", label: "Asking price (optional)", type: "number", half: true, optional: true, inputMode: "decimal" },
      { name: "currency", label: "Currency", type: "select", options: currencies, half: true, optional: true },
      { name: "negotiability", label: "Price flexibility", type: "radio", options: negotiability },
    ],
  },
  {
    title: "Documents",
    intro: "Tell us what exists, as you understand it. We don't verify anything at this stage — Ghanaian counsel reviews title and tenure later, only if you proceed.",
    fields: [
      { name: "title_self_report", label: "Title / tenure documents you hold (self-reported)", type: "select", options: titleStatusSelfReport },
      { name: "planning_status", label: "Planning / permit status", type: "select", options: planningStatuses },
      { name: "encumbrance", label: "Any dispute, claim, mortgage or other encumbrance?", type: "radio", options: encumbranceAnswers },
      { name: "encumbrance_notes", label: "Briefly describe it", type: "textarea", noDraft: true, show: (d) => d.encumbrance === "yes" },
      { name: "document_inventory", label: "Documents that exist (optional)", type: "multi", options: sellerDocumentInventory, optional: true, hint: "Don't upload ID cards. You can add photos and documents privately after you submit." },
      { name: "inspection", label: "Availability for inspection", type: "select", options: inspectionAvailability },
      { name: "representation", label: "Representation", type: "radio", options: representationRequests },
      { name: "notes", label: "Anything else we should know? (optional)", type: "textarea", optional: true },
    ],
  },
];

const buyerSteps: Step[] = [
  { ...contactStep, fields: [...contactStep.fields,
    { name: "buyer_role", label: "Who is buying?", type: "select", options: buyerRoles },
    { name: "eligibility", label: "Citizenship / buyer status (self-reported)", type: "select", options: buyerEligibility, hint: "Used only to route you to the right legal advice. Land tenure rules differ for non-citizens — Ghanaian counsel confirms what applies to you." },
  ] },
  {
    title: "What you want",
    fields: [
      { name: "regions", label: "Regions you'd consider", type: "multi", options: propertyRegions },
      { name: "areas", label: "Preferred towns or neighbourhoods (optional)", type: "text", optional: true, placeholder: "e.g. Oyarifa, Kasoa, Ejisu" },
      { name: "property_kinds", label: "Property types", type: "multi", options: propertyKinds },
      { name: "property_use", label: "Intended use", type: "select", options: propertyUses, half: true },
      { name: "intended_use", label: "Purpose", type: "select", options: intendedUses, half: true },
      { name: "size_min", label: "Minimum size (optional)", type: "number", optional: true, half: true, inputMode: "decimal" },
      { name: "size_max", label: "Maximum size (optional)", type: "number", optional: true, half: true, inputMode: "decimal" },
      { name: "size_unit", label: "Size unit", type: "select", options: areaUnits },
    ],
  },
  {
    title: "Budget & timing",
    fields: [
      { name: "currency", label: "Currency", type: "radio", options: currencies },
      { name: "budget_min", label: "Minimum budget (optional)", type: "number", optional: true, half: true, inputMode: "decimal" },
      { name: "budget_max", label: "Maximum budget", type: "number", half: true, inputMode: "decimal" },
      { name: "timeline", label: "When do you hope to buy?", type: "select", options: buyerTimelines, half: true },
      { name: "financing", label: "Funding (optional)", type: "select", options: financingStatuses, optional: true, half: true },
      { name: "tenure", label: "Tenure preference", type: "select", options: tenurePreferences },
      { name: "site_visit", label: "Site visits", type: "select", options: siteVisitPrefs, half: true },
      { name: "counsel", label: "Ghanaian legal counsel", type: "select", options: counselStatuses, half: true },
      { name: "must_haves", label: "Must-haves (optional)", type: "textarea", optional: true, placeholder: "Road access, water, title type, distance to schools…" },
    ],
  },
];

const consentStep: Step = { title: "Confirm", fields: [] };

const initial = (kind: Kind): Record<string, Val> => ({
  first_name: "", last_name: "", email: "", phone: "", whatsapp: "", preferred_contact: "whatsapp", residence_country: "", language: "en",
  consent_contact: false, consent_marketing: false, company_website: "",
  ...(kind === "seller"
    ? { seller_role: "", region: "", district: "", town: "", ghana_post_gps: "", location_notes: "", property_kind: "", size_value: "", size_unit: "plots",
        property_use: "", occupancy: "", asking_price: "", currency: "", negotiability: "negotiable", title_self_report: "", planning_status: "",
        encumbrance: "", encumbrance_notes: "", document_inventory: [], inspection: "", representation: "undecided", notes: "" }
    : { buyer_role: "", eligibility: "", regions: [], areas: "", property_kinds: [], property_use: "", intended_use: "", size_min: "", size_max: "",
        size_unit: "plots", currency: "GHS", budget_min: "", budget_max: "", timeline: "", financing: "", tenure: "", site_visit: "", counsel: "", must_haves: "" }),
});

export function PropertyForm({ kind }: { kind: Kind }) {
  const router = useRouter();
  const steps = [...(kind === "seller" ? sellerSteps : buyerSteps), consentStep];
  const [step, setStep] = useState(0);
  const [d, setD] = useState<Record<string, Val>>(() => initial(kind));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [restored, setRestored] = useState(false);
  const [done, setDone] = useState<{ id: string; reference: string; token: string } | null>(null);
  const sid = useRef(""); const started = useRef(0);
  const formRef = useRef<HTMLFormElement>(null); const headRef = useRef<HTMLHeadingElement>(null);
  const draftKey = `bga_pp_draft_${kind}`;
  const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const privateFields = steps.flatMap((s) => s.fields).filter((f) => f.noDraft).map((f) => f.name);

  useEffect(() => {
    sid.current = crypto.randomUUID();
    try {
      const raw = localStorage.getItem(draftKey);
      if (raw) { const saved = JSON.parse(raw) as { d: Record<string, Val>; step: number }; setD((cur) => ({ ...cur, ...saved.d })); setStep(Math.min(saved.step || 0, steps.length - 1)); setRestored(true); }
    } catch { /* ignore */ }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Draft autosave on this device only (private location/disclosure fields excluded).
  useEffect(() => {
    if (done) return;
    const t = setTimeout(() => {
      try { const safe = { ...d }; for (const k of privateFields) delete safe[k]; delete safe.consent_contact; localStorage.setItem(draftKey, JSON.stringify({ d: safe, step, at: Date.now() })); } catch { /* ignore */ }
    }, 400);
    return () => clearTimeout(t);
  }, [d, step, done]); // eslint-disable-line react-hooks/exhaustive-deps

  const markStarted = useCallback(() => {
    if (started.current) return;
    started.current = Date.now();
    trackOnce(`pp_start_${kind}_${sid.current}`, "property_form_start", { form_id: `property-${kind}` });
  }, [kind]);

  const set = (name: string, v: Val) => { markStarted(); setD((c) => ({ ...c, [name]: v })); setErrors((e) => { const n = { ...e }; delete n[name]; return n; }); };

  const payload = () => {
    const nums = ["size_value", "asking_price", "size_min", "size_max", "budget_min", "budget_max"];
    const body: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(d)) body[k] = nums.includes(k) ? (v === "" ? null : Number(v)) : v;
    return {
      ...body, submission_id: sid.current, form_started_at: started.current || Date.now(), attribution: getAttribution(),
      page_url: window.location.href, ads_consent: adsConsentGranted(),
      turnstile_token: (formRef.current?.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value || undefined,
    };
  };

  const validate = (upTo: number) => {
    const schema = kind === "seller" ? sellerSchema : buyerSchema;
    const r = schema.safeParse(payload());
    if (r.success) return {};
    const names = new Set(steps.slice(0, upTo + 1).flatMap((s) => s.fields.map((f) => f.name)).concat(upTo === steps.length - 1 ? ["consent_contact"] : []));
    const out: Record<string, string> = {};
    for (const i of r.error.issues) { const k = String(i.path[0]); if (names.has(k)) out[k] ??= i.message; }
    return out;
  };

  const go = (dir: 1 | -1) => {
    if (dir === 1) {
      const e = validate(step);
      if (Object.keys(e).length) { setErrors(e); focusFirst(e); return; }
      track("form_step", { form_id: `property-${kind}`, step: step + 1 });
    }
    setStep((s) => Math.max(0, Math.min(steps.length - 1, s + dir)));
    requestAnimationFrame(() => { headRef.current?.focus(); formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); });
  };

  const focusFirst = (e: Record<string, string>) => {
    const first = Object.keys(e)[0];
    const s = steps.findIndex((st) => st.fields.some((f) => f.name === first));
    if (s >= 0 && s !== step) setStep(s);
    requestAnimationFrame(() => (document.getElementById(`pp-${first}`) as HTMLElement | null)?.focus());
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (step < steps.length - 1) return go(1);
    const e = validate(steps.length - 1);
    if (Object.keys(e).length) { setErrors(e); focusFirst(e); return; }
    setSubmitting(true); setServerError("");
    try {
      const res = await fetch(`/api/property/${kind}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || !j.ok) {
        if (j.fieldErrors) { setErrors(j.fieldErrors); focusFirst(j.fieldErrors); }
        setServerError(j.error || "Something went wrong. Please try again."); return;
      }
      try { localStorage.removeItem(draftKey); } catch { /* ignore */ }
      const residence = d.residence_country === "GH" ? "ghana" : "abroad";
      const region = kind === "seller" ? String(d.region) : (d.regions as string[])[0];
      const type = kind === "seller" ? String(d.property_kind) : (d.property_kinds as string[]).join(",");
      trackOnce(`pp_submit_${j.id}`, kind === "seller" ? "seller_inquiry_submitted" : "buyer_inquiry_submitted",
        safePropertyParams({ form_id: `property-${kind}`, inquiry_role: kind, region, property_type: type, residence }), sid.current);
      if (kind === "seller" && j.token) setDone({ id: j.id, reference: j.reference, token: j.token });
      else router.push(`/property/thank-you?type=${kind}&ref=${encodeURIComponent(j.reference || "")}`);
    } catch { setServerError("Network error. Your answers are saved on this device — please try again."); }
    finally { setSubmitting(false); }
  };

  if (done) {
    return (
      <div className="rounded-[var(--radius-card)] border border-line bg-white p-6 sm:p-8" aria-live="polite">
        <p className="eyebrow">Received · Reference {done.reference}</p>
        <h2 className="mt-3 font-display text-[1.9rem] leading-tight text-forest">Thank you. Your property details are private.</h2>
        <p className="mt-3 text-[15.5px] leading-relaxed text-ink/80">Nothing is published. If you'd like, add photos, a short video or documents now — they go to private storage that only authorised BuildGhana staff and counsel can open. You can also skip this; we'll ask for what's needed.</p>
        <PropertyUploads id={done.id} token={done.token} />
        <button type="button" className="btn-forest mt-8 w-full sm:w-auto" onClick={() => router.push(`/property/thank-you?type=seller&ref=${encodeURIComponent(done.reference)}`)}>Finish</button>
      </div>
    );
  }

  const cur = steps[step];
  return (
    <form ref={formRef} onSubmit={submit} noValidate className="rounded-[var(--radius-card)] border border-line bg-white p-5 shadow-[0_30px_60px_-40px_rgba(18,41,31,0.35)] sm:p-8" aria-describedby="pp-progress">
      {turnstileKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <ol id="pp-progress" className="flex flex-wrap gap-x-4 gap-y-2 text-[12.5px] font-semibold uppercase tracking-[0.12em]" aria-label="Form progress">
        {steps.map((s, i) => (
          <li key={s.title} className={i === step ? "text-forest" : i < step ? "text-gold-2" : "text-muted/70"} aria-current={i === step ? "step" : undefined}>
            <span className="num-serif mr-1">{i + 1}</span>{s.title}
          </li>
        ))}
      </ol>
      <div className="mt-3 h-1 rounded-full bg-ivory-2"><div className="h-1 rounded-full bg-gold transition-all" style={{ width: `${((step + 1) / steps.length) * 100}%` }} /></div>
      {restored && step === 0 && <p className="mt-4 rounded-xl bg-ivory-2/70 px-4 py-3 text-sm text-ink/80">We restored your saved draft from this device. <button type="button" className="font-semibold text-forest underline" onClick={() => { try { localStorage.removeItem(draftKey); } catch {} setD(initial(kind)); setRestored(false); }}>Start over</button></p>}

      <h2 ref={headRef} tabIndex={-1} className="mt-6 font-display text-[1.7rem] leading-tight text-forest outline-none sm:text-[2rem]">{cur.title === "Confirm" ? "Check and send" : cur.title}</h2>
      {cur.intro && <p className="mt-2 text-[15px] leading-relaxed text-muted">{cur.intro}</p>}

      {/* honeypot */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden"><label>Company website<input tabIndex={-1} autoComplete="off" value={String(d.company_website)} onChange={(e) => set("company_website", e.target.value)} /></label></div>

      <div className="mt-6 grid gap-5 sm:grid-cols-2">
        {cur.fields.filter((f) => !f.show || f.show(d)).map((f) => <FieldView key={f.name} f={f} v={d[f.name]} err={errors[f.name]} set={set} />)}
      </div>

      {cur.title === "Confirm" && (
        <div className="space-y-4">
          <ul className="space-y-2 rounded-xl bg-ivory-2/60 p-4 text-[14.5px] leading-relaxed text-ink/85">
            <li>• This is an inquiry, not an offer, listing agreement or contract. Nothing is published.</li>
            <li>• {kind === "seller" ? "We never share your property or contact details with a buyer until you have authorised it and we have approved that specific introduction." : "We only share a seller's details with you after the seller authorises it and we approve that introduction."}</li>
            <li>• BuildGhana does not verify title or guarantee ownership. Title and tenure are checked by Ghanaian counsel, only when instructed.</li>
            <li>• No payment is needed to send this inquiry. We do not collect deposits or hold funds.</li>
          </ul>
          <Check id="pp-consent_contact" checked={Boolean(d.consent_contact)} onChange={(v) => set("consent_contact", v)} err={errors.consent_contact}>
            I agree that BuildGhana may contact me about this inquiry by my chosen method and store my details as described in the <Link href="/privacy" className="link-underline">privacy notice</Link>.
          </Check>
          <Check id="pp-consent_marketing" checked={Boolean(d.consent_marketing)} onChange={(v) => set("consent_marketing", v)}>
            Optional: send me occasional BuildGhana updates. I can unsubscribe at any time.
          </Check>
          {turnstileKey && <div className="cf-turnstile" data-sitekey={turnstileKey} data-theme="light" />}
        </div>
      )}

      {serverError && <p role="alert" className="field-error mt-5">{serverError}</p>}
      <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
        {step > 0 ? <button type="button" className="btn-ghost-dark" onClick={() => go(-1)}>Back</button> : <span className="text-xs text-muted">Draft saves on this device as you type.</span>}
        <button type="submit" className="btn-forest" disabled={submitting}>{step < steps.length - 1 ? "Continue" : submitting ? "Sending…" : kind === "seller" ? "Send privately" : "Send my requirements"}</button>
      </div>
    </form>
  );
}

function Check({ id, checked, onChange, err, children }: { id: string; checked: boolean; onChange: (v: boolean) => void; err?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="flex min-h-11 cursor-pointer items-start gap-3 text-[14.5px] leading-relaxed text-ink/85">
        <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 shrink-0 accent-[#12291F]" aria-invalid={Boolean(err)} aria-describedby={err ? `${id}-err` : undefined} />
        <span>{children}</span>
      </label>
      {err && <p id={`${id}-err`} className="field-error">{err}</p>}
    </div>
  );
}

function FieldView({ f, v, err, set }: { f: Field; v: Val; err?: string; set: (n: string, v: Val) => void }) {
  const id = `pp-${f.name}`;
  const aria = { "aria-invalid": Boolean(err), "aria-describedby": [err ? `${id}-err` : "", f.hint ? `${id}-hint` : ""].filter(Boolean).join(" ") || undefined };
  const wrap = f.half ? "" : "sm:col-span-2";
  const label = <>{f.label}{f.optional ? "" : <span aria-hidden className="text-gold-2"> *</span>}</>;
  let control: React.ReactNode;
  if (f.type === "select") {
    control = (
      <select id={id} className="field-input" value={String(v ?? "")} onChange={(e) => set(f.name, e.target.value)} {...aria}>
        <option value="">Select…</option>
        {f.options!.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    );
  } else if (f.type === "radio" || f.type === "multi") {
    const multi = f.type === "multi";
    const arr = multi ? (v as string[]) : [];
    control = (
      <div role={multi ? "group" : "radiogroup"} aria-labelledby={`${id}-label`} className="flex flex-wrap gap-2" id={id} tabIndex={-1} {...aria}>
        {f.options!.map((o) => {
          const on = multi ? arr.includes(o.value) : v === o.value;
          return (
            <button key={o.value} type="button" role={multi ? "checkbox" : "radio"} aria-checked={on}
              onClick={() => set(f.name, multi ? (on ? arr.filter((x) => x !== o.value) : [...arr, o.value]) : o.value)}
              className={`min-h-11 rounded-full border px-4 py-2 text-left text-[14px] transition-colors ${on ? "border-forest bg-forest text-ivory" : "border-line bg-white text-ink hover:border-forest/50"}`}>
              {o.label}
            </button>
          );
        })}
      </div>
    );
  } else if (f.type === "textarea") {
    control = <textarea id={id} rows={3} className="field-input" value={String(v ?? "")} placeholder={f.placeholder} onChange={(e) => set(f.name, e.target.value)} {...aria} />;
  } else {
    control = <input id={id} type={f.type === "number" ? "text" : f.type} inputMode={f.inputMode} autoComplete={f.autoComplete} placeholder={f.placeholder} className="field-input" value={String(v ?? "")} onChange={(e) => set(f.name, f.type === "number" ? e.target.value.replace(/[^0-9.]/g, "") : e.target.value)} {...aria} />;
  }
  return (
    <div className={wrap}>
      {f.type === "radio" || f.type === "multi" ? <p id={`${id}-label`} className="field-label">{label}</p> : <label htmlFor={id} className="field-label">{label}</label>}
      {control}
      {f.hint && <p id={`${id}-hint`} className="mt-1.5 text-[13px] leading-relaxed text-muted">{f.hint}</p>}
      {err && <p id={`${id}-err`} className="field-error">{err}</p>}
    </div>
  );
}
