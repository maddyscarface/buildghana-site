import "server-only";

/**
 * GA4 Measurement Protocol — used only for offline/CRM events (qualified_lead, purchase)
 * that happen after the visitor has left the site. Browser events go through GTM.
 * Inactive unless GA4_MEASUREMENT_ID and GA4_API_SECRET are set.
 */
const MID = process.env.GA4_MEASUREMENT_ID;
const SECRET = process.env.GA4_API_SECRET;
export const ga4Configured = Boolean(MID && SECRET);

export async function sendGa4Event(opts: {
  clientId: string;
  name: "qualified_lead" | "purchase" | "schedule" | "close_convert_lead";
  params: Record<string, string | number>;
  debug?: boolean;
}) {
  if (!ga4Configured) return { status: "skipped" as const };
  const path = opts.debug ? "debug/mp/collect" : "mp/collect";
  const res = await fetch(`https://www.google-analytics.com/${path}?measurement_id=${MID}&api_secret=${SECRET}`, {
    method: "POST",
    body: JSON.stringify({ client_id: opts.clientId, events: [{ name: opts.name, params: opts.params }] }),
  });
  return { status: res.ok ? ("ok" as const) : ("error" as const), detail: opts.debug ? await res.text() : undefined };
}
