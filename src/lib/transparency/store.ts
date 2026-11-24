/**
 * Storage boundary for the transparency portal.
 *
 *  - `memory`  : DEMO ADAPTER. In-process tables + blob store seeded with the synthetic project. Not durable:
 *                resets on deploy / cold start, and is NOT shared between server instances. Staging/dev only.
 *  - `supabase`: interface-ready target for Postgres (db/migrations/0005_transparency.up.sql, RLS) + private
 *                object storage (Supabase Storage or Cloudflare R2). Not connected: needs a provisioned project and
 *                keys (see docs/23-transparency-portal.md). Selecting it today disables the portal (fail closed).
 *
 * The production Upstash KV is deliberately NOT used by this module (no test writes to production data).
 */
import type { TableName, Tables } from "./types";

export interface BlobStore {
  /** Write bytes at an offset (resumable chunked upload). Returns total bytes stored for the key. */
  write(key: string, offset: number, bytes: Uint8Array): Promise<number>;
  size(key: string): Promise<number>;
  read(key: string): Promise<Uint8Array | null>;
  remove(key: string): Promise<void>;
}

export interface TransparencyStore {
  readonly kind: "memory" | "supabase";
  readonly durable: boolean;
  list<K extends TableName>(table: K, where?: Partial<Tables[K]>): Promise<Tables[K][]>;
  get<K extends TableName>(table: K, id: string): Promise<Tables[K] | null>;
  insert<K extends TableName>(table: K, row: Tables[K]): Promise<Tables[K]>;
  /** Optimistic concurrency: pass the version you read; a mismatch throws ConflictError. */
  update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>, expectedVersion?: number): Promise<Tables[K]>;
  blobs: BlobStore;
}

export class ConflictError extends Error { constructor() { super("This record was changed by someone else. Reload and try again."); } }
export class NotConfiguredError extends Error { constructor(what: string) { super(`${what} is not configured`); } }

/** Append-only tables: rows can never be updated or deleted through the store. */
export const APPEND_ONLY: TableName[] = ["audit_events", "report_reviews", "inspections", "payment_approvals", "schedule_revisions", "outbox_events"];

const MAX_BLOB_BYTES_TOTAL = 200 * 1024 * 1024;

class MemoryBlobs implements BlobStore {
  private data = new Map<string, Buffer>();
  private total = 0;
  async write(key: string, offset: number, bytes: Uint8Array) {
    const cur = this.data.get(key) ?? Buffer.alloc(0);
    if (offset !== cur.length) return cur.length; // only sequential appends; caller resumes from returned size
    if (this.total + bytes.length > MAX_BLOB_BYTES_TOTAL) throw new Error("Demo storage is full. An admin can reset the demo.");
    const next = Buffer.concat([cur, Buffer.from(bytes)]);
    this.data.set(key, next); this.total += bytes.length;
    return next.length;
  }
  async size(key: string) { return this.data.get(key)?.length ?? 0; }
  async read(key: string) { const b = this.data.get(key); return b ? new Uint8Array(b) : null; }
  async remove(key: string) { const b = this.data.get(key); if (b) this.total -= b.length; this.data.delete(key); }
}

type Rows = { [K in TableName]: Map<string, Tables[K]> };

export class MemoryStore implements TransparencyStore {
  readonly kind = "memory" as const;
  readonly durable = false;
  blobs: BlobStore = new MemoryBlobs();
  private rows: Rows;
  constructor(seed: { [K in TableName]: Tables[K][] }, blobs: Record<string, string> = {}) {
    for (const [k, v] of Object.entries(blobs)) void this.blobs.write(k, 0, new TextEncoder().encode(v));
    this.rows = Object.fromEntries(Object.entries(seed).map(([t, list]) => [t, new Map((list as { id: string }[]).map((r) => [r.id, structuredClone(r)]))])) as unknown as Rows;
  }
  async list<K extends TableName>(table: K, where?: Partial<Tables[K]>) {
    const all = [...(this.rows[table] as Map<string, Tables[K]>).values()];
    const out = where ? all.filter((r) => Object.entries(where).every(([k, v]) => (r as Record<string, unknown>)[k] === v)) : all;
    return out.map((r) => structuredClone(r));
  }
  async get<K extends TableName>(table: K, id: string) {
    const r = (this.rows[table] as Map<string, Tables[K]>).get(id);
    return r ? structuredClone(r) : null;
  }
  async insert<K extends TableName>(table: K, row: Tables[K]) {
    const m = this.rows[table] as Map<string, Tables[K]>;
    const id = (row as { id: string }).id;
    if (m.has(id)) throw new Error(`Duplicate id in ${table}`);
    m.set(id, structuredClone(row));
    return structuredClone(row);
  }
  async update<K extends TableName>(table: K, id: string, patch: Partial<Tables[K]>, expectedVersion?: number) {
    if (APPEND_ONLY.includes(table)) throw new Error(`${table} is append-only`);
    const m = this.rows[table] as Map<string, Tables[K]>;
    const cur = m.get(id);
    if (!cur) throw new Error(`Not found in ${table}`);
    const curVersion = (cur as { version?: number }).version;
    if (expectedVersion !== undefined && curVersion !== undefined && curVersion !== expectedVersion) throw new ConflictError();
    const next = { ...cur, ...structuredClone(patch), ...(curVersion !== undefined ? { version: curVersion + 1 } : {}) } as Tables[K];
    m.set(id, next);
    return structuredClone(next);
  }
}

/** Placeholder for the durable adapter. Every call fails closed until Postgres + object storage are provisioned. */
export class SupabaseStore implements TransparencyStore {
  readonly kind = "supabase" as const;
  readonly durable = true;
  private fail(): never { throw new NotConfiguredError("Durable transparency storage (Postgres + private object storage)"); }
  list(): never { return this.fail(); }
  get(): never { return this.fail(); }
  insert(): never { return this.fail(); }
  update(): never { return this.fail(); }
  blobs: BlobStore = { write: () => this.fail(), size: () => this.fail(), read: () => this.fail(), remove: () => this.fail() };
}
