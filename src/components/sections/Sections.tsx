import Link from "next/link";
import { founder, disclaimers } from "@/config/site";
import { services, modeLabel } from "@/content/services";
import { processSteps } from "@/content/home";
import { Icon } from "@/components/ui/Icons";
import { ClaimRow, Placeholder, SectionHead } from "@/components/ui/Blocks";
import { DashboardMockup } from "@/components/visual/DashboardMockup";
import { LeadForm } from "@/components/form/LeadForm";
import type { Funnel } from "@/lib/lead/options";

export function ServicesGrid({ exclude }: { exclude?: string }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {services.filter((s) => s.slug !== exclude).map((s, i) => (
        <Link key={s.slug} href={`/${s.slug}`} className="group card flex flex-col p-6 transition-all hover:-translate-y-0.5 hover:border-forest/30 hover:bg-white hover:shadow-lg">
          <div className="flex items-start justify-between">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-forest text-gold"><Icon name={s.icon} /></span>
            <span className="font-display text-sm text-muted">0{i + 1}</span>
          </div>
          <h3 className="mt-5 text-xl leading-snug text-forest">{s.navLabel}</h3>
          <p className="mt-2 flex-1 text-[15px] leading-relaxed text-muted">{s.lede.split(". ")[0]}.</p>
          <p className="mt-4 text-[11px] font-semibold uppercase tracking-wider text-gold-2">{modeLabel[s.mode]}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-forest group-hover:gap-2.5 transition-all">Learn more <Icon name="arrow" className="h-4 w-4" /></span>
        </Link>
      ))}
    </div>
  );
}

export function ProcessSection({ dark = false }: { dark?: boolean }) {
  return (
    <section className={`py-24 ${dark ? "bg-forest-2 text-ivory" : ""}`}>
      <div className="container-x">
        <SectionHead dark={dark} eyebrow="How it works" title="A clear path from first call to handover." body="Every engagement follows the same disciplined sequence, so you always know what happens next and what you're paying for." />
        <ol className="mt-12 grid gap-px overflow-hidden rounded-[var(--radius-card)] bg-line/60 md:grid-cols-5">
          {processSteps.map((p) => (
            <li key={p.n} className={`p-6 ${dark ? "bg-forest-2" : "bg-ivory"}`}>
              <span className="font-display text-3xl text-gold-2">{p.n}</span>
              <h3 className={`mt-3 text-lg font-semibold ${dark ? "text-ivory" : "text-forest"}`} style={{ fontFamily: "var(--font-sans)" }}>{p.title}</h3>
              <p className={`mt-2 text-[15px] leading-relaxed ${dark ? "text-ivory/70" : "text-muted"}`}>{p.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

export function DashboardSection() {
  return (
    <section className="overflow-hidden bg-forest py-24 text-ivory">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHead dark eyebrow="Reporting" title="See your project the way a lender would." body="Every report follows the same structure: progress against plan, budget status, verified payment requests, issues, and the decisions we need from you — backed by dated photo and video evidence." />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {["Progress by construction stage", "Budget and change-order tracking", "Payment verification before release", "Hold-point inspection records"].map((t) => (
              <li key={t} className="flex gap-3 text-ivory/85"><span className="text-gold"><Icon name="check" className="h-5 w-5" /></span>{t}</li>
            ))}
          </ul>
        </div>
        <DashboardMockup />
      </div>
    </section>
  );
}

export function CaseStudyPlaceholders() {
  return (
    <div className="grid gap-5 md:grid-cols-3">
      {["New home construction", "Stalled project recovery", "Rental development"].map((t) => (
        <article key={t} className="card overflow-hidden">
          <Placeholder label="Project photography — to be added from a real, documented project" className="aspect-[4/3] rounded-none border-0 border-b" />
          <div className="p-6">
            <p className="eyebrow">{t}</p>
            <h3 className="mt-2 text-xl text-forest">Verified case study in preparation</h3>
            <p className="mt-2 text-[15px] text-muted">Published only with documented outcomes and the owner's written permission. Each case study will show scope, timeline, budget variance and evidence.</p>
          </div>
        </article>
      ))}
    </div>
  );
}

export function FounderSection() {
  return (
    <section className="py-24">
      <div className="container-x grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          {founder.photo
            ? <img src={founder.photo} alt={founder.name} className="aspect-[4/5] w-full rounded-[var(--radius-card)] object-cover" />
            : <Placeholder label="Founder portrait — add a professional photo" className="aspect-[4/5]" />}
        </div>
        <div>
          <p className="eyebrow">Leadership</p>
          <h2 className="mt-3 text-[2.2rem] leading-tight text-forest sm:text-[2.6rem]">{founder.name}</h2>
          <p className="mt-1 font-semibold text-gold-2">{founder.role}</p>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink/85">{founder.bio.map((b) => <p key={b}>{b}</p>)}</div>
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">{founder.credentials.map((c) => <ClaimRow key={c.label} claim={c} />)}</ul>
          <p className="mt-6 text-sm text-muted">{disclaimers.licensing}</p>
        </div>
      </div>
    </section>
  );
}

export function FormSection({ funnel = "general", defaultService, defaultStage, heading, body, points }: {
  funnel?: Funnel; defaultService?: string; defaultStage?: string; heading: string; body: string; points?: string[];
}) {
  return (
    <section id="assessment" className="scroll-mt-20 bg-ivory-2 py-24">
      <div className="container-x grid gap-12 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">Project assessment</p>
          <h2 className="mt-3 text-[2.2rem] leading-tight text-forest sm:text-[2.6rem]">{heading}</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">{body}</p>
          <ul className="mt-6 space-y-3 text-[15px] text-ink/85">
            {(points ?? ["Takes about 3 minutes", "A real person reviews every request", "We reply within one business day (U.S. Eastern)", "No obligation — the discovery call is free"]).map((p) => (
              <li key={p} className="flex gap-3"><span className="text-gold-2"><Icon name="check" className="h-5 w-5" /></span>{p}</li>
            ))}
          </ul>
        </div>
        <LeadForm funnel={funnel} defaultService={defaultService} defaultStage={defaultStage} variant="card" />
      </div>
    </section>
  );
}
