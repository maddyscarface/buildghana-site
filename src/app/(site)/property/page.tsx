import Link from "next/link";
import { pageMeta, pageGraph } from "@/lib/seo";
import { CtaBand, FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { Icon } from "@/components/ui/Icons";
import { Photo } from "@/components/media/Photo";
import { PropertyHero, Principles, ReviewCrossSell } from "@/components/property/PropertyBlocks";
import { propertyFaqs } from "@/content/property";

const title = "Off-Market Land & Property in Ghana";
const description = "Private, off-market land and property inquiries for sellers and buyers in Ghana and abroad, with seller-authorised introductions and counsel-led title checks.";
export const metadata = pageMeta({ title, description, path: "/property" });
const crumbs = [{ name: "Home", href: "/" }, { name: "Property", href: "/property" }];

export default function PropertyPage() {
  return (
    <>
      <JsonLd data={pageGraph({ path: "/property", title, description, crumbs, faqs: propertyFaqs,
        service: { name: "Off-market property introductions", description: "Private seller and buyer inquiries in Ghana with human review and seller-authorised introductions. Not brokerage, escrow or a title guarantee.", serviceType: "Property introduction service", audience: "Land and property sellers and buyers in Ghana and abroad" } })} />
      <PropertyHero image="accra_from_akwapim_ridge" crumbs={crumbs} kicker="Private property inquiries · Ghana & abroad"
        title={<>Buy or sell land in Ghana <span className="italic text-gold">without going public.</span></>}
        lede="BuildGhana runs a private, off-market introduction service. Sellers describe land or property in confidence; buyers describe what they need. People — not algorithms — review both sides, and nothing about a seller is shared until the seller authorises it.">
        <Link href="/property/sell" className="btn-gold">List land or property privately <Icon name="arrow" className="h-4 w-4" /></Link>
        <Link href="/property/buy" className="btn-ghost-light backdrop-blur-sm">Tell us what you want to buy</Link>
      </PropertyHero>

      <section className="py-24 sm:py-28">
        <div className="container-x grid gap-8 md:grid-cols-2">
          {[
            { href: "/property/sell", image: "walled_home_residential_area" as const, eyebrow: "For owners, families and agents", h: "Sell land or property privately", body: "Share the region, district, size and documents you hold. Nothing is published. We verify contact and authority to sell before anything else happens.", cta: "Start the seller form" },
            { href: "/property/buy", image: "accra_laterite_road_homes" as const, eyebrow: "For buyers at home and abroad", h: "Tell us what you want to buy", body: "Describe regions, property type, size, budget in GHS or USD and timing. It's not an offer, and there's nothing to pay to send it.", cta: "Start the buyer form" },
          ].map((c) => (
            <Link key={c.href} href={c.href} className="group overflow-hidden rounded-[22px] border border-line bg-white transition-shadow hover:shadow-xl">
              <Photo name={c.image} className="img-zoom aspect-[16/10]" sizes="(min-width:768px) 50vw, 100vw" creditLink={false} />
              <div className="p-7 sm:p-8">
                <p className="eyebrow">{c.eyebrow}</p>
                <h2 className="mt-2 font-display text-[1.8rem] leading-tight text-forest">{c.h}</h2>
                <p className="mt-3 text-[15.5px] leading-relaxed text-muted">{c.body}</p>
                <span className="mt-5 inline-flex min-h-11 items-center gap-2 font-semibold text-forest group-hover:text-gold-2">{c.cta} <Icon name="arrow" className="h-4 w-4" /></span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      <section className="bg-forest py-24 text-ivory sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
          <div>
            <SectionHead dark eyebrow="What to expect" title="Vetting and privacy, before anything else." body="An off-market introduction is only useful if both sides can trust it. These rules apply to every inquiry, wherever you live." />
            <Link href="/property/how-it-works" className="btn-ghost-light mt-8">How introductions work</Link>
          </div>
          <Principles dark />
        </div>
      </section>

      <section className="py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionHead eyebrow="Important" title="What this service is — and isn't." />
            <ul className="mt-8 space-y-4 text-[15.5px] leading-relaxed text-ink/85">
              <li className="flex gap-3"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-gold-2" />It is a private inquiry and introduction service with human review on both sides.</li>
              <li className="flex gap-3"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-gold-2" />It is not brokerage, escrow, title insurance or a guarantee that a property is available or legally sound.</li>
              <li className="flex gap-3"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-gold-2" />Land tenure, buyer eligibility and title are matters for Ghanaian counsel. We coordinate; counsel advises.</li>
              <li className="flex gap-3"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-gold-2" />Fees: none to send an inquiry. Any future fee would be agreed in writing, after counsel has confirmed the applicable regulations.</li>
            </ul>
          </div>
          <div className="space-y-6">
            <Photo name="plot_with_foundations" className="aspect-[16/10] rounded-[22px]" sizes="(min-width:1024px) 45vw, 100vw" />
            <ReviewCrossSell />
          </div>
        </div>
      </section>

      <section className="bg-ivory-2/60 py-24 sm:py-28">
        <div className="container-x grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHead eyebrow="FAQ" title="Questions about property introductions." />
          <FaqList faqs={propertyFaqs} />
        </div>
      </section>

      <CtaBand heading="Start privately. Decide with facts." body="Send an inquiry in a few minutes. A person reviews it and tells you plainly what happens next." label="List land or property privately" href="/property/sell" secondary={{ label: "Tell us what you want to buy", href: "/property/buy" }} />
    </>
  );
}
