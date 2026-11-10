import { pageMeta } from "@/lib/seo";
import { ghanaCredentials, disclaimers, site } from "@/config/site";
import { ClaimRow, CtaBand, SectionHead } from "@/components/ui/Blocks";
import { FounderSection } from "@/components/sections/Sections";

export const metadata = pageMeta({
  title: "About BuildGhana Abroad | U.S.-Led Construction Management for Ghana",
  description: "Who we are, how we work and the credentials behind BuildGhana Abroad — U.S.-led project discipline for owners building in Ghana.",
  path: "/about",
});

export default function About() {
  return (
    <>
      <section className="bg-forest pb-16 pt-16 text-ivory">
        <div className="container-x max-w-4xl">
          <p className="eyebrow-dark">About</p>
          <h1 className="mt-4 text-[2.5rem] leading-tight sm:text-6xl">We exist so that building in Ghana from abroad stops being an act of faith.</h1>
          <p className="mt-6 text-lg text-ivory/75">{site.name} brings U.S. construction-management discipline — written scopes, verified budgets, inspections and structured reporting — to owners building homes and income property in Ghana.</p>
        </div>
      </section>
      <FounderSection />
      <section className="bg-ivory-2 py-24">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHead eyebrow="Credentials" title="Ghana registrations, team and insurance" body="We list only what we can document. Items marked for confirmation will be completed before this page goes live." />
            <p className="mt-6 text-sm leading-relaxed text-muted">{disclaimers.licensing}</p>
          </div>
          <ul className="grid gap-3">{ghanaCredentials.map((c) => <ClaimRow key={c.label} claim={c} />)}</ul>
        </div>
      </section>
      <section className="py-24">
        <div className="container-x grid gap-8 md:grid-cols-3">
          {[
            { h: "Owner first", p: "We work for the person paying for the building. When we inspect, we are independent of the builder." },
            { h: "Evidence over assurance", p: "Every claim in a report is backed by a photo, a measurement, a document or a named professional's opinion." },
            { h: "Plain dealing", p: "Fixed fees, written scopes and honest recommendations — including when the right answer is to stop." },
          ].map((v) => (
            <div key={v.h}><h2 className="text-2xl text-forest">{v.h}</h2><p className="mt-3 text-muted">{v.p}</p></div>
          ))}
        </div>
      </section>
      <CtaBand heading="Let's talk about your project." body="Start with a free discovery call or send us your project details." />
    </>
  );
}
