import { pageMeta, pageGraph } from "@/lib/seo";
import { FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { Icon } from "@/components/ui/Icons";
import { PropertyForm } from "@/components/property/PropertyForm";
import { PropertyHero, ReviewCrossSell, Steps } from "@/components/property/PropertyBlocks";
import { propertyFaqs, sellerSteps } from "@/content/property";

const title = "Sell Land or Property in Ghana";
const description = "Tell BuildGhana about land or property you want to sell in Ghana. Submit details securely for a private off-market introduction.";
const path = "/property/sell";
export const metadata = pageMeta({ title, description, path });
const crumbs = [{ name: "Home", href: "/" }, { name: "Property", href: "/property" }, { name: title, href: path }];
const faqs = propertyFaqs.filter((f) => !f.q.startsWith("Can non-Ghanaians"));

export default function Page() {
  return (
    <>
      <JsonLd data={pageGraph({ path, title, description, crumbs, faqs })} />
      <PropertyHero image="takoradi_residence" crumbs={crumbs} kicker="For owners, families and agents in Ghana and abroad" title={<>List Your Land or Property <span className="italic text-gold">Privately</span></>} lede="Tell us about land or property you'd consider selling. Nothing is published, and nothing is shared with a buyer until you authorise it. Ghana-based and international sellers are equally welcome." />

      <section className="py-16 sm:py-24" id="form">
        <div className="container-x grid gap-12 lg:grid-cols-[1.25fr_0.75fr] lg:gap-14">
          <div className="min-w-0"><PropertyForm kind="seller" /></div>
          <aside className="space-y-8 lg:pt-2">
            <ul className="space-y-3 text-[15px] text-ink/85">
              {["About 6 minutes — saves on this device as you go", "Exact location, GhanaPost GPS and documents stay private", "Self-reported details are never presented as verified", "You can withdraw or ask us to delete your details at any time"].map((t) => (
                <li key={t} className="flex gap-2.5"><Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold-2" />{t}</li>
              ))}
            </ul>
            <div>
              <p className="eyebrow">What happens next</p>
              <div className="mt-6"><Steps steps={sellerSteps} /></div>
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
