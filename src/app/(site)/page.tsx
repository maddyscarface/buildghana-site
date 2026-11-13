import Link from "next/link";
import { pageMeta, pageGraph } from "@/lib/seo";
import { audiences, benefits, commitments, homeAnswers, homeFaqs, problems, solutions } from "@/content/home";
import { Icon } from "@/components/ui/Icons";
import { CtaBand, FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { CaseStudyPlaceholders, DashboardSection, FormSection, FounderSection, ProcessSection, ReadinessFeature, ServicesGrid } from "@/components/sections/Sections";
import { Photo } from "@/components/media/Photo";
import { Reveal } from "@/components/motion/Reveal";

const description = "Construction oversight, land and build readiness services for Ghanaians at home and abroad. Plan confidently with BuildGhana.";
export const metadata = pageMeta({ title: "Construction Management in Ghana", description, path: "/" });

export default function HomePage() {
  return (
    <>
      <JsonLd data={pageGraph({ path: "/", title: "Construction Management in Ghana", description, faqs: [...homeAnswers, ...homeFaqs], image: "/images/stock/hero-modern-house-accra.jpg" })} />

      {/* HERO — full-bleed photograph */}
      <section className="relative isolate -mt-[72px] overflow-hidden bg-forest text-ivory">
        <Photo name="hero_modern_house_accra" priority sizes="100vw" className="photo-shade absolute inset-0 -z-10 h-full w-full" imgClassName="object-[70%_center]" labelClassName="top-[84px] right-4 sm:top-[96px] sm:right-6" />
        <div className="container-x relative flex min-h-[640px] flex-col justify-end pb-14 pt-36 sm:min-h-[720px] lg:min-h-[86vh] lg:justify-center lg:pb-24 lg:pt-40">
          <div className="max-w-3xl">
            <p className="kicker text-gold"><span className="hairline" />Building, buying or selling property in Ghana</p>
            <h1 className="display-xl mt-6">Build in Ghana With <span className="italic text-gold">Local Oversight</span> and Clear Decisions</h1>
            <p className="lede mt-7 max-w-2xl text-ivory/85">BuildGhana helps owners in Ghana and abroad plan construction, review building readiness, coordinate project oversight and submit private land or property inquiries. Work starts with clear documentation, defined responsibilities and next steps.</p>
            <div className="mt-9 flex flex-col flex-wrap gap-3 sm:flex-row">
              <Link href="/ghana-build-readiness-review" className="btn-gold">Get a Build Readiness Review <Icon name="arrow" className="h-4 w-4" /></Link>
              <Link href="/property" className="btn-ghost-light backdrop-blur-sm">Explore Property Opportunities</Link>
            </div>
            <p className="mt-5 text-[15px] text-ivory/75">Already building? <Link href="/assessment" className="link-underline font-semibold text-ivory">Request Construction Oversight</Link></p>
          </div>
        </div>
        <div className="relative border-t border-ivory/12 bg-forest/70 backdrop-blur-md">
          <ul className="container-x grid gap-3.5 py-6 sm:grid-cols-3 sm:gap-10 sm:py-7">
            {benefits.map((b, i) => (
              <li key={b.title} className="flex items-baseline gap-4 sm:items-start">
                <span className="num-serif text-xl text-gold">0{i + 1}</span>
                <span>
                  <span className="block font-semibold text-ivory">{b.title}</span>
                  <span className="mt-1 hidden text-sm leading-relaxed text-ivory/70 sm:block">{b.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* WHO WE SERVE — diverse, Ghana-specific illustrative photography */}
      <section className="py-24 sm:py-28" aria-labelledby="audiences-title">
        <div className="container-x">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <SectionHead eyebrow="Who we work with" title="For owners at home, returning, or abroad." />
            <p className="lede max-w-xl text-muted">Same process, same paperwork standards, wherever you live. Pay in cedis or dollars, talk by WhatsApp, phone or email, and meet on site or on video.</p>
          </div>
          <ul className="mt-14 grid gap-6 md:grid-cols-3">
            {audiences.map((a, i) => (
              <Reveal as="li" key={a.title} delay={i * 80} className="overflow-hidden rounded-[22px] border border-line bg-white">
                <Photo name={a.image} className="aspect-[4/5] sm:aspect-[4/3] md:aspect-[4/5]" sizes="(min-width:768px) 33vw, 100vw" />
                <div className="p-6 sm:p-7">
                  <h3 className="font-display text-[1.5rem] leading-snug text-forest">{a.title}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed text-muted">{a.body}</p>
                  <Link href={a.href} className="mt-4 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-forest hover:text-gold-2">{a.cta} <Icon name="arrow" className="h-4 w-4" /></Link>
                </div>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      <ReadinessFeature />

      {/* ANSWERS — question-led H2s with direct answers (AEO). Mirrored exactly in the page's FAQPage JSON-LD. */}
      <section className="py-24 sm:py-28" aria-label="Answers to common questions">
        <div className="container-x">
          <SectionHead eyebrow="Straight answers" title="What owners, sellers and buyers ask us first." />
          <div className="mt-12 grid gap-x-14 gap-y-12 lg:grid-cols-2">
            {homeAnswers.map((a) => (
              <article key={a.q} className="border-t border-line pt-7">
                <h2 className="font-display text-[1.55rem] leading-snug text-forest sm:text-[1.75rem]">{a.q}</h2>
                <p className="mt-3 text-[16px] leading-relaxed text-ink/85">{a.a}</p>
                <Link href={a.href} className="mt-3 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-forest hover:text-gold-2">{a.link} <Icon name="arrow" className="h-4 w-4" /></Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* PROPERTY — off-market introductions */}
      <section className="pb-24 sm:pb-32" aria-labelledby="property-title">
        <div className="container-x">
          <div className="grid overflow-hidden rounded-[26px] border border-line bg-white lg:grid-cols-[0.95fr_1.05fr]">
            <Photo name="east_legon_plots_aerial" className="min-h-[340px] lg:min-h-full" sizes="(min-width:1024px) 45vw, 100vw" />
            <div className="p-8 sm:p-12 lg:p-14">
              <p className="eyebrow">Private property introductions</p>
              <h2 id="property-title" className="mt-3 font-display text-[2rem] leading-[1.1] text-forest sm:text-[2.6rem]">Selling or buying land in Ghana — privately.</h2>
              <p className="mt-4 text-[16.5px] leading-relaxed text-muted">Owners can tell us about land or property without publishing it. Buyers can share what they need without making an offer. We review both sides, and nothing about a seller is shared until the seller authorises it and we approve that specific introduction.</p>
              <ul className="mt-6 space-y-2.5 text-[15px] text-ink/85">
                {["No public listing by default — details stay private", "Ghana-based and international sellers and buyers", "Title and tenure checked by Ghanaian counsel, never assumed", "No deposits, escrow or purchase contracts through BuildGhana"].map((t) => (
                  <li key={t} className="flex gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold-2" />{t}</li>
                ))}
              </ul>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/property/sell" className="btn-forest">List land or property privately</Link>
                <Link href="/property/buy" className="btn-ghost-dark">Tell us what you want to buy</Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATEMENT + COMMITMENTS */}
      <section className="py-24 sm:py-32">
        <div className="container-x grid gap-14 lg:grid-cols-[1.1fr_0.9fr] lg:gap-20">
          <Reveal className="lg:self-center">
            <p className="eyebrow">Why owners trust the process</p>
            <p className="mt-5 font-display text-[2rem] leading-[1.18] text-forest sm:text-[2.7rem]">
              We don't publish testimonials or results we can't document. <span className="italic text-gold-2">Here is what we commit to</span> on every engagement — in writing.
            </p>
          </Reveal>
          <ul className="divide-y divide-line border-y border-line">
            {commitments.map((c, i) => (
              <Reveal as="li" key={c.title} delay={i * 70} className="flex gap-5 py-6">
                <span className="mt-1 text-gold-2"><Icon name="shield" className="h-5 w-5" /></span>
                <span>
                  <span className="block text-[17px] font-semibold text-forest">{c.title}</span>
                  <span className="mt-1.5 block text-[15px] leading-relaxed text-muted">{c.body}</span>
                </span>
              </Reveal>
            ))}
          </ul>
        </div>
      </section>

      {/* PROBLEM / SOLUTION — photo split */}
      <section className="pb-24 sm:pb-32">
        <div className="container-x">
          <div className="grid overflow-hidden rounded-[26px] bg-forest text-ivory lg:grid-cols-2">
            <Photo name="stalled_shell_red_soil" className="min-h-[320px] lg:min-h-full" sizes="(min-width:1024px) 50vw, 100vw" />
            <div className="p-8 sm:p-12 lg:p-14">
              <p className="kicker text-gold"><span className="hairline" />The problem</p>
              <h2 className="mt-4 font-display text-[2rem] leading-[1.1] sm:text-[2.6rem]">Building in Ghana shouldn't mean building on faith.</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ivory/70">Families and investors — in Accra, Kumasi or London — put years of savings into Ghana construction, and too often manage it through voice notes, unverified photos and trust.</p>
              <div className="mt-8 grid gap-8 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#e9a58f]">What goes wrong</p>
                  <ul className="mt-4 space-y-3 text-[14.5px] text-ivory/80">{problems.map((p) => <li key={p} className="flex gap-2.5"><span className="mt-[9px] h-1 w-3 shrink-0 bg-[#e9a58f]/70" />{p}</li>)}</ul>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">How we fix it</p>
                  <ul className="mt-4 space-y-3 text-[14.5px] text-ivory/90">{solutions.map((p) => <li key={p} className="flex gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{p}</li>)}</ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="scroll-mt-20 pb-24 pt-2 sm:pb-32 sm:pt-6">
        <div className="container-x">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <SectionHead eyebrow="Services" title="Seven services. One accountable partner." />
            <p className="lede max-w-xl text-muted">Use one service or all seven. Independent advisory services and construction delivery are scoped separately, so you always know whose interests a report represents.</p>
          </div>
          <div className="mt-14"><ServicesGrid /></div>
        </div>
      </section>

      <div className="bg-ivory-2/60"><ProcessSection /></div>
      <DashboardSection />

      {/* CASE STUDIES */}
      <section className="py-24 sm:py-28">
        <div className="container-x">
          <SectionHead eyebrow="Projects" title="Case studies — documented, not decorated." body="Photographs on this site are illustrative images of Ghana, credited to their photographers. We'll publish project stories only when they're verified and the owner has agreed." />
          <div className="mt-12"><CaseStudyPlaceholders /></div>
        </div>
      </section>

      <div className="border-t border-line"><FounderSection /></div>

      {/* FAQ */}
      <section className="bg-ivory-2/60 py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead eyebrow="FAQ" title="Questions owners ask first." body="Can't find your question? Ask it in your assessment request — a person will answer." />
          <FaqList faqs={homeFaqs} />
        </div>
      </section>

      <FormSection heading="Tell us about your project." body="Answer a few questions about your land, plans and budget. We'll review it personally and recommend the right first step — even if that isn't us." />

      <CtaBand heading="Your build deserves a professional on your side." body="Start with a conversation. We'll tell you plainly what we see and what it will take." secondary={{ label: "See our process", href: "/our-process" }} />
    </>
  );
}
