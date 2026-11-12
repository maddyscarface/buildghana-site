import Link from "next/link";
import { pageMeta, faqJsonLd, serviceJsonLd } from "@/lib/seo";
import { readiness, reviewAreas, reviewSteps, documentInventory } from "@/config/readiness";
import { Icon, type AnyIcon } from "@/components/ui/Icons";
import { CtaBand, FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { Photo } from "@/components/media/Photo";
import { Reveal } from "@/components/motion/Reveal";
import { PriceTag } from "@/components/readiness/PriceTag";
import { ReadinessView } from "@/components/readiness/ReadinessView";

export const metadata = pageMeta({
  title: "Ghana Build Readiness Review — Land, Title & Budget Check | BuildGhana Abroad",
  description: "A paid, document-based review for owners abroad: land documents, title verification with Ghanaian counsel, drawings, permit position and budget — with a written report before you build.",
  path: readiness.path,
});

const faqs = [
  { q: "Is this a legal title opinion?", a: "No. Title verification is carried out by independent, Ghana-qualified counsel under their own terms, and their findings are summarised in your report. We never state that land is verified unless counsel has signed off." },
  { q: "What if I don't have all the documents?", a: "That's common, and finding the gaps is part of the value. Tell us what you hold in the intake; the report explains what is missing, why it matters and how to obtain it." },
  { q: "Who sees my documents?", a: "Only the reviewer assigned to your case and, for title work, the appointed counsel. Files are stored privately, opened through short-lived links, and every access is logged." },
  { q: "How do I pay?", a: "Through a hosted checkout: card in US dollars via Stripe, or card / mobile money in Ghana cedis via Paystack. Card details never touch our website." },
  { q: "How much does it cost?", a: "The fee is set by BuildGhana and shown on the payment screen before you pay. Counsel's title-search costs, if separate, are confirmed with you before counsel is instructed." },
  { q: "Do I have to use BuildGhana afterwards?", a: "No. The report is yours to use with any builder or professional." },
];

export default function ReadinessReviewPage() {
  return (
    <>
      <ReadinessView />
      <JsonLd data={serviceJsonLd({ name: readiness.name, description: readiness.promise, path: readiness.path })} />
      <JsonLd data={faqJsonLd(faqs)} />

      <section className="relative isolate overflow-hidden bg-forest text-ivory">
        <Photo name="land_boundary_pillars" priority sizes="100vw" className="photo-shade absolute inset-0 -z-10 h-full w-full" />
        <div className="container-x grid gap-12 pb-20 pt-20 sm:pt-28 lg:grid-cols-[1.25fr_0.75fr] lg:items-end lg:pb-28">
          <div>
            <p className="kicker text-gold"><span className="hairline" />Paid review · For owners abroad</p>
            <h1 className="display-xl mt-6 max-w-3xl">Know your project is <span className="italic text-gold">ready to build</span> before you send the money.</h1>
            <p className="lede mt-7 max-w-2xl text-ivory/80">The {readiness.name} checks your land documents, title (with Ghanaian counsel), site, drawings, permit position and budget — and tells you in writing what is ready, what isn't and what to do next.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href={`${readiness.path}/start`} className="btn-gold">Start your review <Icon name="arrow" className="h-4 w-4" /></Link>
              <a href="#included" className="btn-ghost-light backdrop-blur-sm">What's included</a>
            </div>
          </div>
          <div className="rounded-[22px] border border-ivory/15 bg-forest/70 p-7 backdrop-blur-md">
            <PriceTag />
            <ul className="mt-6 space-y-2.5 border-t border-ivory/12 pt-5 text-[14.5px] text-ivory/80">
              {["About 10 minutes to start", "Pay securely — Stripe (USD) or Paystack (GHS)", "Private document upload after payment", "Written report + walkthrough call"].map((t) => (
                <li key={t} className="flex gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section id="included" className="scroll-mt-24 py-24 sm:py-28">
        <div className="container-x">
          <div className="grid gap-6 lg:grid-cols-2 lg:items-end">
            <SectionHead eyebrow="What we review" title="Six areas. One clear answer." />
            <p className="lede max-w-xl text-muted">Each area is rated <span className="font-semibold text-forest">ready</span>, <span className="font-semibold text-gold-2">needs attention</span> or <span className="font-semibold text-[#a2402b]">not ready</span>, with the evidence behind the rating and the specific next step.</p>
          </div>
          <div className="mt-14 grid gap-px overflow-hidden rounded-[22px] border border-line bg-line sm:grid-cols-2 lg:grid-cols-3">
            {reviewAreas.map((a, i) => (
              <Reveal key={a.key} delay={(i % 3) * 80} className="bg-ivory p-8">
                <span className="flex h-11 w-11 items-center justify-center rounded-full bg-forest text-gold"><Icon name={a.icon as AnyIcon} className="h-5 w-5" /></span>
                <h3 className="mt-5 font-display text-[1.45rem] leading-snug text-forest">{a.title}</h3>
                <p className="mt-2.5 text-[15px] leading-relaxed text-muted">{a.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-forest py-24 text-ivory sm:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="kicker text-gold"><span className="hairline" />How it works</p>
            <h2 className="display-lg mt-5">From intake to report, step by step.</h2>
            <p className="lede mt-6 text-ivory/70">You can follow every step on a private case page — what's been received, what's missing and where counsel's title search stands.</p>
            <div className="mt-10 overflow-hidden rounded-[22px]"><Photo name="site_engineers_hi_vis" className="aspect-[16/10]" sizes="(min-width:1024px) 40vw, 100vw" /></div>
          </div>
          <ol className="relative border-l border-ivory/15 pl-8 sm:pl-10">
            {reviewSteps.map((s, i) => (
              <Reveal as="li" key={s.n} delay={i * 60} className="relative pb-12 last:pb-0">
                <span className="absolute -left-[49px] top-0 flex h-9 w-9 items-center justify-center rounded-full bg-gold font-display text-sm text-forest sm:-left-[57px]">{s.n}</span>
                <h3 className="font-display text-[1.6rem] leading-tight">{s.title}</h3>
                <p className="mt-2.5 max-w-xl text-[16px] leading-relaxed text-ivory/72">{s.body}</p>
              </Reveal>
            ))}
          </ol>
        </div>
      </section>

      <section className="py-24 sm:py-28">
        <div className="container-x grid gap-14 lg:grid-cols-2 lg:gap-20">
          <div>
            <SectionHead eyebrow="Documents" title="What to have ready." body="You don't need everything. Tell us what you hold and we'll show you what's missing. Documents marked ✦ are what counsel needs for the title search." />
            <div className="mt-10 rounded-[22px] border border-gold/40 bg-gold/10 p-6">
              <p className="flex items-center gap-2 font-semibold text-forest"><Icon name="lock" className="h-5 w-5 text-gold-2" /> How your documents are protected</p>
              <ul className="mt-3 space-y-2 text-[15px] text-ink/80">
                <li>Private storage — never public, never emailed around</li>
                <li>Short-lived signed links for every upload and download</li>
                <li>Access limited to your reviewer and appointed counsel, with an audit log</li>
                <li>Type and size checks on every file</li>
              </ul>
            </div>
          </div>
          <ul className="divide-y divide-line border-y border-line">
            {documentInventory.map((d) => (
              <li key={d.key} className="flex items-start justify-between gap-6 py-4">
                <span>
                  <span className="block font-semibold text-forest">{d.label} {d.title && <span className="text-gold-2" title="Needed for title verification">✦</span>}</span>
                  <span className="mt-0.5 block text-sm text-muted">{d.hint}</span>
                </span>
                <Icon name="doc" className="mt-1 h-5 w-5 shrink-0 text-forest/40" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="bg-ivory-2/60 py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHead eyebrow="Questions" title="Before you start." />
            <div className="mt-8 rounded-[22px] border border-line bg-white p-6 text-[14.5px] leading-relaxed text-muted">
              <p className="font-semibold text-forest">Scope and limits</p>
              <p className="mt-2">The review is an evidence-based assessment of the documents and information you supply. It is not a legal opinion, a structural engineering report or a valuation. Title findings are those of independent Ghana-qualified counsel.</p>
            </div>
          </div>
          <FaqList faqs={faqs} />
        </div>
      </section>

      <CtaBand heading="Start with the facts." body="Ten minutes of questions now can save a foundation poured on the wrong plot." label="Start your Readiness Review" href={`${readiness.path}/start`} secondary={{ label: "Book a discovery call instead", href: "/book-consultation" }} />
    </>
  );
}
