import Link from "next/link";
import { PhotoHero } from "@/components/media/PhotoHero";
import { Photo } from "@/components/media/Photo";
import { pageGraph, pageMeta } from "@/lib/seo";
import { CheckList, CtaBand, FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { Icon } from "@/components/ui/Icons";
import { audienceFaqs, audienceSections } from "@/content/audiences";
import { disclaimers } from "@/config/site";

const title = "Who We Serve in Ghana";
const description = "Construction readiness and oversight for the diaspora, returning residents, owners living in Ghana and international property investors.";
const path = "/who-we-serve";
const crumbs = [{ name: "Home", href: "/" }, { name: "Who we serve", href: path }];

export const metadata = pageMeta({ title, description, path });

export default function WhoWeServe() {
  return (
    <>
      <JsonLd data={pageGraph({ path, title, description, crumbs, faqs: audienceFaqs })} />
      <PhotoHero image="accra_laterite_road_homes" kicker="Who we serve" title={<>One process for owners in Ghana, coming home, or building from abroad.</>}>
        BuildGhana works with four kinds of owners: the diaspora, returning residents, people living in Ghana and international property investors. Each gets the same evidence standard: a documented site visit, a permit checklist, provisional costs in cedis and dollars, and a clear recommendation.
      </PhotoHero>

      <nav aria-label="Jump to an audience" className="border-b border-line bg-ivory-2">
        <ul className="container-x flex flex-wrap gap-x-6 gap-y-1 py-4 text-[15px]">
          {audienceSections.map((a) => (
            <li key={a.id}><a href={`#${a.id}`} className="inline-flex min-h-11 items-center font-semibold text-forest hover:text-gold-2">{a.title}</a></li>
          ))}
        </ul>
      </nav>

      {audienceSections.map((a, i) => (
        <section key={a.id} id={a.id} aria-labelledby={`${a.id}-title`} className={`scroll-mt-24 py-20 sm:py-24 ${i % 2 ? "bg-ivory-2" : ""}`}>
          <div className="container-x grid gap-10 lg:grid-cols-2 lg:items-center">
            <div className={i % 2 ? "lg:order-2" : ""}>
              <Photo name={a.image} className="aspect-[4/3] overflow-hidden rounded-[22px]" sizes="(min-width:1024px) 50vw, 100vw" />
            </div>
            <div className="min-w-0">
              <h2 id={`${a.id}-title`} className="font-display text-[2rem] leading-tight text-forest sm:text-[2.4rem]">{a.title}</h2>
              <p className="mt-4 text-[17px] leading-relaxed text-ink/85">{a.intro}</p>
              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <div>
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-gold-2">What you usually need</h3>
                  <div className="mt-4"><CheckList items={a.needs} /></div>
                </div>
                <div>
                  <h3 className="text-[13px] font-semibold uppercase tracking-[0.16em] text-gold-2">How we work with you</h3>
                  <div className="mt-4"><CheckList items={a.howWeWork} /></div>
                </div>
              </div>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href={a.cta.href} className="btn-gold">{a.cta.label} <Icon name="arrow" className="h-4 w-4" /></Link>
                {a.secondary && <Link href={a.secondary.href} className="inline-flex min-h-11 items-center gap-2 font-semibold text-forest hover:text-gold-2">{a.secondary.label} <Icon name="arrow" className="h-4 w-4" /></Link>}
              </div>
            </div>
          </div>
        </section>
      ))}

      <section className="py-20 sm:py-24" aria-labelledby="serve-faq">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHead eyebrow="Questions" title="Straight answers for every kind of owner" />
            <p className="mt-6 text-sm leading-relaxed text-muted">{disclaimers.regulatory}</p>
          </div>
          <div id="serve-faq"><FaqList faqs={audienceFaqs} /></div>
        </div>
      </section>
      <CtaBand heading="Not sure where to start?" body="Tell us where the land is and what you want to build. We'll confirm coverage and the right first step." />
    </>
  );
}
