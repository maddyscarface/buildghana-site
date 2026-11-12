"use client";
import { oaiqConsent } from "@/lib/openai-ads/client";

/**
 * Analytics event abstraction. Every browser event goes to window.dataLayer; GTM maps
 * them to GA4, Google Ads and Meta Pixel (see docs/09-tracking-plan.md).
 *
 * Event taxonomy: page_view · view_service · form_start · form_step · form_abandon ·
 *                 generate_lead · schedule · whatsapp_click · cta_click
 * (qualified_lead and purchase are sent server-side from the CRM webhook.)
 */

export type EventName =
  | "page_view" | "view_service" | "form_start" | "form_step" | "form_abandon"
  | "generate_lead" | "schedule" | "whatsapp_click" | "cta_click" | "consent_update"
  // Ghana Build Readiness Review funnel (revenue_stream = "readiness_review")
  // Spec names: readiness_view · readiness_started · document_inventory_completed · checkout_started · payment_confirmed
  // (site_visit_booked, report_delivered, qualified_project_consultation, project_won are sent server-side, deduped per case.)
  | "readiness_view" | "readiness_started" | "readiness_step" | "document_inventory_completed" | "readiness_intake_submit"
  | "checkout_started" | "payment_confirmed" | "document_upload" | "report_download" | "report_acknowledged";

type Params = Record<string, string | number | boolean | undefined | Record<string, unknown>>;

declare global {
  interface Window { dataLayer?: Record<string, unknown>[]; gtag?: (...args: unknown[]) => void }
  interface Navigator { globalPrivacyControl?: boolean }
}

export function track(event: EventName, params: Params = {}, eventId?: string) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  const id = eventId ?? crypto.randomUUID();
  window.dataLayer.push({ event, event_id: id, ...params });
  forwardToTags(event, params, id);
  if (process.env.NODE_ENV !== "production") console.debug("[track]", event, params, eventId);
}

/** Fires an event at most once per browser for the given key (prevents duplicate conversions on refresh/back). */
export function trackOnce(key: string, event: EventName, params: Params = {}, eventId?: string) {
  try {
    const k = `bga_fired:${key}`;
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, String(Date.now()));
  } catch { /* storage blocked — fall through and fire */ }
  track(event, params, eventId);
  return true;
}

/** Consent Mode v2 update. Called by the consent banner. */
export function updateConsent(granted: { analytics: boolean; ads: boolean }) {
  if (typeof window === "undefined") return;
  window.dataLayer = window.dataLayer || [];
  // gtag-style consent command must be pushed as an Arguments object
  // eslint-disable-next-line prefer-rest-params
  const gtag = function (..._args: unknown[]) { window.dataLayer!.push(arguments as unknown as Record<string, unknown>); };
  gtag("consent", "update", {
    analytics_storage: granted.analytics ? "granted" : "denied",
    ad_storage: granted.ads ? "granted" : "denied",
    ad_user_data: granted.ads ? "granted" : "denied",
    ad_personalization: granted.ads ? "granted" : "denied",
  });
  track("consent_update", { analytics: granted.analytics, ads: granted.ads });
  oaiqConsent(granted.ads && navigator.globalPrivacyControl !== true);
  window.dispatchEvent(new Event("bga:consent-changed"));
}

/** Advertising consent right now: stored choice, else the site default; GPC always denies. */
export function adsConsentGranted() {
  try {
    if ((navigator as Navigator & { globalPrivacyControl?: boolean }).globalPrivacyControl === true) return false;
    const s = JSON.parse(localStorage.getItem("bga_consent") || "null") as { ads?: boolean } | null;
    return s ? Boolean(s.ads) : process.env.NEXT_PUBLIC_CONSENT_DEFAULT === "granted";
  } catch {
    return false;
  }
}

/**
 * Direct-tag bridge for sites that load GA4 / Google Ads / Meta Pixel without GTM (see MarketingTags).
 * Each call is a no-op unless that tag was loaded (it only loads with an ID AND the right consent).
 */
const META_EVENT: Partial<Record<EventName, string>> = { generate_lead: "Lead", readiness_intake_submit: "Lead", checkout_started: "InitiateCheckout", payment_confirmed: "Purchase", schedule: "Schedule" };
function forwardToTags(event: EventName, params: Params, eventId: string) {
  const w = window as Window & { fbq?: (...a: unknown[]) => void };
  const flat = Object.fromEntries(Object.entries(params).filter(([, v]) => typeof v !== "object"));
  if (typeof w.gtag === "function" && process.env.NEXT_PUBLIC_GA4_ID) {
    w.gtag("event", event, { ...flat, event_id: eventId, send_to: process.env.NEXT_PUBLIC_GA4_ID });
  }
  const adsId = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;
  const label = event === "payment_confirmed" ? process.env.NEXT_PUBLIC_GOOGLE_ADS_PURCHASE_LABEL : event === "generate_lead" || event === "readiness_intake_submit" ? process.env.NEXT_PUBLIC_GOOGLE_ADS_LEAD_LABEL : undefined;
  if (typeof w.gtag === "function" && adsId && label) {
    w.gtag("event", "conversion", { send_to: `${adsId}/${label}`, value: flat.value, currency: flat.currency, transaction_id: flat.transaction_id ?? eventId });
  }
  const metaName = META_EVENT[event];
  if (typeof w.fbq === "function" && metaName) w.fbq("track", metaName, flat, { eventID: eventId });
}
