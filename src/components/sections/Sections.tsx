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

/** Card teaser: first sentence (two if the first is very short), never a doubled full stop. */
export function teaser(t: string): string {
  const parts = t.match(/[^.!?]+[.!?]+(\s|$)/g)?.map((x) => x.trim()) ?? [t];
  return parts[0].length < 40 && parts[1] ? `${parts[0]} ${parts[1]}` : parts[0];
}

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
                <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-ivory/75">{teaser(s.lede)}</p>
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
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-2">{modeLabel[s.mode]}</span>
                <span className="mt-1.5 font-display text-[1.32rem] leading-snug text-forest">{s.navLabel}</span>
                <span className="mt-2 text-[14.5px] leading-relaxed text-muted">{teaser(s.lede)}</span>
              </span>
            </Link>
          </li>
        ))}
        {rest.length % 3 === 2 && (
          <li className="bg-forest sm:col-span-2 lg:col-span-1">
            <Link href={readiness.path} className="group flex h-full flex-col justify-between gap-6 p-6 text-ivory sm:p-7">
              <span>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Not sure where to start?</span>
                <span className="mt-1.5 block font-display text-[1.32rem] leading-snug">Begin with a Ghana Build Readiness Review.</span>
                <span className="mt-2 block text-[14.5px] leading-relaxed text-ivory/70">A paid site visit, paperwork review, counsel-led title check and cost range — before you commit to a service.</span>
              </span>
              <span className="inline-flex items-center gap-2 text-sm font-semibold text-gold">See the review <Icon name="arrow" className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span>
            </Link>
          </li>
        )}
      </ul>
    </div>
  );
}

/** Visual process strip: five photo cards with the deliverable for each step. Swipeable on phones, one row on desktop. */
export function ProcessSection({ dark = false }: { dark?: boolean; compact?: boolean }) {
  const last = processSteps.length - 1;
  return (
    <section className={`py-24 sm:py-28 ${dark ? "bg-forest text-ivory" : ""}`}>
      <div className="container-x">
        <div className="grid gap-8 lg:grid-cols-[1fr_1fr] lg:items-end">
          <SectionHead dark={dark} eyebrow="How it works" title="A clear path from first call to handover." />
          <p className={`lede max-w-xl ${dark ? "text-ivory/75" : "text-muted"}`}>Every engagement follows the same disciplined sequence. Each step ends with something you can hold — a document, a decision or a record — so you always know what you've paid for and what happens next.</p>
        </div>
        <p className={`mt-10 flex items-center gap-2 text-[13px] font-medium sm:hidden ${dark ? "text-ivory/60" : "text-muted"}`} aria-hidden>Swipe through the five steps <Icon name="arrow" className="h-3.5 w-3.5" /></p>
        <ol tabIndex={0} aria-label="Five-step process" className="-mx-5 mt-4 flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-5 px-5 pb-3 [scrollbar-width:none] sm:mx-0 sm:mt-14 sm:grid sm:snap-none sm:grid-cols-2 sm:gap-5 sm:overflow-visible sm:px-0 sm:pb-0 lg:grid-cols-5 lg:gap-4">
          {processSteps.map((p, i) => (
            <li key={p.n} className={`flex w-[82%] shrink-0 snap-start flex-col overflow-hidden rounded-[20px] ring-1 sm:w-auto ${dark ? "bg-forest-2 ring-ivory/10" : "bg-white ring-line"} ${i === last ? "sm:col-span-2 lg:col-span-1" : ""}`}>
              <Photo name={p.image as StockKey} className={`aspect-[4/3] ${i === last ? "sm:aspect-[16/7] lg:aspect-[4/3]" : ""}`} sizes="(min-width:1024px) 19vw, (min-width:640px) 45vw, 82vw" labelPosition="bl" />
              <div className="flex flex-1 flex-col p-6">
                <div className="flex items-center gap-3">
                  <span className="num-serif text-[2.1rem] leading-none text-gold-2">{p.n}</span>
                  <span className={`h-px flex-1 ${dark ? "bg-ivory/15" : "bg-line"}`} />
                  {i < last && <Icon name="arrow" className="hidden h-4 w-4 text-gold-2 lg:block" />}
                </div>
                <h3 className={`mt-4 font-display text-[1.45rem] leading-tight ${dark ? "text-ivory" : "text-forest"}`}>{p.title}</h3>
                <p className={`mt-2 text-[15px] leading-relaxed ${dark ? "text-ivory/75" : "text-muted"}`}>{p.body}</p>
                <div className="mt-auto pt-5">
                  <div className={`min-h-[92px] border-t pt-4 ${dark ? "border-ivory/12" : "border-line"}`}>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold-2">You receive</p>
                    <p className={`mt-1 text-[14px] leading-snug ${dark ? "text-ivory/90" : "text-forest"}`}>{p.deliverable}</p>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

const reviewOwner = (i: number) => (i < 3 ? "You" : i < 6 ? "We" : "Optional");

/** Homepage product card for the paid Readiness Review, set on ivory so it reads as its own offer after the hero. */
export function ReadinessFeature() {
  return (
    <section className="bg-ivory pb-20 pt-14 sm:pb-24 sm:pt-20" aria-labelledby="rr-feature-title">
      <div className="container-x">
        <Reveal className="grain relative overflow-hidden rounded-[28px] bg-forest text-ivory shadow-[0_24px_60px_-30px_rgba(18,41,31,0.5)] ring-1 ring-gold/25">
          <div className="grid lg:grid-cols-[1.1fr_0.9fr]">
            <div className="p-7 sm:p-12 lg:p-14">
              <div className="flex flex-wrap items-center gap-3">
                <span className="rounded-full bg-gold px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-forest">New</span>
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold">Paid review · fixed scope</span>
              </div>
              <h2 id="rr-feature-title" className="display-lg mt-5 max-w-xl">The {readiness.name}</h2>
              <p className="lede mt-5 max-w-xl text-ivory/80">{readiness.promise} A documented site visit, a professional review of your paperwork, drawings and budget, a counsel-led title check and a clear recommendation — before you commit construction money.</p>
              <ul className="mt-8 grid gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {["Documented site visit with photos", "Title check led by Ghanaian counsel", "Permit checklist and a GHS/USD cost range", "A clear call: proceed, proceed with conditions, or pause"].map((t) => (
                  <li key={t} className="flex gap-3 text-[15px] leading-snug text-ivory/90"><Icon name="check" className="mt-0.5 h-5 w-5 shrink-0 text-gold" />{t}</li>
                ))}
              </ul>
              <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link href={`${readiness.path}/start`} className="btn-gold">{readiness.cta} <Icon name="arrow" className="h-4 w-4" /></Link>
                <Link href={readiness.path} className="btn-ghost-light">What's included</Link>
              </div>
              <p className="mt-5 max-w-xl text-[13.5px] leading-relaxed text-ivory/65">{readiness.pricePlaceholder} · {readiness.priceNote}</p>
            </div>
            <Photo name="site_engineers_hi_vis" labelPosition="tr" className="aspect-[16/10] lg:aspect-auto lg:h-full" sizes="(min-width:1024px) 42vw, 100vw" />
          </div>
          <ol aria-label="How the review works" className="grid grid-cols-2 border-t border-ivory/12 sm:grid-cols-4 lg:grid-cols-7">
            {reviewSteps.map((s, i) => (
              <li key={s.n} className={`border-ivory/12 px-5 py-5 sm:px-6 lg:border-l lg:first:border-l-0 [&:nth-child(n+3)]:border-t sm:[&:nth-child(n+3)]:border-t-0 sm:[&:nth-child(n+5)]:border-t lg:[&:nth-child(n+5)]:border-t-0 ${i % 2 === 0 ? "border-r sm:border-r-0" : ""} ${i === reviewSteps.length - 1 ? "col-span-2 border-r-0 sm:col-span-1" : ""}`}>
                <div className="flex items-center gap-2.5">
                  <span className="num-serif text-[1.35rem] leading-none text-gold">{s.n}</span>
                  <span className="rounded-full border border-ivory/20 px-2 py-0.5 text-xs font-semibold uppercase tracking-[0.14em] text-ivory/70">{reviewOwner(i)}</span>
                </div>
                <p className="mt-2.5 text-[14.5px] font-semibold leading-snug text-ivory">{s.title}</p>
              </li>
            ))}
          </ol>
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
          <p className="mt-6 text-xs font-semibold uppercase tracking-[0.16em] text-gold-2">{x.t}</p>
          <h3 className="mt-2 font-display text-[1.5rem] leading-snug text-forest">Case study in preparation</h3>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{x.d} Published only with documented evidence and the owner's written permission.</p>
        </article>
      ))}
    </div>
  );
}

export function FounderSection() {
  const creds = [...verifiedOnly(founder.namedRoles), ...verifiedOnly(founder.credentials)];
  return (
    <section className="py-24 sm:py-28">
      <div className="container-x grid items-center gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-20">
        <div className="relative">
          {founder.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={founder.photo} alt={founder.name} className="aspect-[4/5] w-full rounded-[26px] object-cover" />
          ) : (
            <figure className="grain relative overflow-hidden rounded-[26px] bg-forest p-8 text-ivory sm:p-10">
              <div className="flex items-center gap-4">
                <span aria-hidden className="flex h-14 w-14 items-center justify-center rounded-full border border-gold/50 font-display text-xl text-gold">GA</span>
                <span className="text-[12px] font-semibold uppercase tracking-[0.18em] text-gold">Founder &amp; Principal</span>
              </div>
              <p className="mt-10 font-display text-[1.9rem] leading-[1.18] text-ivory sm:text-[2.3rem]">One accountable person, from first call to handover.</p>
              <figcaption className="mt-8 border-t border-ivory/12 pt-5 text-sm text-ivory/70">The principle behind every BuildGhana Abroad engagement.</figcaption>
            </figure>
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
            <Photo name="accra_apartments_east_legon" className="aspect-[16/10]" sizes="(min-width:1024px) 30vw, 100vw" />
          </div>
        </div>
        <LeadForm funnel={funnel} defaultService={defaultService} defaultStage={defaultStage} variant="card" />
      </div>
    </section>
  );
}
