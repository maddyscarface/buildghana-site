import { PhotoHero } from "@/components/media/PhotoHero";
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
      <PhotoHero image="scaffold_facade" kicker="Projects" title={<>Documented, not decorated.</>}>We publish a case study only when the project is documented and the owner has given written permission. No stock photos passed off as our work, and no invented results.</PhotoHero>
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
