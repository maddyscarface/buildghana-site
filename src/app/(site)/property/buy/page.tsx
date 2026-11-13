import { pageMeta, pageGraph } from "@/lib/seo";
import { FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { Icon } from "@/components/ui/Icons";
import { PropertyForm } from "@/components/property/PropertyForm";
import { PropertyHero, ReviewCrossSell, Steps } from "@/components/property/PropertyBlocks";
import { buyerSteps, propertyFaqs } from "@/content/property";

const title = "Buy Land or Property in Ghana";
const description = "Share your land or property buying requirements in Ghana. Join a private buyer-matching and due diligence inquiry process.";
const path = "/property/buy";
export const metadata = pageMeta({ title, description, path });
const crumbs = [{ name: "Home", href: "/" }, { name: "Property", href: "/property" }, { name: title, href: path }];
const faqs = propertyFaqs.filter((f) => !f.q.startsWith("Will my land"));

export default function Page() {
  return (
    <>
      <JsonLd data={pageGraph({ path, title, description, crumbs, faqs })} />
      <PropertyHero image="cape_coast_street" crumbs={crumbs} kicker="For buyers in Ghana, returnees and the diaspora" title={<>Tell Us What You <span className="italic text-gold">Want to Buy</span></>} lede="Describe the land or property you're looking for. It's an inquiry, not an offer — no payment needed. We match privately against seller-authorised properties and introduce you only after review." />

      <section className="py-16 sm:py-24" id="form">
        <div className="container-x grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:gap-14">
          <div className="min-w-0"><PropertyForm kind="buyer" /></div>
          <aside className="space-y-8 lg:pt-2">
            <ul className="space-y-3 text-[15px] text-ink/85">
              {["About 4 minutes — budgets in GHS or USD", "No offer, deposit or payment to inquire", "Eligibility and tenure questions routed to Ghanaian counsel", "Introductions only after seller authorisation and admin approval"].map((t) => (
                <li key={t} className="flex gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold-2" />{t}</li>
              ))}
            </ul>
            <div>
              <p className="eyebrow">What happens next</p>
              <div className="mt-6"><Steps steps={buyerSteps} /></div>
            </div>
            <ReviewCrossSell />
          </aside>
        </div>
      </section>

      <section className="bg-ivory-2/60 py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead eyebrow="FAQ" title="Before you send it." />
          <FaqList faqs={faqs} />
        </div>
      </section>
    </>
  );
}
