import Link from "next/link";
import { notFound } from "next/navigation";
import { funnelBySlug, funnelPages } from "@/content/funnels";
import { pageMeta } from "@/lib/seo";
import { HeroArt } from "@/components/visual/HeroArt";
import { DashboardMockup } from "@/components/visual/DashboardMockup";
import { Icon } from "@/components/ui/Icons";
import { CheckList, FaqList, SectionHead } from "@/components/ui/Blocks";
import { LeadForm } from "@/components/form/LeadForm";
import { ViewService } from "@/components/tracking/RouteTracker";

export const dynamicParams = false;
export const generateStaticParams = () => funnelPages.map((f) => ({ funnel: f.slug }));

export async function generateMetadata({ params }: { params: Promise<{ funnel: string }> }) {
  const f = funnelBySlug((await params).funnel);
  if (!f) return {};
  // Paid-traffic pages: noindex to avoid competing with SEO service pages.
  return pageMeta({ title: f.metaTitle, description: f.metaDescription, path: `/lp/${f.slug}`, noindex: true });
}

export default async function FunnelLanding({ params }: { params: Promise<{ funnel: string }> }) {
  const f = funnelBySlug((await params).funnel);
  if (!f) notFound();

  return (
    <>
      <ViewService service={`lp_${f.slug}`} funnel={f.funnel} />
      {/* Hero with form above the fold on desktop, directly below hero copy on mobile */}
      <section className="bg-forest text-ivory">
        <div className="container-x grid gap-10 pb-16 pt-8 sm:pt-14 lg:grid-cols-[1fr_1fr] lg:gap-14 lg:pb-24">
          <div>
            <p className="eyebrow-dark">{f.eyebrow}</p>
            <h1 className="mt-4 text-[2.35rem] leading-[1.05] sm:text-5xl lg:text-[3.5rem]">{f.h1}</h1>
            <p className="mt-5 text-[17px] leading-relaxed text-ivory/75 sm:text-lg">{f.sub}</p>
            <a href="#lead-form" className="btn-gold mt-7 w-full sm:w-auto lg:hidden">{f.cta}</a>
            <div className="mt-10 hidden lg:block">
              {f.visual === "investor" ? <DashboardMockup /> : <HeroArt className="w-full rounded-[24px] ring-1 ring-ivory/10" />}
            </div>
            <ul className="mt-8 space-y-3 lg:mt-8">
              {f.pains.map((p) => <li key={p} className="flex gap-3 text-ivory/80"><span className="text-gold">—</span>{p}</li>)}
            </ul>
          </div>
          <div className="lg:pt-4">
            <div className="rounded-[1.5rem] bg-ivory p-5 text-ink shadow-2xl sm:p-8">
              <p className="eyebrow">{f.offer.name}</p>
              <h2 className="mt-2 text-2xl text-forest sm:text-3xl">{f.formHeading}</h2>
              <p className="mb-6 mt-2 text-sm text-muted">Takes about 3 minutes. A real person reviews every request.</p>
              <LeadForm id="lead-form" funnel={f.funnel} defaultService={f.defaultService} defaultStage={f.defaultStage} />
            </div>
          </div>
        </div>
      </section>

      {/* Offer */}
      <section className="py-20">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHead eyebrow="The first step" title={f.offer.name} body={f.offer.summary} />
            <p className="mt-6 inline-flex rounded-full bg-gold/15 px-4 py-2 text-sm font-semibold text-forest">{f.offer.priceNote}</p>
            <p className="mt-6 text-[15px] leading-relaxed text-muted">{f.offer.next}</p>
          </div>
          <div className="card bg-white p-7">
            <p className="text-sm font-semibold uppercase tracking-wider text-gold-2">What's included</p>
            <div className="mt-5"><CheckList items={f.offer.includes} /></div>
          </div>
        </div>
      </section>

      {/* Steps */}
      <section className="bg-ivory-2 py-20">
        <div className="container-x">
          <SectionHead eyebrow="How it works" title="Four steps. No surprises." />
          <ol className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {f.steps.map((s, i) => (
              <li key={s.title} className="card bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest font-display text-lg text-gold">{i + 1}</span>
                <p className="mt-4 font-semibold text-forest">{s.title}</p>
                <p className="mt-1 text-sm text-muted">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* Objections */}
      <section className="py-20">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead eyebrow="Honest answers" title="What owners ask before they start." />
          <FaqList faqs={f.objections} />
        </div>
      </section>

      <section className="bg-forest py-16 text-ivory">
        <div className="container-x flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
          <h2 className="max-w-2xl text-3xl leading-tight sm:text-4xl">Facts first. Then decide.</h2>
          <div className="flex gap-3">
            <a href="#lead-form" className="btn-gold">{f.cta} <Icon name="arrow" className="h-4 w-4" /></a>
            <Link href="/book-consultation" className="btn-ghost-light hidden sm:inline-flex">Book a call</Link>
          </div>
        </div>
      </section>
    </>
  );
}
