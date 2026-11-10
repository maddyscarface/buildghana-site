import { estimateConfig } from "@/config/estimate";
import { rangeText } from "@/lib/estimate/qualifiers";
import { SectionHead } from "@/components/ui/Blocks";
import { PricingViewBeacon } from "./PricingViewBeacon";

/**
 * Typical planning ranges, rendered from the same config the lead form uses (src/config/estimate.ts),
 * so the public price guide and the in-form range can never disagree. Counted as a pricing view
 * ("saw pricing") once it is on screen.
 */
export function PriceGuide({ id = "price-guide" }: { id?: string }) {
  return (
    <section id={id} className="py-24">
      <div className="container-x">
        <SectionHead eyebrow="Price guide" title="Typical planning ranges (USD)" body={estimateConfig.rangeNote} />
        <div className="relative mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <PricingViewBeacon where="price-guide" />
          {estimateConfig.projectTypes.map((pt) => (
            <div key={pt.id} className="rounded-2xl border border-black/10 bg-white p-6">
              <h3 className="font-semibold">{pt.label}</h3>
              <ul className="mt-3 space-y-1 text-sm">
                {pt.sizes.map((s) => (
                  <li key={s.id} className="flex justify-between gap-4"><span>{s.label}</span><span className="font-medium">{rangeText(s.typical)}</span></li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <p className="mt-6 text-sm opacity-75">Ranges are for planning only, not a quote. Your Feasibility Assessment gives a line-item budget for your land and design.</p>
      </div>
    </section>
  );
}
