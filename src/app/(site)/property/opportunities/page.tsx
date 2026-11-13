import Link from "next/link";
import { pageMeta, pageGraph } from "@/lib/seo";
import { JsonLd, SectionHead } from "@/components/ui/Blocks";
import { Icon } from "@/components/ui/Icons";
import { PropertyHero, Principles } from "@/components/property/PropertyBlocks";
import { publicListings } from "@/lib/property/public";
import { opportunitiesMode } from "@/config/property";

export const dynamic = "force-dynamic";

const title = "Property Opportunities in Ghana";
const description = "Why BuildGhana doesn't publish private inventory, and how buyers in Ghana and abroad can join the private matching list for land and property.";
const path = "/property/opportunities";
const crumbs = [{ name: "Home", href: "/" }, { name: "Property", href: "/property" }, { name: "Opportunities", href: path }];

/**
 * Feature-flagged (NEXT_PUBLIC_PROPERTY_OPPORTUNITIES_MODE). "waitlist" (default): no inventory at all.
 * "listings": only seller-authorised, factually reviewed public listings via the allow-list projection in
 * lib/property/public.ts. Never RealEstateListing schema here; the page is noindex if any shown listing lacks index consent.
 */
export async function generateMetadata() {
  const listings = await publicListings();
  return pageMeta({ title, description, path, noindex: listings.some((l) => !l.indexable) });
}

export default async function Opportunities() {
  const mode = opportunitiesMode();
  const listings = await publicListings();
  return (
    <>
      <JsonLd data={pageGraph({ path, title, description, crumbs })} />
      <PropertyHero image="ho_volta_rooftops" crumbs={crumbs} kicker="Opportunities"
        title={<>Opportunities are <span className="italic text-gold">introduced, not advertised.</span></>}
        lede="Most properties shared with BuildGhana are private. Sellers choose who sees them, so we match buyers' requirements against them internally and introduce only with the seller's authorisation.">
        <Link href="/property/buy" className="btn-gold">Join the private buyer list <Icon name="arrow" className="h-4 w-4" /></Link>
      </PropertyHero>

      <section className="py-24 sm:py-28">
        <div className="container-x">
          {mode === "listings" && listings.length > 0 ? (
            <>
              <SectionHead eyebrow="Seller-authorised listings" title="Currently shareable opportunities." body="Each listing below is shown with the seller's written authorisation and a factual review. Details are summaries only; title is not verified by these listings — counsel checks it during due diligence." />
              <ul className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {listings.map((l) => (
                  <li key={l.reference} className="rounded-[22px] border border-line bg-white p-7">
                    <p className="eyebrow">Ref {l.reference}</p>
                    <h2 className="mt-2 font-display text-[1.5rem] leading-snug text-forest">{l.type} · {l.district}, {l.region}</h2>
                    <p className="mt-2 text-[15px] text-muted">{l.use} · {l.size}</p>
                    <Link href={`/property/buy?ref=${encodeURIComponent(l.reference)}`} className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-forest">Ask about this <Icon name="arrow" className="h-4 w-4" /></Link>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="grid gap-12 lg:grid-cols-2 lg:items-start">
              <SectionHead eyebrow="Private matching list" title="Tell us what you're looking for — we'll come to you." body="Instead of a public catalogue, buyers share requirements once. When a seller-authorised property fits, a person reviews the match and contacts you. There's no cost and no obligation." />
              <Principles />
            </div>
          )}
        </div>
      </section>
    </>
  );
}
