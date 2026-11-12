"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { currentCountries, ghanaRegions, type Option } from "@/lib/lead/options";
import {
  contactMethods, timeZones, areaUnits, landControllers, acquiredStatuses, siteAccess, intendedUses, finishLevels, budgetBands, budgetCurrencies,
  fundsStatuses, designStatuses, addOnServices, documentInventory, readiness,
} from "@/config/readiness";
import { getAttribution } from "@/lib/client/attribution";
import { adsConsentGranted, track, trackOnce } from "@/lib/client/analytics";
import { Icon } from "@/components/ui/Icons";
import { FeeSummary, type PublicPrice } from "./FeeSummary";

type Avail = "available" | "missing" | "uncertain";
type S = {
  first_name: string; last_name: string; email: string; phone: string; whatsapp_same: boolean; current_country: string; preferred_contact: string; time_zone: string;
  ghana_region: string; district: string; locality: string; gps: string; map_link: string; plot_number: string; land_area: string; area_unit: string; access: string;
  land_controller: string; acquired: string; site_contact_name: string; site_contact_phone: string; site_contact_relationship: string;
  intended_use: string; use_other: string; floor_area: string; units: string; floors: string; finish: string; description: string;
  budget_band: string; budget_currency: string; funds: string; land_included: boolean; target_start: string; design_status: string; add_ons: string[]; concerns: string;
  inventory: Record<string, Avail | "">;
  consent_authority: boolean; consent_privacy: boolean; consent_scope: boolean; consent_marketing: boolean; consent_site_contact: boolean; company_website: string;
};

const STEPS = [
  { key: "you", title: "About you", blurb: "Who we report to, and how and when to reach you." },
  { key: "parcel", title: "The parcel", blurb: "Where the land is and who controls it. Answer what you know — 'not sure' is fine." },
  { key: "project", title: "Project & budget", blurb: "What you plan to build, roughly what it should cost and when." },
  { key: "docs", title: "Land paperwork", blurb: "Mark each document. Missing or uncertain paperwork never stops you — it tells us where to look." },
  { key: "confirm", title: "Scope & consent", blurb: "Check what the review covers and what it costs, then continue to secure payment." },
] as const;

const DRAFT_KEY = "bga_rr_draft_v2";
const DRAFT_SYNC_KEY = "bga_rr_draft_synced";
const init = (): S => ({
  first_name: "", last_name: "", email: "", phone: "", whatsapp_same: true, current_country: "", preferred_contact: "", time_zone: "",
  ghana_region: "", district: "", locality: "", gps: "", map_link: "", plot_number: "", land_area: "", area_unit: "", access: "",
  land_controller: "", acquired: "", site_contact_name: "", site_contact_phone: "", site_contact_relationship: "",
  intended_use: "", use_other: "", floor_area: "", units: "", floors: "", finish: "", description: "",
  budget_band: "", budget_currency: "USD", funds: "", land_included: false, target_start: "", design_status: "", add_ons: [], concerns: "",
  inventory: Object.fromEntries(documentInventory.map((d) => [d.key, ""])),
  consent_authority: false, consent_privacy: false, consent_scope: false, consent_marketing: false, consent_site_contact: false, company_website: "",
});

/** Accepts "5.6037, -0.1870" or a Google Maps link containing @lat,lng or q=lat,lng. Ghana bounds only. */
export function parsePin(v: string): { lat: number; lng: number } | null {
  const m = /(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)/.exec(v);
  if (!m) return null;
  const lat = Number(m[1]), lng = Number(m[2]);
  return lat >= 4 && lat <= 12 && lng >= -4 && lng <= 2 ? { lat, lng } : null;
}

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
    set("preferred_contact", req(s.preferred_contact, "How should we contact you?"));
    set("time_zone", req(s.time_zone, "Choose your time zone"));
  }
  if (step === 1) {
    set("ghana_region", req(s.ghana_region, "Choose the region"));
    set("district", req(s.district, "Enter the district / municipal assembly, or 'not sure'"));
    set("locality", req(s.locality, "Enter the town or neighbourhood"));
    set("area_unit", req(s.area_unit, "Choose a unit (or 'not sure')"));
    set("access", req(s.access, "Choose one"));
    set("land_controller", req(s.land_controller, "Who controls the land today?"));
    set("acquired", req(s.acquired, "Has the land been acquired?"));
    if (s.map_link.trim() && !parsePin(s.map_link)) e.map_link = "Paste coordinates like 5.6037, -0.1870 or a Google Maps link with a dropped pin";
    if (s.site_contact_phone.trim() && !/^\+?[0-9 ()\-.]{7,20}$/.test(s.site_contact_phone.trim())) e.site_contact_phone = "Please include the country code";
  }
  if (step === 2) {
    set("intended_use", req(s.intended_use, "What will you build?"));
    if (s.intended_use === "other") set("use_other", req(s.use_other, "Tell us briefly what you plan to build"));
    set("finish", req(s.finish, "Choose a finish level"));
    set("budget_band", req(s.budget_band, "Choose a budget range"));
    set("funds", req(s.funds, "Choose one"));
    set("design_status", req(s.design_status, "Where is the design?"));
  }
  if (step === 3) {
    for (const d of documentInventory) if (!s.inventory[d.key]) e[`inventory.${d.key}`] = "Please choose one";
    if (Object.keys(e).length) e.inventory = "Please mark every document as available, missing or uncertain";
  }
  if (step === 4) {
    if (!s.consent_authority) e.consent_authority = "Please confirm you're authorised to request this review";
    if (!s.consent_privacy) e.consent_privacy = "We need your consent to store and review your information and documents";
    if (!s.consent_scope) e.consent_scope = "Please confirm you've read what the review does and doesn't cover";
    if ((s.site_contact_name || s.site_contact_phone) && !s.consent_site_contact) e.consent_site_contact = "Please confirm we may contact the person on site";
  }
  return e;
}

function Area({ id, label, value, onChange, placeholder, rows = 3 }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return (
    <div>
      <label htmlFor={id} className="field-label">{label} <span className="font-normal text-muted">(optional)</span></label>
      <textarea id={id} rows={rows} maxLength={2000} value={value} onChange={(e) => onChange(e.target.value)} className="field-input" placeholder={placeholder} />
    </div>
  );
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
  const [price, setPrice] = useState<PublicPrice | null>(null);
  const [resumed, setResumed] = useState(false);
  const sid = useRef(""); const started = useRef(0); const topRef = useRef<HTMLDivElement>(null); const loaded = useRef(false);
  const set = <K extends keyof S>(k: K, v: S[K]) => { setS((x) => ({ ...x, [k]: v })); setErrors((e) => { const n = { ...e }; delete n[k as string]; return n; }); };

  useEffect(() => {
    // Resume a saved draft (kept only in this browser; consents are never pre-ticked on resume).
    try {
      const d = JSON.parse(localStorage.getItem(DRAFT_KEY) || "null") as { s: S; step: number; sid: string; started: number } | null;
      if (d?.s && d.sid) {
        setS({ ...init(), ...d.s, consent_authority: false, consent_privacy: false, consent_scope: false, company_website: "" });
        setStep(Math.min(d.step, STEPS.length - 1)); sid.current = d.sid; started.current = d.started || 0; setResumed(true);
      }
    } catch {}
    if (!sid.current) sid.current = crypto.randomUUID();
    loaded.current = true;
    fetch("/api/readiness/price").then((r) => r.json()).then((p) => { setModes(p.modes); setPrice(p); }).catch(() => {});
  }, []);
  const latest = useRef({ s, step, created });
  latest.current = { s, step, created };
  const saveDraft = useCallback(() => {
    const { s: cur, step: st, created: done } = latest.current;
    if (!loaded.current || done) return;
    try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ s: { ...cur, company_website: "" }, step: st, sid: sid.current, started: started.current })); } catch {}
  }, []);
  useEffect(() => { const t = setTimeout(saveDraft, 300); return () => clearTimeout(t); }, [s, saveDraft]);
  useEffect(() => { saveDraft(); }, [step, saveDraft]);
  useEffect(() => {
    const h = () => saveDraft();
    window.addEventListener("pagehide", h); document.addEventListener("visibilitychange", h);
    return () => { window.removeEventListener("pagehide", h); document.removeEventListener("visibilitychange", h); };
  }, [saveDraft]);
  const discardDraft = () => { try { localStorage.removeItem(DRAFT_KEY); } catch {} setS(init()); setStep(0); sid.current = crypto.randomUUID(); started.current = 0; setResumed(false); };

  const markStarted = () => { if (!started.current) { started.current = Date.now(); trackOnce(`rr_start:${sid.current}`, "readiness_started", { revenue_stream: "readiness_review" }); } };

  const go = (n: number) => { setStep(n); topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const next = () => {
    const e = validate(step, s);
    setErrors(e);
    if (Object.keys(e).length) { setTimeout(() => (document.querySelector("[aria-invalid=true]") as HTMLElement | null)?.focus(), 30); return; }
    track("readiness_step", { step: step + 1, step_name: STEPS[step].key, revenue_stream: "readiness_review" });
    if (STEPS[step].key === "docs") {
      const v = Object.values(s.inventory);
      trackOnce(`rr_inv:${sid.current}`, "document_inventory_completed", { revenue_stream: "readiness_review", available: v.filter((x) => x === "available").length, missing: v.filter((x) => x === "missing").length, uncertain: v.filter((x) => x === "uncertain").length });
    }
    if (STEPS[step].key === "you") syncDraftStart();
    go(step + 1);
  };

  /** First draft save → server "intake started" (CRM). Once per draft + email; the server dedupes again. */
  const syncDraftStart = () => {
    const mark = `${sid.current}|${s.email.trim().toLowerCase()}`;
    try { if (localStorage.getItem(DRAFT_SYNC_KEY) === mark) return; localStorage.setItem(DRAFT_SYNC_KEY, mark); } catch {}
    fetch("/api/readiness/draft", {
      method: "POST", headers: { "Content-Type": "application/json" }, keepalive: true,
      body: JSON.stringify({ submission_id: sid.current, first_name: s.first_name, last_name: s.last_name, email: s.email, phone: s.phone, current_country: s.current_country, preferred_contact: s.preferred_contact, time_zone: s.time_zone, attribution: getAttribution() }),
    }).catch(() => {});
  };

  const submit = async () => {
    const e = validate(4, s); setErrors(e); if (Object.keys(e).length) return;
    setBusy(true); setServerError("");
    const pin = parsePin(s.map_link);
    const { map_link: _ml, ...rest } = s; void _ml;
    try {
      const res = await fetch("/api/readiness/intake", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...rest, map_lat: pin?.lat, map_lng: pin?.lng, submission_id: sid.current, form_started_at: started.current || Date.now() - 60000, ads_consent: adsConsentGranted(), attribution: getAttribution(), page_url: window.location.href }),
      });
      const j = await res.json();
      if (!res.ok || !j.ok) {
        setServerError(j.error || "Something went wrong. Please try again.");
        if (j.fieldErrors) { setErrors(j.fieldErrors); const first = Object.keys(j.fieldErrors)[0]; const idx = stepOfField(first); if (idx !== null && idx !== step) go(idx); }
        return;
      }
      track("readiness_intake_submit", { revenue_stream: "readiness_review", case_id: j.caseId }, `rr_intake_${j.caseId}`);
      setCreated({ caseId: j.caseId, token: j.token });
      try { localStorage.removeItem(DRAFT_KEY); sessionStorage.setItem("bga_rr_case", JSON.stringify({ caseId: j.caseId, token: j.token })); } catch {}
      topRef.current?.scrollIntoView({ behavior: "smooth" });
    } catch { setServerError("We couldn't reach the server. Please check your connection and try again — your answers are saved in this browser."); }
    finally { setBusy(false); }
  };

  const pay = async (provider: "stripe" | "paystack") => {
    if (!created) return;
    setBusy(true); setServerError("");
    try {
      const res = await fetch("/api/readiness/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ case_id: created.caseId, token: created.token, provider }) });
      const j = await res.json();
      if (!res.ok || !j.ok) { setServerError(j.error || "Checkout isn't available right now."); return; }
      track("checkout_started", { revenue_stream: "readiness_review", provider, currency: j.currency, value: j.priceConfigured ? j.amountMinor / 100 : 0, sandbox: j.sandbox }, `rr_checkout_${created.caseId}`);
      window.location.href = j.url;
    } catch { setServerError("We couldn't start checkout. Please try again."); }
    finally { setBusy(false); }
  };

  const counts = useMemo(() => {
    const v = Object.values(s.inventory);
    return { available: v.filter((x) => x === "available").length, missing: v.filter((x) => x === "missing").length, uncertain: v.filter((x) => x === "uncertain").length };
  }, [s.inventory]);

  if (created) {
    return (
      <div ref={topRef} className="scroll-mt-28 rounded-[26px] border border-line bg-white p-5 shadow-xl sm:p-10">
        <p className="kicker text-gold-2"><span className="hairline" />Intake received</p>
        <h2 className="mt-4 font-display text-[2rem] leading-tight text-forest sm:text-[2.4rem]">Thank you, {s.first_name}. Choose how you'd like to pay.</h2>
        <p className="mt-3 text-[16px] leading-relaxed text-muted">Payment is handled on a secure hosted checkout. After payment you'll land on your private case page, where you can upload documents any time.</p>
        <FeeSummary price={price} compact />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
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
      {resumed && (
        <p className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-gold/10 px-4 py-3 text-sm text-ink/80">
          <span><Icon name="check" className="mr-1.5 inline h-4 w-4 text-gold-2" />We restored your saved answers from this browser.</span>
          <button type="button" onClick={discardDraft} className="font-semibold text-forest underline underline-offset-4">Start over</button>
        </p>
      )}
      <ol className="mb-8 grid grid-cols-5 gap-2" aria-label="Progress">
        {STEPS.map((st, i) => (
          <li key={st.key} className="min-w-0">
            <span className={`block h-1 rounded-full transition-colors ${i <= step ? "bg-gold" : "bg-line"}`} />
            <span className={`mt-2 hidden truncate text-[12px] font-semibold sm:block ${i === step ? "text-forest" : "text-muted"}`} aria-current={i === step ? "step" : undefined}>{i + 1}. {st.title}</span>
          </li>
        ))}
      </ol>
      <div className="rounded-[26px] border border-line bg-white p-5 shadow-xl sm:p-10">
        <p className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold-2">Step {step + 1} of {STEPS.length} · saved automatically</p>
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
              <Select id="current_country" label="Country of residence" value={s.current_country} onChange={(v) => set("current_country", v)} options={currentCountries} error={errors.current_country} />
              <Select id="preferred_contact" label="Preferred contact method" value={s.preferred_contact} onChange={(v) => set("preferred_contact", v)} options={contactMethods} error={errors.preferred_contact} />
              <Select id="time_zone" label="Your time zone" value={s.time_zone} onChange={(v) => set("time_zone", v)} options={timeZones} error={errors.time_zone} />
            </div>
            <label className="flex items-center gap-3 text-[15px] text-ink/85"><input type="checkbox" className="h-5 w-5 accent-[#12291F]" checked={s.whatsapp_same} onChange={(e) => set("whatsapp_same", e.target.checked)} /> This number is on WhatsApp</label>
          </>)}

          {step === 1 && (<>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select id="ghana_region" label="Region" value={s.ghana_region} onChange={(v) => set("ghana_region", v)} options={ghanaRegions} error={errors.ghana_region} />
              <Text id="district" label="District / municipal assembly" value={s.district} onChange={(v) => set("district", v)} error={errors.district} placeholder="e.g. Adentan Municipal, or 'not sure'" />
              <Text id="locality" label="Town / neighbourhood" value={s.locality} onChange={(v) => set("locality", v)} error={errors.locality} placeholder="e.g. Oyibi, Kasoa, East Legon" />
              <Text id="gps" label="GhanaPost GPS or coordinates" optional value={s.gps} onChange={(v) => set("gps", v)} placeholder="e.g. GA-123-4567" />
            </div>
            <Text id="map_link" label="Map pin — paste a Google Maps link or coordinates" optional value={s.map_link} onChange={(v) => set("map_link", v)} error={errors.map_link} placeholder="e.g. 5.6037, -0.1870" />
            {parsePin(s.map_link) && <p className="-mt-3 text-sm text-forest"><Icon name="pin" className="mr-1 inline h-4 w-4 text-gold-2" />Pin read: {parsePin(s.map_link)!.lat.toFixed(5)}, {parsePin(s.map_link)!.lng.toFixed(5)}</p>}
            <div className="grid gap-5 sm:grid-cols-3">
              <Text id="plot_number" label="Plot number" optional value={s.plot_number} onChange={(v) => set("plot_number", v)} />
              <Text id="land_area" label="Land area" optional value={s.land_area} onChange={(v) => set("land_area", v)} placeholder="e.g. 1, 100×70" />
              <Select id="area_unit" label="Unit" value={s.area_unit} onChange={(v) => set("area_unit", v)} options={areaUnits} error={errors.area_unit} />
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Select id="access" label="Access" value={s.access} onChange={(v) => set("access", v)} options={siteAccess} error={errors.access} />
              <Select id="land_controller" label="Who controls the land now?" value={s.land_controller} onChange={(v) => set("land_controller", v)} options={landControllers} error={errors.land_controller} />
              <Select id="acquired" label="Already acquired?" value={s.acquired} onChange={(v) => set("acquired", v)} options={acquiredStatuses} error={errors.acquired} />
            </div>
            <fieldset className="rounded-2xl border border-line p-5">
              <legend className="px-2 text-[14px] font-semibold text-forest">Person on site <span className="font-normal text-muted">(optional)</span></legend>
              <p className="text-[13.5px] text-muted">Someone who can show our inspector the plot — a relative, caretaker or agent.</p>
              <div className="mt-4 grid gap-5 sm:grid-cols-3">
                <Text id="site_contact_name" label="Name" value={s.site_contact_name} onChange={(v) => set("site_contact_name", v)} />
                <Text id="site_contact_phone" type="tel" label="Phone" value={s.site_contact_phone} onChange={(v) => set("site_contact_phone", v)} error={errors.site_contact_phone} placeholder="+233 …" />
                <Text id="site_contact_relationship" label="Relationship" value={s.site_contact_relationship} onChange={(v) => set("site_contact_relationship", v)} placeholder="e.g. brother" />
              </div>
            </fieldset>
          </>)}

          {step === 2 && (<>
            <div className="grid gap-5 sm:grid-cols-2">
              <Select id="intended_use" label="Intended use" value={s.intended_use} onChange={(v) => set("intended_use", v)} options={intendedUses} error={errors.intended_use} />
              {s.intended_use === "other" ? <Text id="use_other" label="What will you build?" value={s.use_other} onChange={(v) => set("use_other", v)} error={errors.use_other} /> :
                <Select id="finish" label="Finish level" value={s.finish} onChange={(v) => set("finish", v)} options={finishLevels} error={errors.finish} />}
            </div>
            {s.intended_use === "other" && <Select id="finish" label="Finish level" value={s.finish} onChange={(v) => set("finish", v)} options={finishLevels} error={errors.finish} />}
            <div className="grid gap-5 sm:grid-cols-3">
              <Text id="floor_area" label="Approx. floor area" optional value={s.floor_area} onChange={(v) => set("floor_area", v)} placeholder="e.g. 250 m² or 2,700 ft²" />
              <Text id="units" label="Units" optional value={s.units} onChange={(v) => set("units", v)} placeholder="e.g. 1" />
              <Text id="floors" label="Floors" optional value={s.floors} onChange={(v) => set("floors", v)} placeholder="e.g. 2" />
            </div>
            <Area id="description" label="Short description" value={s.description} onChange={(v) => set("description", v)} placeholder="e.g. 4-bed family house with boys' quarters and a wall." />
            <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
              <Select id="budget_band" label="Construction budget range" value={s.budget_band} onChange={(v) => set("budget_band", v)} options={budgetBands} error={errors.budget_band} />
              <Select id="budget_currency" label="Currency" value={s.budget_currency} onChange={(v) => set("budget_currency", v)} options={budgetCurrencies} placeholder="—" />
            </div>
            <div className="grid gap-5 sm:grid-cols-3">
              <Select id="funds" label="Funds" value={s.funds} onChange={(v) => set("funds", v)} options={fundsStatuses} error={errors.funds} />
              <Text id="target_start" type="month" label="Target start month" optional value={s.target_start} onChange={(v) => set("target_start", v)} />
              <Select id="design_status" label="Design status" value={s.design_status} onChange={(v) => set("design_status", v)} options={designStatuses} error={errors.design_status} />
            </div>
            <label className="flex items-center gap-3 text-[15px] text-ink/85"><input type="checkbox" className="h-5 w-5 accent-[#12291F]" checked={s.land_included} onChange={(e) => set("land_included", e.target.checked)} /> This budget includes the cost of the land</label>
            <div>
              <p id="add_ons-label" className="field-label">Optional services you'd like quoted <span className="font-normal text-muted">(nothing is charged without your approval)</span></p>
              <Chips name="add_ons" options={addOnServices} value={s.add_ons} onChange={(v) => set("add_ons", v)} />
            </div>
            <Area id="concerns" label="Anything worrying you?" value={s.concerns} onChange={(v) => set("concerns", v)} placeholder="e.g. A neighbour says part of the plot is theirs; my contractor wants 60% upfront…" />
          </>)}

          {step === 3 && (<>
            <p className="rounded-xl bg-ivory px-4 py-3 text-[14.5px] text-ink/80"><Icon name="lock" className="mr-1.5 inline h-4 w-4 text-gold-2" />Just mark what you have for now. Right after this form you'll get a private case page with secure upload — and you can add missing documents later without starting over.</p>
            {errors.inventory && <p role="alert" className="field-error !mt-0">{errors.inventory}</p>}
            <ul className="divide-y divide-line rounded-2xl border border-line">
              {documentInventory.map((d) => (
                <li key={d.key} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <span>
                    <span className="block text-[15px] font-semibold text-forest">{d.label} {d.title && <span className="text-gold-2" title="Used by counsel for the title check">✦</span>}</span>
                    <span className="block text-[13px] text-muted">{d.hint}</span>
                  </span>
                  <span role="radiogroup" aria-label={d.label} className={`inline-flex shrink-0 overflow-hidden rounded-full border ${errors[`inventory.${d.key}`] ? "border-[#a2402b]" : "border-line"}`}>
                    {([["available", "Available"], ["missing", "Missing"], ["uncertain", "Uncertain"]] as const).map(([v, l]) => (
                      <button key={v} type="button" role="radio" aria-checked={s.inventory[d.key] === v}
                        onClick={() => { setS((x) => ({ ...x, inventory: { ...x.inventory, [d.key]: v } })); setErrors((e) => { const n = { ...e }; delete n[`inventory.${d.key}`]; delete n.inventory; return n; }); }}
                        className={`px-3.5 py-2 text-[13px] font-medium transition-colors ${s.inventory[d.key] === v ? "bg-forest text-ivory" : "bg-white text-ink hover:bg-ivory"}`}>{l}</button>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">✦ Used by Ghanaian counsel for the title check. Available {counts.available} · missing {counts.missing} · uncertain {counts.uncertain}.</p>
          </>)}

          {step === 4 && (<>
            <dl className="grid gap-x-8 gap-y-3 rounded-2xl bg-ivory p-5 text-[14.5px] sm:grid-cols-2">
              {[["Name", `${s.first_name} ${s.last_name}`], ["Email", s.email], ["Parcel", [s.locality, s.district, s.ghana_region].filter(Boolean).join(", ")], ["Paperwork", `${counts.available} available · ${counts.missing} missing · ${counts.uncertain} uncertain`]].map(([k, v]) => (
                <div key={k}><dt className="text-[12px] font-semibold uppercase tracking-wider text-gold-2">{k}</dt><dd className="mt-0.5 text-forest">{v}</dd></div>
              ))}
            </dl>
            <ScopeBox />
            <FeeSummary price={price} />
            {([
              ["consent_authority", <>I own this land or am authorised by the owner to request this review and share its documents.</>],
              ["consent_privacy", <>I consent to BuildGhana storing my information and documents privately and sharing them only with my reviewer, the site inspector and appointed Ghanaian counsel, as described in the <Link href="/privacy" className="link-underline text-forest" target="_blank">privacy notice</Link>.</>],
              ["consent_scope", <>I've read what the review covers and doesn't cover (above) and the <Link href="/terms" className="link-underline text-forest" target="_blank">terms</Link>.</>],
              ...((s.site_contact_name || s.site_contact_phone) ? [["consent_site_contact", <>BuildGhana may contact {s.site_contact_name || "my site contact"} to arrange access to the plot.</>] as const] : []),
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

        {step === 0 && <p className="mt-6 text-[13px] leading-relaxed text-muted">When you continue we keep your name and contact details so you can pick up where you left off and so we can help if you get stuck. Nothing else is shared until you submit. <a href="/privacy" className="underline underline-offset-2 hover:text-forest">Privacy policy</a>.</p>}
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

const FIELD_STEP: Record<string, number> = {
  first_name: 0, last_name: 0, email: 0, phone: 0, current_country: 0, preferred_contact: 0, time_zone: 0,
  ghana_region: 1, district: 1, locality: 1, gps: 1, plot_number: 1, land_area: 1, area_unit: 1, access: 1, land_controller: 1, acquired: 1, site_contact_phone: 1,
  intended_use: 2, use_other: 2, finish: 2, budget_band: 2, budget_currency: 2, funds: 2, target_start: 2, design_status: 2,
  inventory: 3, consent_authority: 4, consent_privacy: 4, consent_scope: 4, consent_site_contact: 4,
};
const stepOfField = (f?: string) => (f ? FIELD_STEP[f.split(".")[0]] ?? null : null);

export function ScopeBox() {
  return (
    <div className="rounded-2xl border border-line p-5 text-[14.5px] leading-relaxed text-ink/80">
      <p className="font-semibold text-forest">What the review covers</p>
      <ul className="mt-2 list-disc space-y-1 pl-5">
        <li>A scheduled, documented site visit (access, visible boundaries, drainage, utilities, apparent risks, photos).</li>
        <li>A review of your land paperwork, drawings and budget for completeness and consistency.</li>
        <li>A permit checklist for your assembly, with sources and the date checked.</li>
        <li>A preliminary cost range in GHS and USD with written assumptions — not a quote.</li>
        <li>A recommendation (proceed · proceed after conditions · pause), approved by a human reviewer.</li>
      </ul>
      <p className="mt-3 font-semibold text-forest">What it doesn't cover</p>
      <p className="mt-1">It is not a legal opinion, boundary certification, structural engineering report, valuation or fixed quote. A title opinion only comes from independent Ghana-qualified counsel and is a separate, optional engagement — never bundled silently. Third-party costs (e.g. official search fees, surveyor or engineer visits, travel outside coverage) are quoted to you first and only charged with your approval.</p>
    </div>
  );
}
