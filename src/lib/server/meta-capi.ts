import "server-only";
import { normEmail, normName, normPhone, sha256 } from "./hash";

/**
 * Meta Conversions API. Inactive unless META_PIXEL_ID and META_CAPI_ACCESS_TOKEN are set.
 * Deduplication: the browser Pixel event (via GTM) and this server event share `event_id`.
 */

const PIXEL = process.env.META_PIXEL_ID;
const TOKEN = process.env.META_CAPI_ACCESS_TOKEN;
const VERSION = process.env.META_GRAPH_VERSION || "v21.0";
export const capiConfigured = Boolean(PIXEL && TOKEN);

export type CapiEvent = {
  eventName: "Lead" | "Schedule" | "Purchase" | "QualifiedLead" | "SubmitApplication";
  eventId: string;
  eventSourceUrl?: string;
  actionSource?: "website" | "system_generated" | "crm";
  user: {
    email?: string; phone?: string; firstName?: string; lastName?: string; country?: string;
    ip?: string; userAgent?: string; fbc?: string; fbp?: string; externalId?: string;
  };
  custom?: Record<string, string | number>;
};

export function buildCapiPayload(e: CapiEvent) {
  const u = e.user;
  const user_data: Record<string, unknown> = {};
  if (u.email) user_data.em = [sha256(normEmail(u.email))];
  if (u.phone) user_data.ph = [sha256(normPhone(u.phone))];
  if (u.firstName) user_data.fn = [sha256(normName(u.firstName))];
  if (u.lastName) user_data.ln = [sha256(normName(u.lastName))];
  if (u.country && u.country.length === 2) user_data.country = [sha256(u.country.toLowerCase())];
  if (u.externalId) user_data.external_id = [sha256(u.externalId)];
  if (u.ip) user_data.client_ip_address = u.ip;
  if (u.userAgent) user_data.client_user_agent = u.userAgent;
  if (u.fbc) user_data.fbc = u.fbc;
  if (u.fbp) user_data.fbp = u.fbp;

  return {
    data: [
      {
        event_name: e.eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_id: e.eventId,
        action_source: e.actionSource ?? "website",
        event_source_url: e.eventSourceUrl,
        user_data,
        custom_data: e.custom,
      },
    ],
    ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
  };
}

export async function sendCapiEvent(e: CapiEvent): Promise<{ status: "skipped" | "ok" | "error"; detail?: string }> {
  if (!capiConfigured) return { status: "skipped", detail: "META_PIXEL_ID / META_CAPI_ACCESS_TOKEN not set" };
  try {
    const res = await fetch(`https://graph.facebook.com/${VERSION}/${PIXEL}/events?access_token=${TOKEN}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildCapiPayload(e)),
      cache: "no-store",
    });
    const text = await res.text();
    return res.ok ? { status: "ok", detail: text.slice(0, 200) } : { status: "error", detail: `${res.status} ${text.slice(0, 300)}` };
  } catch (err) {
    return { status: "error", detail: (err as Error).message };
  }
}
