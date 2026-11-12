import Link from "next/link";
import { founder, disclaimers, verifiedOnly } from "@/config/site";
import { services, modeLabel } from "@/content/services";
import { processSteps } from "@/content/home";
import { readiness, reviewSteps } from "@/config/readiness";
import { Icon } from "@/components/ui/Icons";
import { ClaimRow, SectionHead } from "@/components/ui/Blocks";
import { DashboardMockup } from "@/components/visual/DashboardMockup";
import { LeadForm } from "@/components/form/LeadForm";
import { Photo } from "@/components/media/Photo";
import { Reveal } from "@/components/motion/Reveal";
import type { StockKey } from "@/content/images";
import type { Funnel } from "@/lib/lead/options";

export const serviceImage: Record<string, StockKey> = {
  "land-feasibility": "land_site_inspection",
  "design-coordination": "modern_build_scaffold",
  "preconstruction-budgeting": "block_shell_construction",
  "owners-representation": "site_engineers_hi_vis",
  "construction-management-ghana": "site_supervision_columns",
  "ghana-project-rescue": "uncompleted_mansion",
  "ghana-property-development": "accra_apartments_east_legon",
};

/** Editorial services index: two photo-led features, then a refined list. */
export function ServicesGrid({ exclude }: { exclude?: string }) {
  const list = services.filter((s) => s.slug !== exclude);
  const [a, b, ...rest] = list;
  return (
    <div>
      <div className="grid gap-5 lg:grid-cols-2">
        {[a, b].filter(Boolean).map((s, i) => (
          <Reveal key={s.slug} delay={i * 90}>
            <Link href={`/${s.slug}`} className="group img-zoom relative block overflow-hidden rounded-[22px] bg-forest text-ivory">
              <Photo name={serviceImage[s.slug] ?? "land_site_inspection"} className="aspect-[16/11] photo-shade-b" sizes="(min-width:1024px) 45vw, 100vw" labelPosition="tr" creditLink={false} />
              <div className="absolute inset-x-0 bottom-0 z-[1] p-7 sm:p-9">
                <p className="kicker text-gold"><span className="hairline" />{modeLabel[s.mode]}</p>
                <h3 className="mt-3 max-w-md font-display text-[1.9rem] leading-[1.1] sm:text-[2.2rem]">{s.navLabel}</h3>
                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ivory/75">{s.lede.split(". ")[0]}.</p>
                <span className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-gold transition-all group-hover:gap-3">Explore the service <Icon name="arrow" className="h-4 w-4" /></span>
              </div>
            </Link>
          </Reveal>
        ))}
      </div>
      <ul className="mt-5 grid gap-px overflow-hidden rounded-[22px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
        {rest.map((s) => (
          <li key={s.slug} className="bg-ivory">
            <Link href={`/${s.slug}`} className="group flex h-full gap-5 p-6 transition-colors hover:bg-white sm:p-7">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-forest/15 text-forest transition-colors group-hover:border-gold group-hover:bg-forest group-hover:text-gold"><Icon name={s.icon} className="h-5 w-5" /></span>
              <span className="flex flex-col">
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-2">{modeLabel[s.mode]}</span>
                <span className="mt-1.5 font-display text-[1.32rem] leading-snug text-forest">{s.navLabel}</span>
                <span className="mt-2 text-[14.5px] leading-relaxed text-muted">{s.lede.split(". ")[0]}.</span>
              </span>
            </Link>
          </li>
        ))}
        {rest.length % 3 === 2 && (
          <li className="bg-forest sm:col-span-2 lg:col-span-1">
            <Link href={readiness.path} className="group flex h-full flex-col justify-between gap-6 p-6 text-ivory sm:p-7">
              <span>
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Not sure where to start?</span>
                <span className="mt-1.5 block font-display text-[1.32rem] leading-snug">Begin with a Ghana Build Readiness Review.</span>
                <span className="mt-2 block text-[14.5px] leading-relaxed text-ivory/70">A paid, document-based check of land, title, drawings and budget, before you commit to a service.</span>
              </span>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gold">See the review <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}

/** Photo-led visual process: alternating editorial rows with a deliverable for every step. */
export function ProcessSection({ dark = false, compact = false }: { dark?: boolean; compact?: boolean }) {
  return (
    <section className={`py-24 sm:py-28 ${dark ? "bg-forest text-ivory" : ""}`}>
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
          <SectionHead dark={dark} eyebrow="How it works" title="A clear path from first call to handover." />
          <p className={`lede max-w-xl ${dark ? "text-ivory/70" : "text-muted"}`}>Every engagement follows the same disciplined sequence. Each step ends with something you can hold — a document, a decision or a record — so you always know what you've paid for and what happens next.</p>
        </div>
        <ol className="relative mt-16 space-y-6 sm:space-y-8">
          {processSteps.map((p, i) => (
            <Reveal as="li" key={p.n} className={`grid items-stretch gap-0 overflow-hidden rounded-[22px] ${dark ? "bg-forest-2" : "bg-white"} ring-1 ${dark ? "ring-ivory/10" : "ring-line"} ${compact ? "md:grid-cols-[0.8fr_1.2fr]" : "md:grid-cols-2"}`}>
              <Photo name={p.image as StockKey} className={`min-h-[220px] sm:min-h-[280px] ${i % 2 ? "md:order-2" : ""}`} sizes="(min-width:768px) 50vw, 100vw" />
              <div className="flex flex-col justify-center p-7 sm:p-10 lg:p-12">
                <div className="flex items-baseline gap-4">
                  <span className="num-serif text-[3.2rem] leading-none text-gold">{p.n}</span>
                  <span className={`h-px flex-1 ${dark ? "bg-ivory/15" : "bg-line"}`} />
                </div>
                <h3 className={`mt-5 font-display text-[1.75rem] leading-tight sm:text-[2rem] ${dark ? "text-ivory" : "text-forest"}`}>{p.title}</h3>
                <p className={`mt-3 text-[16px] leading-relaxed ${dark ? "text-ivory/72" : "text-muted"}`}>{p.body}</p>
                <p className={`mt-6 flex items-start gap-3 rounded-xl px-4 py-3 text-[14.5px] ${dark ? "bg-ivory/[0.06] text-ivory/85" : "bg-ivory text-forest"}`}>
                  <Icon name="fileCheck" className="mt-0.5 h-5 w-5 shrink-0 text-gold-2" />
                  <span><span className="font-semibold">You receive:</span> {p.deliverable}</span>
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}

/** Premium homepage card for the paid Readiness Review. Price shown only when the owner sets it. */
export function ReadinessFeature() {
  return (
    <section className="relative overflow-hidden bg-forest py-24 text-ivory sm:py-28 grain">
      <div className="container-x relative grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        <Reveal>
          <p className="kicker text-gold"><span className="hairline" />New · Paid review</p>
          <h2 className="display-lg mt-5">The {readiness.name}</h2>
          <p className="lede mt-6 max-w-xl text-ivory/75">{readiness.promise} Your land documents, drawings, permit position and budget are reviewed by a construction professional — and title is checked by independent Ghanaian counsel.</p>
          <ul className="mt-8 grid gap-x-8 gap-y-4 sm:grid-cols-2">
            {["Secure, private document upload", "Title verification by Ghanaian counsel", "Rated findings: ready · attention · not ready", "Branded PDF report and walkthrough call"].map((t) => (
              <li key={t} className="flex gap-3 text-[15px] text-ivory/85"><Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-gold" />{t}</li>
            ))}
          </ul>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link href={`${readiness.path}/start`} className="btn-gold">Start your Readiness Review <Icon name="arrow" className="h-4 w-4" /></Link>
            <Link href={readiness.path} className="btn-ghost-light">What's included</Link>
          </div>
          <p className="mt-5 text-sm text-ivory/55">{readiness.pricePlaceholder} · {readiness.priceNote}</p>
        </Reveal>
        <Reveal delay={120} className="relative">
          <div className="relative overflow-hidden rounded-[26px] ring-1 ring-ivory/12">
            <Photo name="site_engineers_hi_vis" labelPosition="tl" className="aspect-[4/5] sm:aspect-[5/5]" sizes="(min-width:1024px) 42vw, 100vw" priority={false} />
          </div>
          <div className="absolute -bottom-6 left-4 right-4 rounded-2xl bg-ivory p-5 text-ink shadow-2xl sm:left-auto sm:right-[-12px] sm:w-[320px]">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gold-2">What happens</p>
            <ol className="mt-3 space-y-2.5">
              {reviewSteps.slice(0, 4).map((s) => (
                <li key={s.n} className="flex gap-3 text-[14px]"><span className="num-serif text-gold-2">{s.n}</span><span className="text-forest">{s.title}</span></li>
              ))}
            </ol>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

export function DashboardSection() {
  return (
    <section className="overflow-hidden bg-ivory-2 py-24 sm:py-28">
      <div className="container-x grid items-center gap-14 lg:grid-cols-2">
        <div>
          <SectionHead eyebrow="Reporting" title="See your project the way a lender would." body="Every report follows the same structure: progress against plan, budget status, verified payment requests, issues, and the decisions we need from you — backed by dated photo and video evidence." />
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {["Progress by construction stage", "Budget and change-order tracking", "Payment verification before release", "Hold-point inspection records"].map((t) => (
              <li key={t} className="flex gap-3 text-ink/85"><span className="text-gold-2"><Icon name="check" className="h-5 w-5" /></span>{t}</li>
            ))}
          </ul>
          <p className="mt-6 text-xs text-muted">Sample report layout with illustrative figures.</p>
        </div>
        <div className="rounded-[26px] bg-forest p-3 shadow-2xl sm:p-5"><DashboardMockup /></div>
      </div>
    </section>
  );
}

/** Honest placeholder for case studies: no stock imagery, no invented outcomes. */
export function CaseStudyPlaceholders() {
  return (
    <div className="grid gap-px overflow-hidden rounded-[22px] border border-line bg-line md:grid-cols-3">
      {[
        { t: "New home construction", d: "Scope, schedule and budget — planned against actual." },
        { t: "Stalled project recovery", d: "Starting condition, findings and the recovery path taken." },
        { t: "Rental development", d: "Feasibility assumptions measured against delivery." },
      ].map((x, i) => (
        <article key={x.t} className="flex flex-col bg-ivory p-7 sm:p-9">
          <span className="num-serif text-[2.4rem] leading-none text-gold-2">0{i + 1}</span>
          <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-2">{x.t}</p>
          <h3 className="mt-2 font-display text-[1.5rem] leading-snug text-forest">Case study in preparation</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{x.d} Published only with documented evidence and the owner's written permission.</p>
        </article>
      ))}
    </div>
  );
}

export function FounderSection() {
  const creds = verifiedOnly(founder.credentials);
  return (
    <section className="py-24 sm:py-28">
      <div className="container-x grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="relative">
          {founder.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={founder.photo} alt={founder.name} className="aspect-[4/5] w-full rounded-[26px] object-cover" />
          ) : (
            <div className="relative flex aspect-[4/5] w-full flex-col justify-between overflow-hidden rounded-[26px] bg-forest p-8 text-ivory grain">
              <span className="kicker text-gold"><span className="hairline" />Founder & Principal</span>
              <span className="num-serif select-none text-[9rem] leading-none text-gold/90 sm:text-[11rem]" aria-hidden>GA</span>
              <span className="font-display text-2xl italic text-ivory/85">One accountable person, from first call to handover.</span>
            </div>
          )}
        </div>
        <div>
          <p className="eyebrow">Leadership</p>
          <h2 className="mt-3 font-display text-[2.4rem] leading-tight text-forest sm:text-[3rem]">{founder.name}</h2>
          <p className="mt-1 font-semibold text-gold-2">{founder.role}</p>
          <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink/85">{founder.bio.map((b) => <p key={b}>{b}</p>)}</div>
          {creds.length > 0 && <ul className="mt-8 grid gap-3 sm:grid-cols-2">{creds.map((c) => <ClaimRow key={c.label} claim={c} />)}</ul>}
          <p className="mt-8 border-l-2 border-gold pl-4 text-sm leading-relaxed text-muted">{disclaimers.licensing}</p>
        </div>
      </div>
    </section>
  );
}

export function FormSection({ funnel = "general", defaultService, defaultStage, heading, body, points }: {
  funnel?: Funnel; defaultService?: string; defaultStage?: string; heading: string; body: string; points?: string[];
}) {
  return (
    <section id="assessment" className="scroll-mt-20 bg-ivory-2 py-24 sm:py-28">
      <div className="container-x grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">Project assessment</p>
          <h2 className="mt-3 font-display text-[2.2rem] leading-[1.08] text-forest sm:text-[2.8rem]">{heading}</h2>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">{body}</p>
          <ul className="mt-6 space-y-3 text-[15px] text-ink/85">
            {(points ?? ["Takes about 3 minutes", "A real person reviews every request", "We reply within one business day (U.S. Eastern)", "No obligation — the discovery call is free"]).map((p) => (
              <li key={p} className="flex gap-3"><span className="text-gold-2"><Icon name="check" className="h-5 w-5" /></span>{p}</li>
            ))}
          </ul>
          <div className="mt-8 hidden overflow-hidden rounded-[20px] lg:block">
            <Photo name="accra_apartments_east_legon" className="aspect-[16/10]" sizes="30vw" />
          </div>
        </div>
        <LeadForm funnel={funnel} defaultService={defaultService} defaultStage={defaultStage} variant="card" />
      </div>
    </section>
  );
}
