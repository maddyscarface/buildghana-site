"use client";

/**
 * First-party attribution capture.
 * - Last-touch: overwritten whenever a URL arrives with campaign params or click ids (90-day TTL).
 * - First-touch: written once, never overwritten.
 * Stored in localStorage only (first-party, no third-party cookies).
 */

import { openAiRefs } from "@/lib/openai-ads/client";
const KEYS = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "utm_id", "gclid", "gbraid", "wbraid", "fbclid", "msclkid", "ttclid", "li_fat_id"] as const;
const LAST = "bga_attr_last";
const FIRST = "bga_attr_first";
const TTL_MS = 90 * 24 * 60 * 60 * 1000;

export type Attribution = Partial<Record<(typeof KEYS)[number] | "fbc" | "fbp" | "landing_page" | "referrer" | "first_touch_source" | "first_touch_campaign" | "first_touch_at" | "openai_obref" | "openai_oppref" | "ga_client_id", string>>;

const readCookie = (name: string) =>
  typeof document === "undefined" ? undefined
    : document.cookie.split("; ").find((c) => c.startsWith(name + "="))?.split("=").slice(1).join("=");

function safeGet<T>(key: string): (T & { _ts?: number }) | null {
  try { return JSON.parse(localStorage.getItem(key) || "null"); } catch { return null; }
}
function safeSet(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch { /* blocked */ }
}

export function captureAttribution(url = window.location.href, referrer = document.referrer) {
  const u = new URL(url);
  const found: Attribution = {};
  for (const k of KEYS) {
    const v = u.searchParams.get(k);
    if (v) found[k] = v.slice(0, 500);
  }
  const hasCampaign = Object.keys(found).length > 0;
  const now = Date.now();

  if (hasCampaign) {
    if (found.fbclid) found.fbc = `fb.1.${now}.${found.fbclid}`;
    safeSet(LAST, { ...found, landing_page: u.pathname + u.search, referrer: referrer || undefined, _ts: now });
  }

  if (!safeGet(FIRST)) {
    const ref = referrer ? new URL(referrer).hostname : "";
    const source = found.utm_source || (found.gclid || found.gbraid || found.wbraid ? "google_ads" : found.fbclid ? "meta_ads" : ref || "direct");
    safeSet(FIRST, { source, campaign: found.utm_campaign, at: new Date(now).toISOString(), landing: u.pathname });
  }
}

export function getAttribution(): Attribution {
  const last = safeGet<Attribution>(LAST);
  const first = safeGet<{ source?: string; campaign?: string; at?: string; landing?: string }>(FIRST);
  const fresh = last && last._ts && Date.now() - last._ts < TTL_MS ? last : null;
  const { _ts, ...lastClean } = fresh ?? ({} as Attribution & { _ts?: number });
  void _ts;
  return {
    ...lastClean,
    fbc: readCookie("_fbc") || lastClean.fbc,
    fbp: readCookie("_fbp"),
    ga_client_id: readCookie("_ga")?.split(".").slice(-2).join("."),
    ...openAiRefs(),
    landing_page: lastClean.landing_page || first?.landing,
    referrer: lastClean.referrer || (typeof document !== "undefined" ? document.referrer || undefined : undefined),
    first_touch_source: first?.source,
    first_touch_campaign: first?.campaign,
    first_touch_at: first?.at,
  };
}
