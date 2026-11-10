import Link from "next/link";
import { pageMeta, faqJsonLd } from "@/lib/seo";
import { benefits, commitments, homeFaqs, problems, solutions } from "@/content/home";
import { ghanaCredentials } from "@/config/site";
import { HeroArt } from "@/components/visual/HeroArt";
import { Icon } from "@/components/ui/Icons";
import { CheckList, ClaimRow, CtaBand, FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { CaseStudyPlaceholders, DashboardSection, FormSection, FounderSection, ProcessSection, ServicesGrid } from "@/components/sections/Sections";

export const metadata = pageMeta({
  title: "Construction Management in Ghana for Owners Abroad | BuildGhana Abroad",
  description: "Build in Ghana and stay in control from abroad. Independent project oversight, construction management and transparent reporting for overseas owners building homes and investment property.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <JsonLd data={faqJsonLd(homeFaqs)} />

      {/* HERO */}
      <section className="relative overflow-hidden bg-forest text-ivory">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(#F7F3EB_1px,transparent_1px),linear-gradient(90deg,#F7F3EB_1px,transparent_1px)] [background-size:56px_56px]" />
        <div className="container-x relative grid items-center gap-10 pb-16 pt-10 sm:pt-16 lg:grid-cols-[1.08fr_0.92fr] lg:gap-14 lg:pb-24 lg:pt-20">
          <div>
            <p className="eyebrow-dark">Construction management for owners abroad</p>
            <h1 className="mt-4 text-[2.65rem] leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
              Build in Ghana.<br /><span className="italic text-gold">Stay in control</span> from abroad.
            </h1>
            <p className="mt-6 max-w-xl text-[17px] leading-relaxed text-ivory/78 sm:text-lg">
              Professional construction management, independent project oversight and transparent coordination for overseas property owners building homes and developing real estate in Ghana.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/assessment" className="btn-gold">Request a Project Assessment <Icon name="arrow" className="h-4 w-4" /></Link>
              <Link href="#services" className="btn-ghost-light">Explore Our Services</Link>
            </div>
            <ul className="mt-10 grid gap-5 border-t border-ivory/12 pt-8 sm:grid-cols-3">
              {benefits.map((b) => (
                <li key={b.title}>
                  <p className="font-semibold text-ivory">{b.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-ivory/65">{b.body}</p>
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <HeroArt className="w-full rounded-[28px] shadow-2xl ring-1 ring-ivory/10" />
            <p className="mt-2 text-right text-[11px] text-ivory/40">Illustration — project photography to follow</p>
          </div>
        </div>
      </section>

      {/* TRUST */}
      <section className="border-b border-line py-20">
        <div className="container-x">
          <SectionHead eyebrow="Why owners trust the process" title="Trust built on evidence, not promises." body="We don't publish testimonials or results we can't document. Here is what we commit to on every engagement." />
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {commitments.map((c) => (
              <div key={c.title} className="card p-6">
                <span className="text-gold-2"><Icon name="shield" /></span>
                <h3 className="mt-4 text-lg font-semibold text-forest" style={{ fontFamily: "var(--font-sans)" }}>{c.title}</h3>
                <p className="mt-2 text-[15px] leading-relaxed text-muted">{c.body}</p>
              </div>
            ))}
          </div>
          <details className="mt-8 rounded-2xl border border-line bg-white/60 p-5">
            <summary className="cursor-pointer text-sm font-semibold text-forest">Ghana registrations & insurance</summary>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2">{ghanaCredentials.map((c) => <ClaimRow key={c.label} claim={c} />)}</ul>
          </details>
        </div>
      </section>

      {/* PROBLEM / SOLUTION */}
      <section className="py-24">
        <div className="container-x">
          <SectionHead eyebrow="The problem" title="Building from abroad shouldn't mean building on faith." body="Families and investors abroad put years of savings into Ghana construction — and too often manage it through voice notes, unverified photos and trust. The result is predictable." />
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <div className="rounded-[var(--radius-card)] border border-[#a2402b]/15 bg-[#a2402b]/[0.04] p-7">
              <p className="text-sm font-bold uppercase tracking-wider text-[#8a3a26]">What goes wrong</p>
              <ul className="mt-5 space-y-3.5">{problems.map((p) => <li key={p} className="flex gap-3 text-ink/85"><span className="mt-0.5 text-[#a2402b]">✕</span>{p}</li>)}</ul>
            </div>
            <div className="rounded-[var(--radius-card)] bg-forest p-7 text-ivory">
              <p className="eyebrow-dark">How we fix it</p>
              <div className="mt-5"><CheckList dark items={solutions} /></div>
            </div>
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="scroll-mt-20 bg-ivory-2 py-24">
        <div className="container-x">
          <SectionHead eyebrow="Services" title="Seven services. One accountable partner." body="Use one service or all seven. Independent advisory services and construction delivery are scoped separately, so you always know whose interests a report represents." />
          <div className="mt-12"><ServicesGrid /></div>
        </div>
      </section>

      <ProcessSection />
      <DashboardSection />

      {/* CASE STUDIES */}
      <section className="py-24">
        <div className="container-x">
          <SectionHead eyebrow="Projects" title="Case studies — documented, not decorated." body="We publish project stories only when they are verified and the owner has agreed. These spaces are reserved for them." />
          <div className="mt-12"><CaseStudyPlaceholders /></div>
        </div>
      </section>

      <div className="border-t border-line bg-ivory-2/50"><FounderSection /></div>

      {/* FAQ */}
      <section className="py-24">
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
