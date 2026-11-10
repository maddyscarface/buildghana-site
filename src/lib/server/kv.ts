import "server-only";

/**
 * Minimal key-value store.
 * Production: Upstash Redis via REST (works on Vercel serverless/edge, no SDK needed).
 * Dev fallback: process memory — NOT durable and NOT shared across serverless instances.
 */

const URL_ = process.env.UPSTASH_REDIS_REST_URL;
const TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
export const kvConfigured = Boolean(URL_ && TOKEN);

type Entry = { v: string; exp?: number };
const g = globalThis as unknown as { __bgaMem?: Map<string, Entry> };
const mem = (g.__bgaMem ??= new Map<string, Entry>());

async function upstash<T = unknown>(command: (string | number)[]): Promise<T> {
  const res = await fetch(URL_!, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(command),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash ${command[0]} failed: ${res.status}`);
  const json = (await res.json()) as { result: T; error?: string };
  if (json.error) throw new Error(`Upstash error: ${json.error}`);
  return json.result;
}

function memGet(key: string) {
  const e = mem.get(key);
  if (!e) return null;
  if (e.exp && e.exp < Date.now()) { mem.delete(key); return null; }
  return e;
}

export const kv = {
  async get(key: string): Promise<string | null> {
    if (kvConfigured) return upstash<string | null>(["GET", key]);
    return memGet(key)?.v ?? null;
  },
  async set(key: string, value: string, ttlSec?: number): Promise<void> {
    if (kvConfigured) { await upstash(ttlSec ? ["SET", key, value, "EX", ttlSec] : ["SET", key, value]); return; }
    mem.set(key, { v: value, exp: ttlSec ? Date.now() + ttlSec * 1000 : undefined });
  },
  /** Set only if absent. Returns true if this call acquired the key. */
  async setNX(key: string, value: string, ttlSec: number): Promise<boolean> {
    if (kvConfigured) return (await upstash<string | null>(["SET", key, value, "NX", "EX", ttlSec])) === "OK";
    if (memGet(key)) return false;
    mem.set(key, { v: value, exp: Date.now() + ttlSec * 1000 });
    return true;
  },
  /** Atomic increment with expiry on first hit. */
  async incr(key: string, ttlSec: number): Promise<number> {
    if (kvConfigured) {
      const n = await upstash<number>(["INCR", key]);
      if (n === 1) await upstash(["EXPIRE", key, ttlSec]);
      return n;
    }
    const e = memGet(key);
    const n = (e ? Number(e.v) : 0) + 1;
    mem.set(key, { v: String(n), exp: e?.exp ?? Date.now() + ttlSec * 1000 });
    return n;
  },
  async lpush(key: string, value: string): Promise<void> {
    if (kvConfigured) { await upstash(["LPUSH", key, value]); return; }
    const e = memGet(key);
    const arr = e ? (JSON.parse(e.v) as string[]) : [];
    arr.unshift(value);
    mem.set(key, { v: JSON.stringify(arr.slice(0, 500)) });
  },
};

/** Test helper */
export function __resetMemoryStore() { mem.clear(); }
