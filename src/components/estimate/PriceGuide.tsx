import { estimateConfig } from "@/config/estimate";
import { rangeText } from "@/lib/estimate/qualifiers";
import Link from "next/link";
import { SectionHead } from "@/components/ui/Blocks";
import { Icon } from "@/components/ui/Icons";
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
            <div key={pt.id} className="rounded-[20px] border border-line bg-white p-6 sm:p-7">
              <h3 className="font-display text-[1.35rem] leading-snug text-forest">{pt.label}</h3>
              <ul className="mt-4 divide-y divide-line text-[14.5px]">
                {pt.sizes.map((s) => (
                  <li key={s.id} className="flex justify-between gap-4 py-2.5"><span className="text-ink/80">{s.label}</span><span className="font-semibold tabular-nums text-forest">{rangeText(s.typical)}</span></li>
                ))}
              </ul>
            </div>
          ))}
          <div className={`flex flex-col justify-between gap-6 rounded-[20px] bg-forest p-6 text-ivory sm:p-7 ${estimateConfig.projectTypes.length % 3 === 1 ? "lg:col-span-2" : ""} ${estimateConfig.projectTypes.length % 2 === 0 ? "md:col-span-2 lg:col-span-1" : ""}`}>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold">Planning ranges, not quotes</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ivory/80">Land, design, finishes and location move these numbers. A Readiness Review gives you a GHS/USD cost range with every assumption written down; a Feasibility Assessment gives a line-item budget.</p>
            </div>
            <Link href="/ghana-build-readiness-review" className="inline-flex items-center gap-2 text-sm font-semibold text-gold">See the Readiness Review <Icon name="arrow" className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
