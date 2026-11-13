"use client";

import Link from "next/link";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { leadSchema, stepFields } from "@/lib/lead/schema";
import {
  budgetRanges, constructionTypes, currentCountries, documentOptions, ghanaRegions, landStatuses,
  projectStages, serviceOptions, startTimelines, type Funnel, type Option,
} from "@/lib/lead/options";
import { getAttribution } from "@/lib/client/attribution";
import { adsConsentGranted, track, trackOnce } from "@/lib/client/analytics";
import { EstimateQualifiers, validateQualifiers, withPricingSeen } from "@/components/estimate/EstimateQualifiers";
import { estimateConfig, qualifierTheme } from "@/config/estimate";
import { oaiqLead } from "@/lib/openai-ads/client";
import type { Qualifiers } from "@/lib/estimate/qualifiers";

type State = {
  first_name: string; last_name: string; email: string; phone: string; whatsapp_same: boolean; current_country: string;
  ghana_region: string; ghana_city: string; land_status: string; project_stage: string; construction_type: string;
  budget_range: string; start_timeline: string; services: string[]; project_description: string; documents_available: string[];
  consent_contact: boolean; consent_marketing: boolean; consent_sms_whatsapp: boolean; company_website: string;
};

const STEPS = ["Contact", "Project", "Scope", "Confirm"] as const;

const initial = (service?: string, stage?: string): State => ({
  first_name: "", last_name: "", email: "", phone: "", whatsapp_same: true, current_country: "",
  ghana_region: "", ghana_city: "", land_status: "", project_stage: stage ?? "", construction_type: "",
  budget_range: "", start_timeline: "", services: service ? [service] : [], project_description: "", documents_available: [],
  consent_contact: false, consent_marketing: false, consent_sms_whatsapp: false, company_website: "",
});

export function LeadForm({ funnel = "general", defaultService, defaultStage, variant = "light", id = "lead-form" }: {
  funnel?: Funnel; defaultService?: string; defaultStage?: string; variant?: "light" | "card"; id?: string;
}) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [data, setData] = useState<State>(() => initial(defaultService, defaultStage));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submissionId = useRef<string>("");
  const startedAt = useRef<number>(0);
  const done = useRef(false);
  const formRef = useRef<HTMLFormElement>(null);
  const liveRef = useRef<HTMLParagraphElement>(null);
  const turnstileKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
  const [q, setQ] = useState<Qualifiers>({});
  const [qErrors, setQErrors] = useState<Partial<Record<keyof Qualifiers, string>>>({});
  /** Budget + start live in the qualifier step; keep the existing budget_range / start_timeline fields in sync. */
  const onQualifiers = (n: Qualifiers) => {
    markStarted();
    setQ(n);
    setQErrors({});
    setData((d) => ({
      ...d,
      budget_range: n.budget ?? "",
      start_timeline: n.start ?? "",
      construction_type: n.project_type ?? d.construction_type,
    }));
    setErrors((e) => { const x = { ...e }; delete x.budget_range; delete x.start_timeline; return x; });
  };

  useEffect(() => { submissionId.current = crypto.randomUUID(); }, []);

  // Form abandonment measurement
  useEffect(() => {
    const onHide = () => {
      if (document.visibilityState === "hidden" && startedAt.current && !done.current) {
        track("form_abandon", { form_id: id, funnel, last_step: STEPS[step] });
      }
    };
    document.addEventListener("visibilitychange", onHide);
    return () => document.removeEventListener("visibilitychange", onHide);
  }, [step, funnel, id]);

  const markStarted = () => {
    if (startedAt.current) return;
    startedAt.current = Date.now();
    track("form_start", { form_id: id, funnel });
  };

  const set = <K extends keyof State>(k: K, v: State[K]) => {
    markStarted();
    setData((d) => ({ ...d, [k]: v }));
    if (errors[k as string]) setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; });
  };
  const toggle = (k: "services" | "documents_available", v: string) =>
    set(k, data[k].includes(v) ? data[k].filter((x) => x !== v) : [...data[k], v]);

  const payload = () => ({
    submission_id: submissionId.current,
    funnel,
    ...data,
    phone: data.phone || undefined,
    ghana_city: data.ghana_city || undefined,
    project_description: data.project_description || undefined,
    form_started_at: startedAt.current || Date.now(),
    turnstile_token: (formRef.current?.querySelector('[name="cf-turnstile-response"]') as HTMLInputElement | null)?.value || undefined,
    attribution: getAttribution(),
    page_url: window.location.href,
    qualifiers: withPricingSeen(q),
    ads_consent: adsConsentGranted(),
  });

  const validateStep = (s: number) => {
    const result = leadSchema.safeParse(payload());
    const fields = stepFields[s] as string[];
    const errs: Record<string, string> = {};
    if (!result.success) {
      for (const i of result.error.issues) {
        const k = String(i.path[0]);
        if (fields.includes(k) && !errs[k]) errs[k] = i.message;
      }
    }
    setErrors(errs);
    if (Object.keys(errs).length) {
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus());
      return false;
    }
    return true;
  };

  const next = () => {
    const okStep = validateStep(step);
    if (step === 2) {
      const qe = validateQualifiers(estimateConfig, q, ["address"]);
      setQErrors(qe);
      if (Object.keys(qe).length) return;
    }
    if (!okStep) return;
    const n = Math.min(step + 1, STEPS.length - 1);
    if (n === 2 && !q.project_type && estimateConfig.projectTypes.some((p) => p.id === data.construction_type)) {
      setQ((cur) => ({ ...cur, project_type: data.construction_type }));
    }
    setStep(n);
    track("form_step", { form_id: id, funnel, step: n + 1, step_name: STEPS[n] });
    if (liveRef.current) liveRef.current.textContent = `Step ${n + 1} of ${STEPS.length}: ${STEPS[n]}`;
    formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < STEPS.length - 1) return next();
    if (!validateStep(step) || submitting) return;
    setSubmitting(true);
    setServerError("");
    try {
      const res = await fetch("/api/lead", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload()) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) {
        if (json.fieldErrors) {
          setErrors(json.fieldErrors);
          const firstStep = Object.entries(stepFields).find(([, f]) => (f as string[]).some((k) => json.fieldErrors[k]));
          if (firstStep) setStep(Number(firstStep[0]));
        }
        setServerError(json.error || "Something went wrong. Please try again.");
        return;
      }
      done.current = true;
      // One conversion per submission id — shared with Meta CAPI for deduplication.
      trackOnce(`lead:${json.leadId}`, "generate_lead", {
        form_id: id, funnel, lead_tier: json.tier, services: data.services.join(","),
        budget_range: data.budget_range, project_stage: data.project_stage,
        transaction_id: json.leadId,
        // Read by GTM "User-Provided Data" variable for Google Ads enhanced conversions for leads
        user_data: { email: data.email, phone_number: data.phone || undefined, address: { first_name: data.first_name, last_name: data.last_name } },
      }, json.leadId);
      // OpenAI Ads pixel: same id as the server Conversions API event → one conversion.
      if (adsConsentGranted()) oaiqLead(json.leadId);
      router.push(`/thank-you?type=lead&tier=${encodeURIComponent(json.tier)}&f=${funnel}`);
    } catch {
      setServerError("We couldn't reach the server. Check your connection and try again — your answers are still here.");
    } finally {
      setSubmitting(false);
    }
  };

  const shell = variant === "card" ? "rounded-[1.5rem] border border-line bg-white p-5 shadow-xl sm:p-8" : "";

  return (
    <form ref={formRef} id={id} onSubmit={submit} noValidate className={`scroll-mt-24 ${shell}`} onFocus={markStarted}>
      {turnstileKey && <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js" async defer />}
      <p ref={liveRef} className="sr-only" aria-live="polite" />

      {/* Progress */}
      <ol className="mb-7 grid grid-cols-4 gap-2" aria-label="Form progress">
        {STEPS.map((s, i) => (
          <li key={s} className="text-xs font-semibold uppercase tracking-wider">
            <div className={`mb-2 h-1.5 rounded-full ${i <= step ? "bg-gold" : "bg-line"}`} />
            <span className={i === step ? "text-forest" : "text-muted"} aria-current={i === step ? "step" : undefined}>
              <span className="sm:hidden">{i + 1}</span><span className="hidden sm:inline">{i + 1}. {s}</span>
            </span>
          </li>
        ))}
      </ol>

      {/* Honeypot */}
      <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Company website<input tabIndex={-1} autoComplete="off" value={data.company_website} onChange={(e) => set("company_website", e.target.value)} /></label>
      </div>

      {step === 0 && (
        <fieldset className="space-y-5">
          <legend className="font-display text-2xl text-forest">Let's start with you</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Text label="First name" name="first_name" autoComplete="given-name" value={data.first_name} onChange={(v) => set("first_name", v)} error={errors.first_name} />
            <Text label="Last name" name="last_name" autoComplete="family-name" value={data.last_name} onChange={(v) => set("last_name", v)} error={errors.last_name} />
          </div>
          <Text label="Email" name="email" type="email" inputMode="email" autoComplete="email" value={data.email} onChange={(v) => set("email", v)} error={errors.email} />
          <div>
            <Text label="Phone / WhatsApp (optional, with country code)" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="+1 617 555 0100" value={data.phone} onChange={(v) => set("phone", v)} error={errors.phone} />
            <label className="mt-2 flex items-center gap-2 text-sm text-muted">
              <input type="checkbox" checked={data.whatsapp_same} onChange={(e) => set("whatsapp_same", e.target.checked)} className="h-4 w-4 accent-[#12291F]" />
              This number is on WhatsApp
            </label>
          </div>
          <Select label="Where do you live now?" name="current_country" options={currentCountries} value={data.current_country} onChange={(v) => set("current_country", v)} error={errors.current_country} />
        </fieldset>
      )}

      {step === 1 && (
        <fieldset className="space-y-6">
          <legend className="font-display text-2xl text-forest">About your project in Ghana</legend>
          <div className="grid gap-5 sm:grid-cols-2">
            <Select label="Region" name="ghana_region" options={ghanaRegions} value={data.ghana_region} onChange={(v) => set("ghana_region", v)} error={errors.ghana_region} />
            <Text label="City / town / area (optional)" name="ghana_city" placeholder="e.g. East Legon, Kasoa, Kumasi" value={data.ghana_city} onChange={(v) => set("ghana_city", v)} error={errors.ghana_city} />
          </div>
          <Radios label="Land status" name="land_status" options={landStatuses} value={data.land_status} onChange={(v) => set("land_status", v)} error={errors.land_status} />
          <Radios label="Where is the project today?" name="project_stage" options={projectStages} value={data.project_stage} onChange={(v) => set("project_stage", v)} error={errors.project_stage} cols />
          <Radios label="What are you building?" name="construction_type" options={constructionTypes} value={data.construction_type} onChange={(v) => set("construction_type", v)} error={errors.construction_type} cols />
        </fieldset>
      )}

      {step === 2 && (
        <fieldset className="space-y-6">
          <legend className="font-display text-2xl text-forest">Budget, timing and support</legend>
          <p className="text-sm text-muted">A few quick answers so the consultation starts from a realistic budget, with no surprises.</p>
          <EstimateQualifiers cfg={estimateConfig} value={q} onChange={onQualifiers} theme={qualifierTheme} hide={["address"]}
            errors={{ ...qErrors, budget: qErrors.budget ?? errors.budget_range, start: qErrors.start ?? errors.start_timeline }} />
          <Checks label="Which services are you interested in?" name="services" options={serviceOptions} values={data.services} onToggle={(v) => toggle("services", v)} error={errors.services} />
          <div>
            <label htmlFor="project_description" className="field-label">Tell us about the project (optional)</label>
            <textarea id="project_description" rows={4} maxLength={3000} className="field-input" value={data.project_description}
              placeholder="Size, number of bedrooms or units, what has been done so far, what worries you most…"
              onChange={(e) => set("project_description", e.target.value)} />
          </div>
          <Checks label="Which documents do you already have? (optional)" name="documents_available" options={documentOptions} values={data.documents_available} onToggle={(v) => toggle("documents_available", v)} error={errors.documents_available} hint="Don't upload anything yet — after you submit, we'll send a secure link for drawings, photos and documents." />
        </fieldset>
      )}

      {step === 3 && (
        <fieldset className="space-y-5">
          <legend className="font-display text-2xl text-forest">Confirm and send</legend>
          <div className="rounded-2xl bg-ivory p-5 text-sm text-ink/80">
            <p><strong className="text-forest">{data.first_name} {data.last_name}</strong> · {data.email}</p>
            <p className="mt-1">{data.ghana_city ? `${data.ghana_city}, ` : ""}{data.ghana_region} · {projectStages.find((o) => o.value === data.project_stage)?.label}</p>
            <p className="mt-1">{budgetRanges.find((o) => o.value === data.budget_range)?.label} · Start: {startTimelines.find((o) => o.value === data.start_timeline)?.label}</p>
          </div>
          <Consent name="consent_contact" checked={data.consent_contact} onChange={(v) => set("consent_contact", v)} error={errors.consent_contact}
            label="Required: I agree that BuildGhana Abroad may contact me by email or phone about this request." />
          <Consent name="consent_marketing" checked={data.consent_marketing} onChange={(v) => set("consent_marketing", v)}
            label="Optional: Send me occasional guides and updates about building in Ghana. Unsubscribe any time." />
          <Consent name="consent_sms_whatsapp" checked={data.consent_sms_whatsapp} onChange={(v) => set("consent_sms_whatsapp", v)}
            label="Optional: I agree to receive text or WhatsApp messages about my request at the number provided. Message and data rates may apply. Reply STOP to opt out." />
          <p className="text-xs leading-relaxed text-muted">
            We use your information to respond to your request as described in our <Link href="/privacy" className="underline">privacy policy</Link>. We never sell your personal information.
          </p>
          {turnstileKey && <div className="cf-turnstile" data-sitekey={turnstileKey} data-theme="light" />}
        </fieldset>
      )}

      {serverError && <div role="alert" className="mt-6 rounded-xl border border-[#a2402b]/30 bg-[#a2402b]/5 px-4 py-3 text-sm text-[#7d2f1f]">{serverError}</div>}

      <div className="mt-8 flex items-center justify-between gap-3">
        {step > 0 ? (
          <button type="button" className="btn-ghost-dark" onClick={() => { setErrors({}); setStep((s) => s - 1); }}>Back</button>
        ) : <span />}
        <button type="submit" className="btn-forest min-w-40" disabled={submitting} aria-busy={submitting}>
          {step < STEPS.length - 1 ? "Continue" : submitting ? "Sending…" : "Request My Assessment"}
        </button>
      </div>
    </form>
  );
}

/* ─── Field primitives ─── */

function Text({ label, name, value, onChange, error, ...rest }: {
  label: string; name: string; value: string; onChange: (v: string) => void; error?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "name">) {
  return (
    <div>
      <label htmlFor={name} className="field-label">{label}</label>
      <input id={name} name={name} value={value} onChange={(e) => onChange(e.target.value)} className="field-input"
        aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-err` : undefined} {...rest} />
      {error && <p id={`${name}-err`} className="field-error">{error}</p>}
    </div>
  );
}

function Select({ label, name, options, value, onChange, error }: { label: string; name: string; options: Option[]; value: string; onChange: (v: string) => void; error?: string }) {
  return (
    <div>
      <label htmlFor={name} className="field-label">{label}</label>
      <select id={name} name={name} value={value} onChange={(e) => onChange(e.target.value)} className="field-input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 20 20%22 fill=%22%2312291F%22><path d=%22M5 7l5 6 5-6z%22/></svg>')] bg-[length:16px] bg-[right_14px_center] bg-no-repeat pr-10"
        aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-err` : undefined}>
        <option value="">Select…</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p id={`${name}-err`} className="field-error">{error}</p>}
    </div>
  );
}

function Radios({ label, name, options, value, onChange, error, cols }: { label: string; name: string; options: Option[]; value: string; onChange: (v: string) => void; error?: string; cols?: boolean }) {
  return (
    <fieldset aria-describedby={error ? `${name}-err` : undefined}>
      <legend className="field-label">{label}</legend>
      <div className={`grid gap-2.5 ${cols ? "sm:grid-cols-2" : ""}`}>
        {options.map((o, i) => (
          <label key={o.value} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-[15px] transition-colors ${value === o.value ? "border-forest bg-forest/5 text-forest" : "border-line bg-white hover:border-forest/40"}`}>
            <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="h-4 w-4 accent-[#12291F]"
              aria-invalid={i === 0 && error ? true : undefined} />
            {o.label}
          </label>
        ))}
      </div>
      {error && <p id={`${name}-err`} className="field-error">{error}</p>}
    </fieldset>
  );
}

function Checks({ label, name, options, values, onToggle, error, hint }: { label: string; name: string; options: Option[]; values: string[]; onToggle: (v: string) => void; error?: string; hint?: string }) {
  return (
    <fieldset aria-describedby={error ? `${name}-err` : undefined}>
      <legend className="field-label">{label}</legend>
      {hint && <p className="-mt-1 mb-2 text-sm text-muted">{hint}</p>}
      <div className="flex flex-wrap gap-2">
        {options.map((o, i) => {
          const on = values.includes(o.value);
          return (
            <label key={o.value} className={`inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors ${on ? "border-forest bg-forest text-ivory" : "border-line bg-white text-ink hover:border-forest/40"}`}>
              <input type="checkbox" className="sr-only" checked={on} onChange={() => onToggle(o.value)} aria-invalid={i === 0 && error ? true : undefined} />
              {on && <span aria-hidden className="text-gold">✓</span>}{o.label}
            </label>
          );
        })}
      </div>
      {error && <p id={`${name}-err`} className="field-error">{error}</p>}
    </fieldset>
  );
}

function Consent({ name, label, checked, onChange, error }: { name: string; label: string; checked: boolean; onChange: (v: boolean) => void; error?: string }) {
  return (
    <div>
      <label className="flex cursor-pointer gap-3 text-sm leading-relaxed text-ink/85">
        <input type="checkbox" name={name} checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-[#12291F]"
          aria-invalid={Boolean(error)} aria-describedby={error ? `${name}-err` : undefined} />
        <span>{label}</span>
      </label>
      {error && <p id={`${name}-err`} className="field-error">{error}</p>}
    </div>
  );
}
