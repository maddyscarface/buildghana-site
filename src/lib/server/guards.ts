import "server-only";
import { kv } from "./kv";

/** Fixed-window rate limit. Returns true if the request is allowed. */
export async function rateLimit(identifier: string, limit = 5, windowSec = 600): Promise<boolean> {
  const bucket = Math.floor(Date.now() / (windowSec * 1000));
  const n = await kv.incr(`rl:${identifier}:${bucket}`, windowSec);
  return n <= limit;
}

export function clientIp(headers: Headers): string {
  return (
    headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    headers.get("x-real-ip") ||
    "0.0.0.0"
  );
}

/** Cloudflare Turnstile verification. Skipped (returns true) when not configured. */
export async function verifyTurnstile(token: string | undefined, ip: string): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ secret, response: token, remoteip: ip }),
    });
    const json = (await res.json()) as { success: boolean };
    return json.success === true;
  } catch {
    return false;
  }
}
