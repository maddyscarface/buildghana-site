import Link from "next/link";
import { pageMeta, pageGraph } from "@/lib/seo";
import { CtaBand, FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { Photo } from "@/components/media/Photo";
import { PropertyHero, Principles, Steps } from "@/components/property/PropertyBlocks";
import { PrivacyRequestForm } from "@/components/property/PrivacyRequestForm";
import { buyerSteps, sellerSteps } from "@/content/property";

const title = "How Off-Market Property Introductions Work";
const description = "How BuildGhana reviews private land and property inquiries in Ghana: verification, counsel-led due diligence, seller authorisation and what we never guarantee.";
const path = "/property/how-it-works";
export const metadata = pageMeta({ title, description, path });
const crumbs = [{ name: "Home", href: "/" }, { name: "Property", href: "/property" }, { name: "How it works", href: path }];

const faqs = [
  { q: "How do I check land title in Ghana before buying?", a: "Instruct a Ghanaian lawyer to conduct an official search at the Lands Commission and examine the indenture, site plan, any land title certificate and the seller's authority — including family or stool consent for customary land. Ask counsel to record limitations in writing. BuildGhana coordinates this but does not give title opinions." },
  { q: "What due diligence happens before an introduction?", a: "Staff verify the seller's contact and stated authority, request relevant documents, and refer them to Ghanaian counsel where an introduction is likely. Matches are reviewed by a person. Counsel's findings stay pending until they report; nothing is presented as verified before then." },
  { q: "What does BuildGhana not do?", a: "We do not guarantee title, ownership or availability, give legal opinions, take deposits, hold money in escrow, prepare purchase contracts or publish private inquiries. Any fee would be agreed in writing first, after counsel confirms the applicable regulations." },
];

export default function HowItWorks() {
  return (
    <>
      <JsonLd data={pageGraph({ path, title, description, crumbs, faqs })} />
      <PropertyHero image="land_site_inspection" crumbs={crumbs} kicker="Process, due diligence and limits"
        title={<>How private introductions <span className="italic text-gold">actually work.</span></>}
        lede="A plain account of what happens to a seller's or buyer's inquiry, who sees what, what counsel checks — and what BuildGhana never promises." />

      <section className="py-24 sm:py-28">
        <div className="container-x grid gap-16 lg:grid-cols-2">
          <div>
            <SectionHead eyebrow="Sellers" title="From inquiry to authorised introduction." />
            <div className="mt-10"><Steps steps={sellerSteps} /></div>
          </div>
          <div>
            <SectionHead eyebrow="Buyers" title="From requirements to a reviewed match." />
            <div className="mt-10"><Steps steps={buyerSteps} /></div>
            <Photo name="carpenter_fitting_door" className="mt-12 aspect-[4/5] max-w-sm rounded-[22px]" sizes="(min-width:1024px) 30vw, 80vw" />
          </div>
        </div>
      </section>

      <section className="bg-forest py-24 text-ivory sm:py-28">
        <div className="container-x">
          <SectionHead dark eyebrow="Rules we work to" title="Privacy and verification, built in." />
          <div className="mt-12"><Principles dark /></div>
        </div>
      </section>

      <section className="py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <div>
            <SectionHead eyebrow="Due diligence" title="Questions about checks and limits." />
            <p className="mt-5 text-[15.5px] leading-relaxed text-muted">Planning to build afterwards? The <Link href="/ghana-build-readiness-review" className="link-underline text-forest">Ghana Build Readiness Review</Link> is a separate, paid service — never bundled with an inquiry.</p>
          </div>
          <FaqList faqs={faqs} />
        </div>
      </section>

      <section id="requests" className="scroll-mt-24 bg-ivory-2/60 py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead eyebrow="Your data" title="Withdraw, delete or report a problem." body="Withdrawn listings are excluded from matching straight away. Deletion removes your contact details, location details and files. Requests are actioned by a person and logged." />
          <PrivacyRequestForm />
        </div>
      </section>

      <CtaBand heading="Ready when you are." body="Send a private inquiry — it takes a few minutes and costs nothing." label="List land or property privately" href="/property/sell" secondary={{ label: "Tell us what you want to buy", href: "/property/buy" }} />
    </>
  );
}
