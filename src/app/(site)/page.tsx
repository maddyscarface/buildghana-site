import Link from "next/link";
import { pageMeta, faqJsonLd } from "@/lib/seo";
import { benefits, commitments, homeFaqs, problems, solutions } from "@/content/home";
import { Icon } from "@/components/ui/Icons";
import { CtaBand, FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { CaseStudyPlaceholders, DashboardSection, FormSection, FounderSection, ProcessSection, ReadinessFeature, ServicesGrid } from "@/components/sections/Sections";
import { Photo } from "@/components/media/Photo";
import { Reveal } from "@/components/motion/Reveal";

export const metadata = pageMeta({
  title: "Construction Management in Ghana for Owners Abroad | BuildGhana Abroad",
  description: "Build in Ghana and stay in control from abroad. Independent project oversight, construction management and transparent reporting for overseas owners building homes and investment property.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqJsonLd(homeFaqs)} />

      {/* HERO — full-bleed photograph */}
      <section className="relative isolate -mt-[72px] overflow-hidden bg-forest text-ivory">
        <Photo name="hero_modern_house_accra" priority sizes="100vw" className="photo-shade absolute inset-0 -z-10 h-full w-full" imgClassName="object-[70%_center]" labelClassName="top-[84px] right-4 sm:top-[96px] sm:right-6" />
        <div className="container-x relative flex min-h-[640px] flex-col justify-end pb-14 pt-36 sm:min-h-[720px] lg:min-h-[86vh] lg:justify-center lg:pb-24 lg:pt-40">
          <div className="max-w-3xl">
            <p className="kicker text-gold"><span className="hairline" />Construction management for owners abroad</p>
            <h1 className="display-xl mt-6">Build in Ghana.<br /><span className="italic text-gold">Stay in control</span> from abroad.</h1>
            <p className="lede mt-7 max-w-xl text-ivory/80">Professional construction management, independent project oversight and transparent coordination for overseas property owners building homes and developing real estate in Ghana.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/assessment" className="btn-gold">Request a Project Assessment <Icon name="arrow" className="h-4 w-4" /></Link>
              <Link href="/ghana-build-readiness-review" className="btn-ghost-light backdrop-blur-sm">Ghana Build Readiness Review</Link>
            </div>
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

      <ReadinessFeature />

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
              <h2 className="mt-4 font-display text-[2rem] leading-[1.1] sm:text-[2.6rem]">Building from abroad shouldn't mean building on faith.</h2>
              <p className="mt-4 text-[16px] leading-relaxed text-ivory/70">Families and investors abroad put years of savings into Ghana construction — and too often manage it through voice notes, unverified photos and trust.</p>
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
