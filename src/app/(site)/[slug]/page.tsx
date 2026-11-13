import Link from "next/link";
import { notFound } from "next/navigation";
import { services, serviceBySlug, modeLabel } from "@/content/services";
import { disclaimers } from "@/config/site";
import { pageMeta, breadcrumbJsonLd, faqJsonLd, serviceJsonLd } from "@/lib/seo";
import { Icon } from "@/components/ui/Icons";
import { Breadcrumbs, CheckList, CtaBand, FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { FormSection, serviceImage } from "@/components/sections/Sections";
import { Photo } from "@/components/media/Photo";
import { ViewService } from "@/components/tracking/RouteTracker";

export const dynamicParams = false;
export const generateStaticParams = () => services.map((s) => ({ slug: s.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const s = serviceBySlug((await params).slug);
  if (!s) return {};
  return pageMeta({ title: s.metaTitle, description: s.metaDescription, path: `/${s.slug}` });
}

const serviceKey: Record<string, string> = {
  "land-feasibility": "land_feasibility", "design-coordination": "design_coordination", "preconstruction-budgeting": "preconstruction",
  "owners-representation": "owners_rep", "construction-management-ghana": "construction_management",
  "ghana-project-rescue": "project_rescue", "ghana-property-development": "development",
};

export default async function ServicePage({ params }: { params: Promise<{ slug: string }> }) {
  const s = serviceBySlug((await params).slug);
  if (!s) notFound();
  const crumbs = [{ name: "Home", href: "/" }, { name: "Services", href: "/#services" }, { name: s.navLabel, href: `/${s.slug}` }];

  return (
    <>
      <ViewService service={s.slug} funnel={s.funnel} />
      <JsonLd data={serviceJsonLd({ name: s.navLabel, description: s.metaDescription, path: `/${s.slug}` })} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />
      <JsonLd data={faqJsonLd(s.faqs)} />

      <section className="relative isolate overflow-hidden bg-forest text-ivory">
        <Photo name={serviceImage[s.slug] ?? "land_site_inspection"} priority sizes="100vw" className="photo-shade absolute inset-0 -z-10 h-full w-full" />
        <div className="container-x pb-20 pt-10 sm:pb-24">
          <Breadcrumbs items={crumbs} />
          <div className="mt-12 grid gap-10 lg:grid-cols-[1.3fr_0.7fr] lg:items-end">
            <div>
              <p className="kicker text-gold"><span className="hairline" />{s.eyebrow}</p>
              <h1 className="mt-5 max-w-3xl font-display text-[2.5rem] leading-[1.04] tracking-[-0.02em] sm:text-5xl lg:text-[3.8rem]">{s.h1}</h1>
              <p className="lede mt-6 max-w-2xl text-ivory/80">{s.lede}</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href={s.cta.href} className="btn-gold">{s.cta.label} <Icon name="arrow" className="h-4 w-4" /></Link>
                <Link href="/book-consultation" className="btn-ghost-light backdrop-blur-sm">Book a discovery call</Link>
              </div>
            </div>
            <div className="rounded-[22px] border border-ivory/15 bg-forest/70 p-6 backdrop-blur-md">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-gold text-forest"><Icon name={s.icon} /></span>
              <p className="mt-4 text-sm font-semibold uppercase tracking-wider text-gold">{modeLabel[s.mode]}</p>
              <p className="mt-2 text-sm leading-relaxed text-ivory/75">{s.mode === "contracting" ? disclaimers.licensing : disclaimers.advisory}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <p className="eyebrow">The problem</p>
            <h2 className="mt-3 text-[2rem] leading-tight text-forest sm:text-[2.4rem]">{s.problem.heading}</h2>
            <p className="mt-4 text-[17px] leading-relaxed text-muted">{s.problem.body}</p>
          </div>
          <ul className="space-y-3 self-center">
            {s.problem.points.map((p) => (
              <li key={p} className="flex gap-3 rounded-xl border border-line bg-white/70 px-5 py-4 text-ink/85"><span className="text-[#a2402b]">•</span>{p}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ivory-2 py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <SectionHead eyebrow="How we help" title="What this service does for you" />
            <div className="mt-6 space-y-4 text-[17px] leading-relaxed text-ink/85">{s.explanation.map((p) => <p key={p}>{p}</p>)}</div>
            <h3 className="mt-10 text-xl text-forest">Who it's for</h3>
            <div className="mt-4"><CheckList items={s.whoFor} /></div>
          </div>
          <div className="card bg-white p-7">
            <p className="eyebrow">Deliverables</p>
            <h3 className="mt-2 text-2xl text-forest">What you receive</h3>
            <ul className="mt-5 divide-y divide-line">
              {s.deliverables.map((d) => <li key={d} className="flex gap-3 py-3 text-[15px] text-ink/85"><Icon name="doc" className="h-5 w-5 shrink-0 text-gold-2" />{d}</li>)}
            </ul>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-x">
          <SectionHead eyebrow="Typical process" title="How the engagement runs" />
          <ol className="mt-10 grid gap-4 md:grid-cols-5">
            {s.process.map((p, i) => (
              <li key={p.title} className="card p-5">
                <span className="font-display text-2xl text-gold-2">0{i + 1}</span>
                <p className="mt-2 font-semibold text-forest">{p.title}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-muted">{p.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {["land-feasibility", "ghana-project-rescue", "preconstruction-budgeting"].includes(s.slug) && (
        <section className="pb-20">
          <div className="container-x">
            <Link href="/ghana-build-readiness-review" className="group grid items-center gap-6 rounded-[22px] border border-gold/40 bg-gold/10 p-7 transition-colors hover:bg-gold/15 sm:grid-cols-[1fr_auto] sm:p-9">
              <span>
                <span className="kicker text-gold-2"><span className="hairline" />Not sure where to start?</span>
                <span className="mt-3 block font-display text-[1.7rem] leading-tight text-forest">Begin with the Ghana Build Readiness Review — a documented site visit, a counsel-led title check, a permit checklist and a cost range.</span>
              </span>
              <span className="btn-forest">See the review <Icon name="arrow" className="h-4 w-4" /></span>
            </Link>
          </div>
        </section>
      )}

      <section className="bg-forest py-20 text-ivory">
        <div className="container-x grid gap-10 lg:grid-cols-2">
          <SectionHead dark eyebrow="Why owners trust us" title="Built-in safeguards" />
          <CheckList dark items={s.trust} />
        </div>
      </section>

      <section className="py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHead eyebrow="FAQ" title="Common questions" />
            <div className="mt-8">
              <p className="text-sm font-semibold text-forest">Related services</p>
              <ul className="mt-3 space-y-2">
                {s.related.map((r) => { const rs = serviceBySlug(r)!; return <li key={r}><Link href={`/${r}`} className="inline-flex min-h-11 items-center gap-2 text-[15px] text-forest underline-offset-4 hover:underline"><Icon name="arrow" className="h-4 w-4 text-gold-2" />{rs.navLabel}</Link></li>; })}
                <li><Link href="/our-process" className="inline-flex min-h-11 items-center gap-2 text-[15px] text-forest underline-offset-4 hover:underline"><Icon name="arrow" className="h-4 w-4 text-gold-2" />Our process</Link></li>
              </ul>
            </div>
          </div>
          <FaqList faqs={s.faqs} />
        </div>
      </section>

      <FormSection funnel={s.funnel} defaultService={serviceKey[s.slug]} defaultStage={s.slug === "ghana-project-rescue" ? "stalled" : undefined} heading={s.cta.heading} body={s.cta.body} />
      <CtaBand heading="Prefer to talk it through first?" body="Book a free 30-minute discovery call at a time that works in your time zone." label="Book a Consultation" href="/book-consultation" />
    </>
  );
}
