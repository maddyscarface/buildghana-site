import "server-only";
import { kv } from "@/lib/server/kv";
import { keys } from "./store";

/**
 * Owner-configurable price. Precedence: admin dashboard setting (KV) → env → unset.
 * Amounts are in minor units (cents / pesewas). Nothing on the site invents a fee.
 */
export type PriceSettings = { usdMinor: number | null; ghsMinor: number | null; turnaroundDays: number | null; updatedAt?: string };

const envMinor = (v?: string) => (v && Number(v) > 0 ? Math.round(Number(v) * 100) : null);

export async function getPriceSettings(): Promise<PriceSettings> {
  const env: PriceSettings = {
    usdMinor: envMinor(process.env.READINESS_PRICE_USD),
    ghsMinor: envMinor(process.env.READINESS_PRICE_GHS),
    turnaroundDays: process.env.READINESS_TURNAROUND_DAYS ? Number(process.env.READINESS_TURNAROUND_DAYS) : null,
  };
  try {
    const raw = await kv.get(keys.settings);
    if (raw) {
      const s = JSON.parse(raw) as PriceSettings;
      return { usdMinor: s.usdMinor ?? env.usdMinor, ghsMinor: s.ghsMinor ?? env.ghsMinor, turnaroundDays: s.turnaroundDays ?? env.turnaroundDays, updatedAt: s.updatedAt };
    }
  } catch { /* KV unavailable → env */ }
  return env;
}

export async function setPriceSettings(s: Partial<PriceSettings>) {
  const cur = await getPriceSettings();
  const next: PriceSettings = { ...cur, ...s, updatedAt: new Date().toISOString() };
  await kv.set(keys.settings, JSON.stringify(next));
  return next;
}

/** Sandbox-only test value so mock checkout can run before the owner sets a price. Never shown as the fee. */
export const SANDBOX_TEST_MINOR = 100;

export const formatMoney = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency, minimumFractionDigits: 2 }).format(minor / 100);
