import { pageMeta } from "@/lib/seo";
import { CtaBand, SectionHead } from "@/components/ui/Blocks";
import { CaseStudyPlaceholders } from "@/components/sections/Sections";

export const metadata = pageMeta({
  title: "Projects & Case Studies | BuildGhana Abroad",
  description: "Documented project case studies from BuildGhana Abroad — published only with verified outcomes and owner permission.",
  path: "/projects",
});

export default function Projects() {
  return (
    <>
      <section className="bg-forest pb-16 pt-16 text-ivory">
        <div className="container-x max-w-4xl">
          <p className="eyebrow-dark">Projects</p>
          <h1 className="mt-4 text-[2.5rem] leading-tight sm:text-6xl">Documented, not decorated.</h1>
          <p className="mt-6 text-lg text-ivory/75">We publish a case study only when the project is documented and the owner has given written permission. No stock photos passed off as our work, and no invented results.</p>
        </div>
      </section>
      <section className="py-20">
        <div className="container-x">
          <CaseStudyPlaceholders />
          <div className="mt-16">
            <SectionHead eyebrow="What every case study will include" title="The standard we'll publish to" />
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {["Starting condition and owner's goals", "Scope and services provided", "Schedule: planned vs. actual", "Budget: planned vs. actual, with explanations", "Before / during / after photography with dates", "Owner's own words — with permission"].map((t) => (
                <li key={t} className="card p-5 text-forest">{t}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>
      <CtaBand heading="Could your project be next?" body="Tell us what you're building. We'll tell you how we'd approach it." />
    </>
  );
}
