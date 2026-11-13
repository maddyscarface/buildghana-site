import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Signing secrets. In sandbox mode (no secret configured) a fixed, clearly-insecure dev secret is
 * used so staging works without credentials. Never rely on it: set READINESS_TOKEN_SECRET and
 * DOCS_SIGNING_SECRET (32+ random bytes each) before taking real cases.
 */
const DEV_SECRET = "bga-sandbox-insecure-dev-secret-do-not-use-in-production";

export const tokenSecretConfigured = Boolean(process.env.READINESS_TOKEN_SECRET);
export const docsSecretConfigured = Boolean(process.env.DOCS_SIGNING_SECRET);

/** Production deployments must have real secrets and durable storage before taking cases. */
export const productionReady = (kvOk: boolean) =>
  process.env.VERCEL_ENV !== "production" || (tokenSecretConfigured && kvOk);

const tokenSecret = () => process.env.READINESS_TOKEN_SECRET || DEV_SECRET;
const docsSecret = () => process.env.DOCS_SIGNING_SECRET || process.env.READINESS_TOKEN_SECRET || DEV_SECRET;

export function hmac(secret: string, data: string, alg: "sha256" | "sha512" = "sha256") {
  return createHmac(alg, secret).update(data).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a); const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

/** Client access token for a case page (capability URL). */
export const caseToken = (caseId: string) => hmac(tokenSecret(), `case:${caseId}`).slice(0, 40);
export const verifyCaseToken = (caseId: string, token: string | null | undefined) => !!token && safeEqual(caseToken(caseId), token);

/** Signed, expiring document URL signature. */
export const signDocUrl = (op: "put" | "get", key: string, exp: number, extra = "") => hmac(docsSecret(), `${op}\n${key}\n${exp}\n${extra}`);
export const verifyDocSig = (op: "put" | "get", key: string, exp: number, sig: string, extra = "") =>
  exp > Math.floor(Date.now() / 1000) && safeEqual(signDocUrl(op, key, exp, extra), sig);

/** Admin bearer check. Admin is DISABLED (always false) when ADMIN_TOKEN is unset or too short. */
export const adminEnabled = () => (process.env.ADMIN_TOKEN || "").length >= 16;
export function verifyAdmin(header: string | null): boolean {
  if (!adminEnabled()) return false;
  const supplied = (header || "").replace(/^Bearer\s+/i, "");
  return safeEqual(hmac("admin", supplied), hmac("admin", process.env.ADMIN_TOKEN!));
}

/** Capability token for a property inquiry's private upload link (seller/buyer, post-submission). */
export const propertyToken = (id: string) => hmac(tokenSecret(), `property:${id}`).slice(0, 40);
export const verifyPropertyToken = (id: string, token: string | null | undefined) => !!token && safeEqual(propertyToken(id), token);

/**
 * Property-introductions staff roles. ADMIN_TOKEN = admin; optional PROPERTY_REVIEWER_TOKEN and
 * PROPERTY_LEGAL_TOKEN (16+ chars each) grant the reviewer / legal-reviewer roles. Returns null when unauthorised.
 */
export function resolveStaffRole(header: string | null): "admin" | "reviewer" | "legal_reviewer" | null {
  const supplied = (header || "").replace(/^Bearer\s+/i, "");
  if (!supplied) return null;
  const check = (envName: string) => {
    const v = process.env[envName] || "";
    return v.length >= 16 && safeEqual(hmac("staff", supplied), hmac("staff", v));
  };
  if (check("ADMIN_TOKEN")) return "admin";
  if (check("PROPERTY_LEGAL_TOKEN")) return "legal_reviewer";
  if (check("PROPERTY_REVIEWER_TOKEN")) return "reviewer";
  return null;
}
