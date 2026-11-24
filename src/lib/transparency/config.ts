/**
 * Feature gate for the Phase 5 portal. Fail closed:
 *  - Production (VERCEL_ENV=production) is always OFF until durable storage + a hosted identity provider with
 *    MFA are provisioned and the owner approves the rollout.
 *  - Elsewhere the portal runs only when TRANSPARENCY_DEMO=true AND a session secret (≥32 chars) AND a demo
 *    access code (≥12 chars) are set. The demo uses the in-memory adapter with synthetic data only.
 */
export type TpConfig = { enabled: boolean; demo: boolean; storeKind: "memory" | "supabase"; reason: string };

export function tpConfig(env: Record<string, string | undefined> = process.env): TpConfig {
  const production = env.VERCEL_ENV === "production";
  const storeKind = env.TRANSPARENCY_STORE === "supabase" ? "supabase" : "memory";
  const demo = env.TRANSPARENCY_DEMO === "true";
  if (production) return { enabled: false, demo: false, storeKind, reason: "Portal is not enabled on production (needs durable storage, MFA provider and owner approval)." };
  if (storeKind === "supabase") return { enabled: false, demo: false, storeKind, reason: "Durable storage adapter is not connected yet." };
  if (!demo) return { enabled: false, demo: false, storeKind, reason: "Demo portal is switched off (TRANSPARENCY_DEMO)." };
  if ((env.TRANSPARENCY_SESSION_SECRET || "").length < 32) return { enabled: false, demo, storeKind, reason: "Session secret missing." };
  if ((env.TRANSPARENCY_DEMO_ACCESS_CODE || "").length < 12) return { enabled: false, demo, storeKind, reason: "Demo access code missing." };
  return { enabled: true, demo: true, storeKind, reason: "Synthetic demo (in-memory, not durable)." };
}

export const TP_SESSION_COOKIE = "bga_tp";
export const TP_SESSION_TTL_S = 8 * 60 * 60;
/** Media URLs are short-lived even after authorisation (spec 02 §4). */
export const MEDIA_URL_TTL_S = 5 * 60;
