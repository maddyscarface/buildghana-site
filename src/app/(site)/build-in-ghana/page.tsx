import Link from "next/link";
import { pageMeta, faqJsonLd } from "@/lib/seo";
import { Icon } from "@/components/ui/Icons";
import { CheckList, CtaBand, FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { DashboardSection, FormSection, ProcessSection } from "@/components/sections/Sections";
import { Photo } from "@/components/media/Photo";
import { PriceGuide } from "@/components/estimate/PriceGuide";

export const metadata = pageMeta({
  title: "Build a House in Ghana — Locally or From Abroad",
  description: "Planning to build a home in Ghana — living locally, returning or abroad? See how we check land, plan the budget, manage construction and report to you.",
  path: "/build-in-ghana",
});

const faqs = [
  { q: "How long does it take to build a house in Ghana?", a: "It depends on size, design, permits, funding pace and site conditions. A realistic schedule is part of preconstruction planning; we don't quote timelines before the scope is defined." },
  { q: "How much does it cost to build a house in Ghana?", a: "Cost varies widely with location, size, design, finishes and timing. A Feasibility Assessment gives you a budget range for your specific home; a line-item budget follows once the design is complete." },
  { q: "Can I build in phases as I save?", a: "Yes, if it's planned. Phasing works best when each phase ends at a weather-protected, structurally sensible point. We plan phases so the building isn't left vulnerable between them." },
  { q: "What should I do first?", a: "Verify the land. Then design, permit, budget — in that order. Starting construction before these are done is the most common cause of overruns and stalled builds." },
];

const stages = [
  { title: "Verify the land", body: "Title search and boundary checks by Ghana-qualified professionals, coordinated for you.", href: "/land-feasibility" },
  { title: "Design it completely", body: "Architectural, structural and services drawings from registered professionals.", href: "/design-coordination" },
  { title: "Budget and plan", body: "Line-item costs, schedule and milestone payments before construction.", href: "/preconstruction-budgeting" },
  { title: "Build with control", body: "Construction management or independent oversight with structured reporting.", href: "/construction-management-ghana" },
];

export default function BuildInGhana() {
  return (
    <>
      <JsonLd data={faqJsonLd(faqs)} />
      <section className="relative isolate overflow-hidden bg-forest text-ivory">
        <Photo name="modern_build_scaffold" priority sizes="100vw" className="photo-shade absolute inset-0 -z-10 h-full w-full" />
        <div className="container-x pb-24 pt-20 sm:pt-28 lg:pb-32">
          <div className="max-w-3xl">
            <p className="kicker text-gold"><span className="hairline" />Building a home in Ghana</p>
            <h1 className="display-xl mt-6">The home you're planning in Ghana, <span className="italic text-gold">built the way you'd build at home.</span></h1>
            <p className="lede mt-7 max-w-2xl text-ivory/80">Whether it's a family house, a retirement home or a place to return to, we help you build it with land checked by professionals, a complete design, a real budget and reporting you can rely on — whether you live in Accra, Kumasi or abroad.</p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Link href="/assessment?funnel=new_home" className="btn-gold">Request a Project Assessment</Link>
              <Link href="/ghana-build-readiness-review" className="btn-ghost-light backdrop-blur-sm">Start with a Readiness Review</Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container-x">
          <SectionHead eyebrow="The right order" title="Four stages that protect your money." body="Skipping a stage doesn't save time — it moves the cost to later, when it's bigger." />
          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {stages.map((s, i) => (
              <Link key={s.title} href={s.href} className="group card p-6 hover:bg-white">
                <span className="font-display text-3xl text-gold-2">0{i + 1}</span>
                <h2 className="mt-3 text-xl text-forest">{s.title}</h2>
                <p className="mt-2 text-[15px] text-muted">{s.body}</p>
                <span className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-forest">Details <Icon name="arrow" className="h-4 w-4" /></span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-ivory-2 py-24">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <SectionHead eyebrow="Is this for you?" title="We're a good fit if you…" />
          <CheckList items={[
            "Live outside Ghana and can't supervise construction in person",
            "Own land, are buying it, or have family land you want to build on",
            "Want a written scope, budget and schedule before construction",
            "Expect regular, evidence-based updates",
            "Are planning a substantial home and want it done properly once",
          ]} />
        </div>
      </section>

      <ProcessSection />
      <DashboardSection />

      <PriceGuide />

      <section className="py-24">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead eyebrow="FAQ" title="Building a home in Ghana: common questions" />
          <FaqList faqs={faqs} />
        </div>
      </section>

      <FormSection funnel="new_home" defaultService="land_feasibility" heading="Start with a Feasibility Assessment." body="Tell us about your land and plans. We'll confirm whether a Feasibility Assessment is the right first step and send a written scope and fee." />
      <CtaBand heading="Ready when you are." body="A free 30-minute discovery call is the easiest way to start." label="Book a Consultation" href="/book-consultation" />
    </>
  );
}
