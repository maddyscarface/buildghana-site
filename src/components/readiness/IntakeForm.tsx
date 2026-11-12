"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { currentCountries, ghanaRegions, projectStages, budgetRanges, startTimelines, type Option } from "@/lib/lead/options";
import { acquisitionRoutes, titleStatuses, intendedUses, groundSupport, reviewFocus, documentInventory, readiness } from "@/config/readiness";
import { getAttribution } from "@/lib/client/attribution";
import { adsConsentGranted, track, trackOnce } from "@/lib/client/analytics";
import { Icon } from "@/components/ui/Icons";

type Avail = "have" | "dont_have" | "not_sure";
type S = {
  first_name: string; last_name: string; email: string; phone: string; whatsapp_same: boolean; current_country: string;
  ghana_region: string; ghana_city: string; land_size: string; acquisition: string; title_status: string; intended_use: string;
  project_stage: string; budget_range: string; start_timeline: string; ground_support: string[]; focus: string[]; concerns: string;
  inventory: Record<string, Avail | "">; consent_terms: boolean; consent_data: boolean; consent_marketing: boolean; company_website: string;
};

const STEPS = [
  { key: "you", title: "About you", blurb: "So we know who to report to and in which time zone." },
  { key: "land", title: "The land", blurb: "Where it is and how it came to you — the starting point for title work." },
  { key: "project", title: "The project", blurb: "What you plan to build and what you want answered." },
  { key: "docs", title: "Your documents", blurb: "Just tell us what you hold. You'll upload files securely after payment." },
  { key: "confirm", title: "Confirm", blurb: "Check the scope, then continue to secure payment." },
] as const;

const init = (): S => ({
  first_name: "", last_name: "", email: "", phone: "", whatsapp_same: true, current_country: "",
  ghana_region: "", ghana_city: "", land_size: "", acquisition: "", title_status: "", intended_use: "",
  project_stage: "", budget_range: "", start_timeline: "", ground_support: [], focus: [], concerns: "",
  inventory: Object.fromEntries(documentInventory.map((d) => [d.key, ""])), consent_terms: false, consent_data: false, consent_marketing: false, company_website: "",
});

const req = (v: string, msg: string) => (v.trim() ? "" : msg);

function validate(step: number, s: S): Record<string, string> {
  const e: Record<string, string> = {};
  const set = (k: string, m: string) => { if (m) e[k] = m; };
  if (step === 0) {
    set("first_name", req(s.first_name, "Please enter your first name"));
    set("last_name", req(s.last_name, "Please enter your last name"));
    set("email", /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s.email.trim()) ? "" : "Please enter a valid email");
    set("phone", /^\+?[0-9 ()\-.]{7,20}$/.test(s.phone.trim()) ? "" : "Please include your country code, e.g. +1 617 555 0100");
    set("current_country", req(s.current_country, "Where do you live?"));
  }
  if (step === 1) {
    set("ghana_region", req(s.ghana_region, "Choose the region"));
    set("acquisition", req(s.acquisition, "How was the land acquired?"));
    set("title_status", req(s.title_status, "Which documents do you hold?"));
  }
  if (step === 2) {
    set("intended_use", req(s.intended_use, "What will you build?"));
    set("project_stage", req(s.project_stage, "Where is the project now?"));
    set("budget_range", req(s.budget_range, "Choose a budget range"));
    set("start_timeline", req(s.start_timeline, "When would you like to start?"));
    if (s.focus.length === 0) e.focus = "Choose at least one thing you want answered";
  }
  if (step === 3) {
    for (const d of documentInventory) if (!s.inventory[d.key]) e[`inventory.${d.key}`] = "Please choose one";
    if (Object.keys(e).length) e.inventory = "Please answer every document question";
  }
  if (step === 4) {
    if (!s.consent_terms) e.consent_terms = "Please accept the review scope and terms";
    if (!s.consent_data) e.consent_data = "We need your consent to store and review your documents";
  }
  return e;
}

function Select({ id, label, value, onChange, options, error, placeholder = "Choose…" }: { id: string; label: string; value: string; onChange: (v: string) => void; options: Option[]; error?: string; placeholder?: string }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className="field-input appearance-none bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 24 24%22 fill=%22none%22 stroke=%22%2312291F%22 stroke-width=%222%22><path d=%22m6 9 6 6 6-6%22/></svg>')] bg-[length:18px] bg-[right_14px_center] bg-no-repeat pr-10">
        <option value="">{placeholder}</option>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
      {error && <p id={`${id}-err`} className="field-error">{error}</p>}
    </div>
  );
}

function Text({ id, label, value, onChange, error, type = "text", autoComplete, placeholder, optional }: { id: string; label: string; value: string; onChange: (v: string) => void; error?: string; type?: string; autoComplete?: string; placeholder?: string; optional?: boolean }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label}{optional && <span className="ml-1.5 font-normal text-muted">(optional)</span>}</label>
      <input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} placeholder={placeholder} aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} className="field-input" />
      {error && <p id={`${id}-err`} className="field-error">{error}</p>}
    </div>
  );
}

function Chips({ name, options, value, onChange, error }: { name: string; options: Option[]; value: string[]; onChange: (v: string[]) => void; error?: string }) {
  return (
    <div>
      <div role="group" aria-labelledby={`${name}-label`} className="flex flex-wrap gap-2.5">
        {options.map((o) => {
          const on = value.includes(o.value);
          return (
            <button type="button" key={o.value} aria-pressed={on} onClick={() => onChange(on ? value.filter((x) => x !== o.value) : [...value, o.value])}
              className={`rounded-full border px-4 py-2.5 text-[14.5px] transition-colors ${on ? "border-forest bg-forest text-ivory" : "border-line bg-white text-ink hover:border-forest/40"}`}>
              {on && <span aria-hidden className="mr-1.5 text-gold">✓</span>}{o.label}
            </button>
          );
        })}
      </div>
      {error && <p className="field-error">{error}</p>}
    </div>
  );
}

export function IntakeForm() {
  const [step, setStep] = useState(0);
  const [s, setS] = useState<S>(init);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [serverError, setServerError] = useState("");
  const [created, setCreated] = useState<{ caseId: string; token: string } | null>(null);
  const [modes, setModes] = useState<{ stripe: string; paystack: string } | null>(null);
  const sid = useRef(""); const started = useRef(0); const topRef = useRef<HTMLDivElement>(null);
  const set = <K extends keyof S>(k: K, v: S[K]) => { setS((x) => ({ ...x, [k]: v })); setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; }); };

  useEffect(() => {
    sid.current = crypto.randomUUID();
    fetch("/api/readiness/price").then((r) => r.json()).then((p) => setModes(p.modes)).catch(() => {});
  }, []);
  const markStarted = () => { if (!started.current) { started.current = Date.now(); trackOnce(`rr_start:${sid.current}`, "readiness_intake_start", { revenue_stream: "readiness_review" }); } };

  const go = (n: number) => { setStep(n); topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const next = () => {
    const e = validate(step, s);
    setErrors(e);
    if (Object.keys(e).length) { setTimeout(() => (document.querySelector("[aria-invalid=true]") as HTMLElement | null)?.focus(), 30); return; }
    track("readiness_step", { step: step + 1, step_name: STEPS[step].key, revenue_stream: "readiness_review" });
    go(step + 1);
  };

  const submit = async () => {
    const e = validate(4, s); setErrors(e); if (Object.keys(e).length) return;
    setBusy(true); setServerError("");
    try {
      const res = await fetch("/api/readiness/intake", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...s, submission_id: sid.current, form_started_at: started.current || Date.now() - 60000, ads_consent: adsConsentGranted(), attribution: getAttribution(), page_url: window.location.href }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) { setServerError(j.error || "Something went wrong. Please try again."); if (j.fieldErrors) setErrors(j.fieldErrors); return; }
      track("readiness_intake_submit", { revenue_stream: "readiness_review", case_id: j.caseId }, `rr_intake_${j.caseId}`);
      setCreated({ caseId: j.caseId, token: j.token });
      try { sessionStorage.setItem("bga_rr_case", JSON.stringify({ caseId: j.caseId, token: j.token })); } catch {}
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch { setServerError("We couldn't reach the server. Please check your connection and try again."); }
    finally { setBusy(false); }
  };

  const pay = async (provider: "stripe" | "paystack") => {
    if (!created) return;
    setBusy(true); setServerError("");
    try {
      const res = await fetch("/api/readiness/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case_id: created.caseId, token: created.token, provider }) });
      const j = await res.json();
      if (!res.ok || !j.ok) { setServerError(j.error || "Checkout isn't available right now."); return; }
      track("begin_checkout", { revenue_stream: "readiness_review", provider, currency: j.currency, value: j.priceConfigured ? j.amountMinor / 100 : 0, sandbox: j.sandbox }, `rr_checkout_${created.caseId}`);
      window.location.href = j.url;
    } catch { setServerError("We couldn't start checkout. Please try again."); }
    finally { setBusy(false); }
  };

  const haveCount = useMemo(() => Object.values(s.inventory).filter((v) => v === "have").length, [s.inventory]);

  if (created) {
    return (
      <div ref={topRef} className="scroll-mt-28 rounded-[26px] border border-line bg-white p-7 shadow-xl sm:p-10">
        <p className="kicker text-gold-2"><span className="hairline" />Intake received</p>
        <h2 className="mt-4 font-display text-[2rem] leading-tight text-forest sm:text-[2.4rem]">Thank you, {s.first_name}. Choose how you'd like to pay.</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">Payment is handled on a secure hosted checkout. After payment you'll land on your private case page to upload documents.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {([["stripe", "Card in US dollars", "Stripe · Visa, Mastercard, Amex"], ["paystack", "Card or mobile money in cedis", "Paystack · MTN MoMo, Telecel, AirtelTigo, cards"]] as const).map(([p, t, d]) => (
            <button key={p} type="button" disabled={busy || modes?.[p] === "unavailable"} onClick={() => pay(p)}
              className="group flex flex-col items-start rounded-2xl border border-line bg-ivory p-6 text-left transition-all hover:-translate-y-0.5 hover:border-forest hover:shadow-lg disabled:opacity-50">
              <span className="flex w-full items-center justify-between"><Icon name="card" className="h-6 w-6 text-forest" />{modes?.[p] === "sandbox" && <span className="rounded-full bg-gold/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-2">Sandbox</span>}</span>
              <span className="mt-4 font-display text-[1.35rem] text-forest">{t}</span>
              <span className="mt-1 text-sm text-muted">{d}</span>
              <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest group-hover:gap-2.5 transition-all">Continue to payment <Icon name="arrow" className="h-4 w-4" /></span>
            </button>
          ))}
        </div>
        {(modes?.stripe === "sandbox" || modes?.paystack === "sandbox") && <p className="mt-5 rounded-xl bg-gold/10 px-4 py-3 text-sm text-ink/80"><strong>Sandbox mode:</strong> payment keys aren't connected on this deployment, so checkout is simulated and no money moves.</p>}
        {serverError && <p role="alert" className="mt-5 text-sm font-medium text-[#a2402b]">{serverError}</p>}
        <p className="mt-6 text-sm text-muted">Prefer to pay later? Your case is saved — <Link className="link-underline text-forest" href={`${readiness.path}/case/${created.caseId}?t=${encodeURIComponent(created.token)}`}>open your case page</Link> any time.</p>
      </div>
    );
  }

  return (
    <div ref={topRef} className="scroll-mt-28" onFocusCapture={markStarted}>
      <ol className="mb-8 grid grid-cols-5 gap-2" aria-label="Progress">
        {STEPS.map((st, i) => (
          <li key={st.key} className="min-w-0">
            <span className={`block h-1 rounded-full transition-colors ${i <= step ? "bg-gold" : "bg-line"}`} />
            <span className={`mt-2 hidden truncate text-[12px] font-semibold sm:block ${i === step ? "text-forest" : "text-muted"}`} aria-current={i === step ? "step" : undefined}>{i + 1}. {st.title}</span>
          </li>
        ))}
      </ol>
      <div className="rounded-[26px] border border-line bg-white p-6 shadow-xl sm:p-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold-2">Step {step + 1} of {STEPS.length}</p>
        <h2 className="mt-2 font-display text-[1.9rem] leading-tight text-forest sm:text-[2.2rem]">{STEPS[step].title}</h2>
        <p className="mt-1.5 text-[15px] text-muted">{STEPS[step].blurb}</p>
        <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" name="company_website" value={s.company_website} onChange={(e) => set("company_website", e.target.value)} />

        <div className="mt-8 grid gap-5">
          {step === 0 && (<>
            <div className="grid gap-5 sm:grid-cols-2">
              <Text id="first_name" label="First name" value={s.first_name} onChange={(v) => set("first_name", v)} error={errors.first_name} autoComplete="given-name" />
              <Text id="last_name" label="Last name" value={s.last_name} onChange={(v) => set("last_name", v)} error={errors.last_name} autoComplete="family-name" />
            </div>
            <Text id="email" type="email" label="Email" value={s.email} onChange={(v) => set("email", v)} error={errors.email} autoComplete="email" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Text id="phone" type="tel" label="Phone (with country code)" value={s.phone} onChange={(v) => set("phone", v)} error={errors.phone} autoComplete="tel" placeholder="+1 617 555 0100" />
              <Select id="current_country" label="Where do you live?" value={s.current_country} onChange={(v) => set("current_country", v)} options={currentCountries} error={errors.current_country} />
            </div>
            <label className="flex items-center gap-3 text-[15px] text-ink/85"><input type="checkbox" className="h-5 w-5 accent-[#12291F]" checked={s.whatsapp_same} onChange={(e) => set("whatsapp_same", e.target.checked)} /> This number is on WhatsApp</label>
          </>)}

          {step === 1 && (<>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select id="ghana_region" label="Region" value={s.ghana_region} onChange={(v) => set("ghana_region", v)} options={ghanaRegions} error={errors.ghana_region} />
              <Text id="ghana_city" label="Town / area" optional value={s.ghana_city} onChange={(v) => set("ghana_city", v)} placeholder="e.g. Oyibi, Kasoa, East Legon" />
            </div>
            <Text id="land_size" label="Approximate plot size" optional value={s.land_size} onChange={(v) => set("land_size", v)} placeholder="e.g. 100 × 70 ft, 1 plot, 0.16 acre" />
            <Select id="acquisition" label="How was the land acquired?" value={s.acquisition} onChange={(v) => set("acquisition", v)} options={acquisitionRoutes} error={errors.acquisition} />
            <Select id="title_status" label="Which land documents do you hold?" value={s.title_status} onChange={(v) => set("title_status", v)} options={titleStatuses} error={errors.title_status} />
            <div>
              <p id="ground_support-label" className="field-label">Who is helping you on the ground? <span className="font-normal text-muted">(optional)</span></p>
              <Chips name="ground_support" options={groundSupport} value={s.ground_support} onChange={(v) => set("ground_support", v)} />
            </div>
          </>)}

          {step === 2 && (<>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select id="intended_use" label="What will you build?" value={s.intended_use} onChange={(v) => set("intended_use", v)} options={intendedUses} error={errors.intended_use} />
              <Select id="project_stage" label="Where is the project now?" value={s.project_stage} onChange={(v) => set("project_stage", v)} options={projectStages} error={errors.project_stage} />
              <Select id="budget_range" label="Construction budget" value={s.budget_range} onChange={(v) => set("budget_range", v)} options={budgetRanges} error={errors.budget_range} />
              <Select id="start_timeline" label="When would you like to start?" value={s.start_timeline} onChange={(v) => set("start_timeline", v)} options={startTimelines} error={errors.start_timeline} />
            </div>
            <div>
              <p id="focus-label" className="field-label">What do you most want answered?</p>
              <Chips name="focus" options={reviewFocus} value={s.focus} onChange={(v) => set("focus", v)} error={errors.focus} />
            </div>
            <div>
              <label htmlFor="concerns" className="field-label">Anything worrying you? <span className="font-normal text-muted">(optional)</span></label>
              <textarea id="concerns" rows={4} maxLength={2000} value={s.concerns} onChange={(e) => set("concerns", e.target.value)} className="field-input" placeholder="e.g. A neighbour says part of the plot is theirs; my contractor wants 60% upfront…" />
            </div>
          </>)}

          {step === 3 && (<>
            <p className="rounded-xl bg-ivory px-4 py-3 text-[14.5px] text-ink/80"><Icon name="lock" className="mr-1.5 inline h-4 w-4 text-gold-2" />Don't upload anything yet — after payment you'll get a private case page with secure upload.</p>
            {errors.inventory && <p role="alert" className="field-error !mt-0">{errors.inventory}</p>}
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {documentInventory.map((d) => (
                <li key={d.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="block text-[15px] font-semibold text-forest">{d.label} {d.title && <span className="text-gold-2" title="Needed for title verification">✦</span>}</span>
                    <span className="block text-[13px] text-muted">{d.hint}</span>
                  </span>
                  <span role="radiogroup" aria-label={d.label} className={`inline-flex shrink-0 overflow-hidden rounded-full border ${errors[`inventory.${d.key}`] ? "border-[#a2402b]" : "border-line"}`}>
                    {([["have", "Have it"], ["dont_have", "Don't have"], ["not_sure", "Not sure"]] as const).map(([v, l]) => (
                      <button key={v} type="button" role="radio" aria-checked={s.inventory[d.key] === v}
                        onClick={() => { setS((x) => ({ ...x, inventory: { ...x.inventory, [d.key]: v } })); setErrors((e) => { const n = { ...e }; delete n[`inventory.${d.key}`]; delete n.inventory; return n; }); }}
                        className={`px-3.5 py-2 text-[13px] font-medium transition-colors ${s.inventory[d.key] === v ? "bg-forest text-ivory" : "bg-white text-ink hover:bg-ivory"}`}>{l}</button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">✦ Needed by counsel for the title search. You currently hold {haveCount} of {documentInventory.length}.</p>
          </>)}

          {step === 4 && (<>
            <dl className="grid gap-x-8 gap-y-3 rounded-2xl bg-ivory p-5 text-[14.5px] sm:grid-cols-2">
              {[["Name", `${s.first_name} ${s.last_name}`], ["Email", s.email], ["Land", `${s.ghana_city ? s.ghana_city + ", " : ""}${s.ghana_region}`], ["Documents held", `${haveCount} of ${documentInventory.length}`]].map(([k, v]) => (
                <div key={k}><dt className="text-[12px] font-semibold uppercase tracking-wider text-gold-2">{k}</dt><dd className="mt-0.5 text-forest">{v}</dd></div>
              ))}
            </dl>
            <div className="rounded-2xl border border-line p-5 text-[14.5px] leading-relaxed text-ink/80">
              <p className="font-semibold text-forest">Review scope</p>
              <p className="mt-1.5">The {readiness.name} is an evidence-based assessment of the documents and information you supply. It is not a legal opinion, structural engineering report or valuation. Title verification is carried out by independent Ghana-qualified counsel; if counsel's search fees are separate, they're confirmed with you before counsel is instructed. The fee is shown on the payment screen before you pay.</p>
            </div>
            {([
              ["consent_terms", <>I accept the review scope above and the <Link href="/terms" className="link-underline text-forest" target="_blank">terms</Link>.</>],
              ["consent_data", <>I consent to BuildGhana storing my documents privately and sharing them only with my reviewer and appointed Ghanaian counsel, as described in the <Link href="/privacy" className="link-underline text-forest" target="_blank">privacy notice</Link>.</>],
              ["consent_marketing", <>Send me occasional guidance on building in Ghana (optional).</>],
            ] as const).map(([k, l]) => (
              <div key={k}>
                <label className="flex items-start gap-3 text-[15px] leading-relaxed text-ink/85">
                  <input type="checkbox" className="mt-1 h-5 w-5 shrink-0 accent-[#12291F]" checked={s[k]} onChange={(e) => set(k, e.target.checked)} aria-invalid={!!errors[k]} />
                  <span>{l}</span>
                </label>
                {errors[k] && <p className="field-error ml-8">{errors[k]}</p>}
              </div>
            ))}
          </>)}
        </div>

        {serverError && <p role="alert" className="mt-6 text-sm font-medium text-[#a2402b]">{serverError}</p>}
        <div className="mt-10 flex items-center justify-between gap-4 border-t border-line pt-6">
          {step > 0 ? <button type="button" onClick={() => go(step - 1)} className="btn-ghost-dark !px-5">Back</button> : <span />}
          {step < STEPS.length - 1
            ? <button type="button" onClick={next} className="btn-forest">Continue <Icon name="arrow" className="h-4 w-4" /></button>
            : <button type="button" onClick={submit} disabled={busy} className="btn-gold disabled:opacity-60">{busy ? "Saving…" : "Save and choose payment"} <Icon name="arrow" className="h-4 w-4" /></button>}
        </div>
      </div>
    </div>
  );
}
