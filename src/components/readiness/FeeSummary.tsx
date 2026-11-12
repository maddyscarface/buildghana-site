"use client";
import { addOnServices, readiness } from "@/config/readiness";

export type PublicPrice = {
  usdMinor: number | null; ghsMinor: number | null; turnaroundDays: number | null;
  addOns?: Partial<Record<string, { usdMinor: number | null; ghsMinor: number | null }>>;
  fx?: { usdToGhs: number; source: string; date: string } | null;
  coverage?: string | null; refundPolicy?: string | null;
};

const fmt = (minor: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(minor / 100);

/**
 * Base fee, optional add-ons, coverage, FX basis and refund terms — all owner-configured.
 * Anything the owner hasn't set is shown as such; nothing is invented.
 */
export function FeeSummary({ price, compact = false }: { price: PublicPrice | null; compact?: boolean }) {
  const base = [price?.usdMinor ? fmt(price.usdMinor, "USD") : null, price?.ghsMinor ? fmt(price.ghsMinor, "GHS") : null].filter(Boolean).join(" · ");
  return (
    <div className="rounded-2xl border border-line bg-white p-5 text-[14.5px] leading-relaxed text-ink/80" data-testid="fee-summary">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-semibold text-forest">Base review fee</p>
        <p className="font-display text-xl text-forest">{base || readiness.pricePlaceholder}</p>
      </div>
      <p className="mt-1 text-[13.5px] text-muted">
        {price?.turnaroundDays ? `Report target: ${price.turnaroundDays} working days after the site visit and documents are in. ` : `${readiness.turnaroundPlaceholder}. `}
        Paystack charges in GHS; Stripe charges in USD. The exact amount is shown on the hosted checkout before you pay.
      </p>
      {!compact && (<>
        <p className="mt-4 font-semibold text-forest">Optional add-ons <span className="font-normal text-muted">— quoted first, charged only with your approval</span></p>
        <ul className="mt-1 space-y-0.5 text-[13.5px]">
          {addOnServices.map((a) => {
            const p = price?.addOns?.[a.value];
            const v = [p?.usdMinor ? fmt(p.usdMinor, "USD") : null, p?.ghsMinor ? fmt(p.ghsMinor, "GHS") : null].filter(Boolean).join(" · ");
            return <li key={a.value} className="flex justify-between gap-4"><span>{a.label}</span><span className="shrink-0 text-muted">{v || "Quoted per case"}</span></li>;
          })}
        </ul>
        <p className="mt-4 font-semibold text-forest">Coverage</p>
        <p className="text-[13.5px]">{price?.coverage || "Service area set by owner — confirmed with you before payment if your plot is outside it."}</p>
        <p className="mt-4 font-semibold text-forest">Refunds & cancellation</p>
        <p className="text-[13.5px]">{price?.refundPolicy || "Refund and cancellation terms are set by the owner and will be shown here before launch."}</p>
      </>)}
      <p className="mt-4 text-[12.5px] text-muted">
        {price?.fx ? `Currency conversions use 1 USD = ${price.fx.usdToGhs} GHS (${price.fx.source}${price.fx.date ? `, ${price.fx.date}` : ""}). Your card issuer or mobile-money provider may apply its own rate.` : "Where amounts are shown in both currencies, the exchange rate source and date are stated. Your card issuer may apply its own rate."}
      </p>
    </div>
  );
}
