"use client";
import { useEffect, useState } from "react";
import { readiness } from "@/config/readiness";

const fmt = (minor: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(minor / 100);

/** Shows the owner-configured fee, or the "Price set by owner" placeholder. Never invents a number. */
export function PriceTag({ className = "", tone = "dark" }: { className?: string; tone?: "dark" | "light" }) {
  const [p, setP] = useState<{ usdMinor: number | null; ghsMinor: number | null; turnaroundDays: number | null } | null>(null);
  useEffect(() => { fetch("/api/readiness/price").then((r) => r.json()).then(setP).catch(() => setP(null)); }, []);
  const parts = [p?.usdMinor ? fmt(p.usdMinor, "USD") : null, p?.ghsMinor ? fmt(p.ghsMinor, "GHS") : null].filter(Boolean);
  return (
    <div className={className}>
      <p className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${tone === "dark" ? "text-gold" : "text-gold-2"}`}>Review fee</p>
      <p className={`mt-1 font-display text-[2rem] leading-tight ${tone === "dark" ? "text-ivory" : "text-forest"}`}>{parts.length ? parts.join(" · ") : readiness.pricePlaceholder}</p>
      <p className={`mt-1 text-[13px] ${tone === "dark" ? "text-ivory/60" : "text-muted"}`}>
        {p?.turnaroundDays ? `Report within ${p.turnaroundDays} working days of receiving your documents. ` : `${readiness.turnaroundPlaceholder}. `}
        {readiness.priceNote}
      </p>
    </div>
  );
}
