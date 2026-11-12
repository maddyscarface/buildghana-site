import "server-only";
import { kv } from "@/lib/server/kv";
import { keys } from "./store";

/**
 * Owner-configurable fee model (spec §2 Step B). Precedence: admin dashboard setting (KV) → env → unset.
 * BASE_REVIEW_FEE is charged at checkout. Add-ons are only ever quoted and charged after the client approves them.
 * Amounts are in minor units (cents / pesewas). Nothing on the site invents a fee, a timeline or a rate.
 */
export type AddOnKey = "title_verification" | "expedited" | "third_party" | "travel";
export type Fx = { usdToGhs: number; source: string; date: string };
/** Versioned cost assumptions used for the preliminary cost range (GHS per m² of floor area, low/base/high). */
export type CostAssumptions = { version: string; updatedAt: string; notes: string; ghsPerSqm: Record<"basic" | "standard" | "high" | "luxury", [number, number, number]> };

export type PriceSettings = {
  usdMinor: number | null; ghsMinor: number | null; turnaroundDays: number | null;
  addOns: Partial<Record<AddOnKey, { usdMinor: number | null; ghsMinor: number | null }>>;
  fx: Fx | null;
  coverage: string | null;
  refundPolicy: string | null;
  costAssumptions: CostAssumptions | null;
  updatedAt?: string;
};

const envMinor = (v?: string) => (v && Number(v) > 0 ? Math.round(Number(v) * 100) : null);

function envSettings(): PriceSettings {
  const fxRate = Number(process.env.READINESS_FX_USD_GHS || 0);
  return {
    usdMinor: envMinor(process.env.BASE_REVIEW_FEE_USD || process.env.READINESS_PRICE_USD),
    ghsMinor: envMinor(process.env.BASE_REVIEW_FEE_GHS || process.env.READINESS_PRICE_GHS),
    turnaroundDays: process.env.READINESS_TURNAROUND_DAYS ? Number(process.env.READINESS_TURNAROUND_DAYS) : null,
    addOns: {},
    fx: fxRate > 0 ? { usdToGhs: fxRate, source: process.env.READINESS_FX_SOURCE || "owner-entered", date: process.env.READINESS_FX_DATE || "" } : null,
    coverage: process.env.READINESS_COVERAGE || null,
    refundPolicy: process.env.READINESS_REFUND_POLICY || null,
    costAssumptions: null,
  };
}

export async function getPriceSettings(): Promise<PriceSettings> {
  const env = envSettings();
  try {
    const raw = await kv.get(keys.settings);
    if (raw) {
      const s = JSON.parse(raw) as Partial<PriceSettings>;
      return {
        usdMinor: s.usdMinor ?? env.usdMinor, ghsMinor: s.ghsMinor ?? env.ghsMinor, turnaroundDays: s.turnaroundDays ?? env.turnaroundDays,
        addOns: s.addOns ?? env.addOns, fx: s.fx ?? env.fx, coverage: s.coverage ?? env.coverage, refundPolicy: s.refundPolicy ?? env.refundPolicy,
        costAssumptions: s.costAssumptions ?? env.costAssumptions, updatedAt: s.updatedAt,
      };
    }
  } catch { /* KV unavailable → env */ }
  return env;
}

export async function setPriceSettings(s: Partial<PriceSettings>) {
  const cur = await getPriceSettings();
  const next: PriceSettings = { ...cur, ...s, updatedAt: new Date().toISOString() };
  if (s.costAssumptions && cur.costAssumptions && JSON.stringify(s.costAssumptions.ghsPerSqm) !== JSON.stringify(cur.costAssumptions.ghsPerSqm) && s.costAssumptions.version === cur.costAssumptions.version) {
    // Never silently change a published assumption set: bump the version.
    next.costAssumptions = { ...s.costAssumptions, version: bumpVersion(cur.costAssumptions.version) };
  }
  if (next.costAssumptions) next.costAssumptions.updatedAt = new Date().toISOString();
  await kv.set(keys.settings, JSON.stringify(next));
  return next;
}

export const bumpVersion = (v: string) => { const m = /^(.*?)(\d+)$/.exec(v); return m ? `${m[1]}${Number(m[2]) + 1}` : `${v}.1`; };

/** Public subset: no internal cost assumptions. */
export const publicPrice = (p: PriceSettings) => ({
  usdMinor: p.usdMinor, ghsMinor: p.ghsMinor, turnaroundDays: p.turnaroundDays, addOns: p.addOns, fx: p.fx, coverage: p.coverage, refundPolicy: p.refundPolicy,
});

/** Sandbox-only test value so mock checkout can run before the owner sets a price. Never shown as the fee. */
export const SANDBOX_TEST_MINOR = 100;

export const formatMoney = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(minor / 100);
