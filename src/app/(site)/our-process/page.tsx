import { pageMeta } from "@/lib/seo";
import { disclaimers } from "@/config/site";
import { CheckList, CtaBand, SectionHead } from "@/components/ui/Blocks";
import { DashboardSection, ProcessSection } from "@/components/sections/Sections";

export const metadata = pageMeta({
  title: "Our Process: How We Manage Ghana Construction for Owners Abroad | BuildGhana Abroad",
  description: "From discovery call to handover: how we assess, plan, contract, build and report on construction projects in Ghana for owners living abroad.",
  path: "/our-process",
});

const controls = [
  { h: "Scope control", items: ["Written scope before any paid work", "Change orders priced and approved by you in writing", "Decision log for every design or specification change"] },
  { h: "Cost control", items: ["Line-item budget with stated assumptions", "Milestone-based payments released after verification", "Monthly budget vs. actual reporting"] },
  { h: "Quality control", items: ["Hold-point inspections at critical stages", "Checklists shared with you in advance", "Specialist questions referred to qualified Ghana professionals"] },
  { h: "Communication", items: ["Agreed reporting cadence and format", "Standing call in a time slot that works for you", "One accountable point of contact"] },
];

export default function OurProcess() {
  return (
    <>
      <section className="bg-forest pb-16 pt-16 text-ivory">
        <div className="container-x max-w-4xl">
          <p className="eyebrow-dark">Our process</p>
          <h1 className="mt-4 text-[2.5rem] leading-tight sm:text-6xl">Discipline you can see from 5,000 miles away.</h1>
          <p className="mt-6 text-lg text-ivory/75">The same sequence on every project: facts first, then a plan, then construction with controls and reporting at every step.</p>
        </div>
      </section>
      <ProcessSection />
      <section className="bg-ivory-2 py-24">
        <div className="container-x">
          <SectionHead eyebrow="Controls" title="Four controls on every engagement" />
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {controls.map((c) => (
              <div key={c.h} className="card bg-white p-7">
                <h2 className="text-2xl text-forest">{c.h}</h2>
                <div className="mt-5"><CheckList items={c.items} /></div>
              </div>
            ))}
          </div>
          <div className="mt-10 grid gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-line p-6 text-sm leading-relaxed text-muted"><strong className="text-forest">Advisory vs. contracting. </strong>{disclaimers.advisory}</div>
            <div className="rounded-2xl border border-line p-6 text-sm leading-relaxed text-muted"><strong className="text-forest">Licensing. </strong>{disclaimers.licensing}</div>
          </div>
        </div>
      </section>
      <DashboardSection />
      <CtaBand heading="Start with step one." body="A free discovery call — then a fixed-fee assessment if it makes sense." secondary={{ label: "Book a call", href: "/book-consultation" }} />
    </>
  );
}
