import { PhotoHero } from "@/components/media/PhotoHero";
import { pageMeta } from "@/lib/seo";
import { ghanaCredentials, disclaimers, site, verifiedOnly } from "@/config/site";
import { ClaimRow, CtaBand, SectionHead } from "@/components/ui/Blocks";
import { FounderSection } from "@/components/sections/Sections";

export const metadata = pageMeta({
  title: "About Our Ghana Construction Management",
  description: "Who we are, how we work and the credentials behind BuildGhana Abroad — structured project discipline for owners building in Ghana, whether they live there or abroad.",
  path: "/about",
});

export default function About() {
  return (
    <>
      <PhotoHero image="accra_two_storey_home" kicker="About" title={<>We exist so that building in Ghana — from Accra or from abroad — stops being an act of faith.</>}>{site.name} brings U.S. construction-management discipline — written scopes, verified budgets, inspections and structured reporting — to owners in Ghana and abroad building homes and income property.</PhotoHero>
      <FounderSection />
      <section className="bg-ivory-2 py-24">
        <div className="container-x grid gap-12 lg:grid-cols-2">
          <div>
            <SectionHead eyebrow="Credentials" title="Registrations, licences and insurance" body="We publish a credential here only after it has been verified. Nothing on this site should be read as a registration, classification, affiliation or insurance claim unless it appears in this list." />
            <p className="mt-6 text-sm leading-relaxed text-muted">{disclaimers.licensing}</p>
          </div>
          {verifiedOnly(ghanaCredentials).length ? (
            <ul className="grid gap-3">{verifiedOnly(ghanaCredentials).map((c) => <ClaimRow key={c.label} claim={c} />)}</ul>
          ) : (
            <div className="self-start rounded-[22px] border border-line bg-white p-7 text-[15px] leading-relaxed text-ink/80">
              <p className="font-semibold text-forest">Being verified — none published yet</p>
              <p className="mt-2">Ghana company registration, contractor classification, professional affiliations and insurance are being documented and will be listed here once verified. Until then, ask for any credential in writing and treat anything you can't see in writing as unconfirmed.</p>
              <p className="mt-3">Where a scope needs a licensed Ghanaian professional (lawyer, surveyor, architect or engineer), they are named in that scope and their opinion is labelled as theirs.</p>
            </div>
          )}
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
