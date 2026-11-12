import "server-only";

/**
 * Google Ads offline conversion hook (server side). Inactive unless every GOOGLE_ADS_* value is set.
 * Uploading click conversions needs the Google Ads API (OAuth refresh token + developer token);
 * until those are provisioned this logs what would be uploaded so revenue can be back-filled.
 * Browser-side conversions use NEXT_PUBLIC_GOOGLE_ADS_ID + labels via gtag/GTM.
 *
 * Env: GOOGLE_ADS_CUSTOMER_ID, GOOGLE_ADS_DEVELOPER_TOKEN, GOOGLE_ADS_OAUTH_CLIENT_ID, GOOGLE_ADS_OAUTH_CLIENT_SECRET,
 *      GOOGLE_ADS_REFRESH_TOKEN, GOOGLE_ADS_CONVERSION_ACTION_PURCHASE (resource name), GOOGLE_ADS_LOGIN_CUSTOMER_ID (optional)
 */
const REQUIRED = ["GOOGLE_ADS_CUSTOMER_ID", "GOOGLE_ADS_DEVELOPER_TOKEN", "GOOGLE_ADS_OAUTH_CLIENT_ID", "GOOGLE_ADS_OAUTH_CLIENT_SECRET", "GOOGLE_ADS_REFRESH_TOKEN", "GOOGLE_ADS_CONVERSION_ACTION_PURCHASE"];
export const googleAdsConfigured = () => REQUIRED.every((k) => process.env[k]);

export type OfflineConversion = { orderId: string; gclid?: string; gbraid?: string; wbraid?: string; value: number; currency: string; at: Date; email?: string };

export async function uploadOfflineConversion(c: OfflineConversion): Promise<{ status: "ok" | "skipped" | "error"; detail?: string }> {
  if (!c.gclid && !c.gbraid && !c.wbraid) return { status: "skipped", detail: "no Google click id on this case" };
  if (!googleAdsConfigured()) {
    console.info("[google-ads:noop] would upload conversion", JSON.stringify({ orderId: c.orderId, value: c.value, currency: c.currency, hasGclid: !!c.gclid }));
    return { status: "skipped", detail: "Google Ads API not configured" };
  }
  try {
    const tok = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", client_id: process.env.GOOGLE_ADS_OAUTH_CLIENT_ID!, client_secret: process.env.GOOGLE_ADS_OAUTH_CLIENT_SECRET!, refresh_token: process.env.GOOGLE_ADS_REFRESH_TOKEN! }),
    }).then((r) => r.json() as Promise<{ access_token?: string }>);
    if (!tok.access_token) return { status: "error", detail: "oauth failed" };
    const cid = process.env.GOOGLE_ADS_CUSTOMER_ID!.replace(/-/g, "");
    const dt = c.at.toISOString().replace("T", " ").replace(/\.\d+Z$/, "+00:00");
    const res = await fetch(`https://googleads.googleapis.com/v17/customers/${cid}:uploadClickConversions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${tok.access_token}`, "developer-token": process.env.GOOGLE_ADS_DEVELOPER_TOKEN!, "Content-Type": "application/json",
        ...(process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID ? { "login-customer-id": process.env.GOOGLE_ADS_LOGIN_CUSTOMER_ID.replace(/-/g, "") } : {}),
      },
      body: JSON.stringify({
        partialFailure: true,
        conversions: [{ conversionAction: process.env.GOOGLE_ADS_CONVERSION_ACTION_PURCHASE, conversionDateTime: dt, conversionValue: c.value, currencyCode: c.currency, orderId: c.orderId, ...(c.gclid ? { gclid: c.gclid } : c.gbraid ? { gbraid: c.gbraid } : { wbraid: c.wbraid }) }],
      }),
    });
    return { status: res.ok ? "ok" : "error", detail: res.ok ? undefined : (await res.text()).slice(0, 300) };
  } catch (e) {
    return { status: "error", detail: (e as Error).message };
  }
}
