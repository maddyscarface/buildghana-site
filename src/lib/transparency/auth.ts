import "server-only";
import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { MEDIA_URL_TTL_S, TP_SESSION_COOKIE, TP_SESSION_TTL_S, tpConfig } from "./config";
import { getStore } from "./service";
import type { User } from "./types";

/**
 * Demo session auth for the synthetic portal. A shared demo access code (server env, never in client code)
 * unlocks a persona picker; the server issues an HMAC-signed, HttpOnly, SameSite=Strict cookie (8 h).
 * Every request re-checks the user (disabled / sessions revoked) and project memberships, so revocation is immediate.
 * NOT the production auth model: production needs invite-only accounts with email verification + MFA (owner decision).
 */
const b64 = (b: Buffer | string) => Buffer.from(b).toString("base64url");
const secret = () => process.env.TRANSPARENCY_SESSION_SECRET || "";
const sign = (data: string) => createHmac("sha256", secret()).update(data).digest("base64url");
const safeEq = (a: string, b: string) => { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); };

type Payload = { uid: string; iat: number; exp: number; n: string };

export function issueSession(userId: string): { value: string; maxAge: number } {
  const now = Date.now();
  const p: Payload = { uid: userId, iat: now, exp: now + TP_SESSION_TTL_S * 1000, n: randomBytes(9).toString("base64url") };
  const data = b64(JSON.stringify(p));
  return { value: `${data}.${sign(data)}`, maxAge: TP_SESSION_TTL_S };
}

export function readSession(value: string | undefined | null): Payload | null {
  if (!value || !secret()) return null;
  const [data, sig] = value.split(".");
  if (!data || !sig || !safeEq(sig, sign(data))) return null;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString()) as Payload;
    if (typeof p.uid !== "string" || typeof p.exp !== "number" || p.exp < Date.now()) return null;
    return p;
  } catch { return null; }
}

export async function userFromSessionValue(value: string | undefined | null): Promise<User | null> {
  if (!tpConfig().enabled) return null;
  const p = readSession(value);
  if (!p) return null;
  const user = await getStore().get("users", p.uid);
  if (!user || user.disabled || p.iat <= user.sessionsRevokedBefore) return null;
  return user;
}

export function cookieFromRequest(req: Request, name = TP_SESSION_COOKIE): string {
  for (const part of (req.headers.get("cookie") || "").split(/;\s*/)) { const i = part.indexOf("="); if (i > 0 && part.slice(0, i) === name) return decodeURIComponent(part.slice(i + 1)); }
  return "";
}

export function sessionCookieHeader(req: Request, value: string, maxAge: number) {
  const secure = new URL(req.url).protocol === "https:" || req.headers.get("x-forwarded-proto") === "https";
  return `${TP_SESSION_COOKIE}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secure ? "; Secure" : ""}`;
}

export function checkAccessCode(code: string): boolean {
  const expected = process.env.TRANSPARENCY_DEMO_ACCESS_CODE || "";
  if (expected.length < 12 || typeof code !== "string") return false;
  const h = (s: string) => createHash("sha256").update(s).digest("hex");
  return safeEq(h(code), h(expected));
}

/** In-process login throttle (no external KV writes from the demo). */
const attempts = new Map<string, { n: number; until: number }>();
/** Failed-attempt throttle (successful sign-ins don't count, so switching demo personas is not penalised). */
export function loginThrottle(key: string, max = 8): boolean {
  const cur = attempts.get(key);
  return !cur || cur.until < Date.now() || cur.n < max;
}
export function recordLoginFailure(key: string, windowMs = 15 * 60_000) {
  const now = Date.now(), cur = attempts.get(key);
  if (!cur || cur.until < now) attempts.set(key, { n: 1, until: now + windowMs }); else cur.n += 1;
}

/** Short-lived media URL signature bound to the user and the asset. The route ALSO re-checks the session + permission. */
export function mediaSig(mediaId: string, userId: string, exp: number) { return sign(`media:${mediaId}:${userId}:${exp}`); }
export function signedMediaUrl(mediaId: string, userId: string) {
  const exp = Math.floor(Date.now() / 1000) + MEDIA_URL_TTL_S;
  return `/api/portal/media/${encodeURIComponent(mediaId)}?exp=${exp}&sig=${mediaSig(mediaId, userId, exp)}`;
}
export function verifyMediaSig(mediaId: string, userId: string, exp: number, sig: string) {
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  return safeEq(sig, mediaSig(mediaId, userId, exp));
}

export const ipHash = (req: Request) => createHash("sha256").update(`${req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local"}:${secret().slice(0, 8)}`).digest("hex").slice(0, 16);
