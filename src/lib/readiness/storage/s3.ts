import "server-only";
import { createHash, createHmac } from "node:crypto";
import { uploadPolicy } from "@/config/readiness";
import type { DocumentStore, SignedUrl } from "./types";

/**
 * S3-compatible adapter (AWS S3, Cloudflare R2, Backblaze B2, MinIO) using SigV4 query presigning.
 * Bucket must be PRIVATE with server-side encryption on, and a CORS rule allowing PUT from the site
 * origin. Not exercised against a live bucket yet — verify with a test bucket before go-live.
 *
 * Env: DOCS_S3_BUCKET, DOCS_S3_REGION (R2: "auto"), DOCS_S3_ENDPOINT (e.g. https://<acct>.r2.cloudflarestorage.com),
 *      DOCS_S3_ACCESS_KEY_ID, DOCS_S3_SECRET_ACCESS_KEY
 */
const cfg = () => ({
  bucket: process.env.DOCS_S3_BUCKET!, region: process.env.DOCS_S3_REGION || "auto",
  endpoint: (process.env.DOCS_S3_ENDPOINT || `https://s3.${process.env.DOCS_S3_REGION}.amazonaws.com`).replace(/\/$/, ""),
  keyId: process.env.DOCS_S3_ACCESS_KEY_ID!, secret: process.env.DOCS_S3_SECRET_ACCESS_KEY!,
});
export const s3Configured = () => Boolean(process.env.DOCS_S3_BUCKET && process.env.DOCS_S3_ACCESS_KEY_ID && process.env.DOCS_S3_SECRET_ACCESS_KEY && (process.env.DOCS_S3_ENDPOINT || process.env.DOCS_S3_REGION));

const sha256hex = (s: string | Uint8Array) => createHash("sha256").update(s).digest("hex");
const hm = (k: Buffer | string, s: string) => createHmac("sha256", k).update(s).digest();
const enc = (s: string) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());

/** SigV4 presigned URL (path-style). Exported for unit tests. */
export function presign(opts: { method: "GET" | "PUT"; key: string; ttlSec: number; now?: Date; extraQuery?: Record<string, string>; signedHeaders?: Record<string, string> }, c = cfg()) {
  const now = opts.now ?? new Date();
  const amzDate = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const date = amzDate.slice(0, 8);
  const scope = `${date}/${c.region}/s3/aws4_request`;
  const host = new URL(c.endpoint).host;
  const canonicalUri = `/${c.bucket}/${opts.key.split("/").map(enc).join("/")}`;
  const hdrs: Record<string, string> = { host, ...(opts.signedHeaders ?? {}) };
  const hNames = Object.keys(hdrs).map((h) => h.toLowerCase()).sort();
  const q: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": `${c.keyId}/${scope}`, "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(opts.ttlSec), "X-Amz-SignedHeaders": hNames.join(";"), ...(opts.extraQuery ?? {}),
  };
  const canonicalQuery = Object.keys(q).sort().map((k) => `${enc(k)}=${enc(q[k])}`).join("&");
  const lower = Object.fromEntries(Object.entries(hdrs).map(([k, v]) => [k.toLowerCase(), String(v).trim()]));
  const canonicalHeaders = hNames.map((h) => `${h}:${lower[h]}\n`).join("");
  const canonicalRequest = [opts.method, canonicalUri, canonicalQuery, canonicalHeaders, hNames.join(";"), "UNSIGNED-PAYLOAD"].join("\n");
  const toSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonicalRequest)].join("\n");
  const kSigning = hm(hm(hm(hm(`AWS4${c.secret}`, date), c.region), "s3"), "aws4_request");
  const signature = createHmac("sha256", kSigning).update(toSign).digest("hex");
  return `${c.endpoint}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

async function signedFetch(method: "GET" | "PUT", key: string, body?: Uint8Array, contentType?: string) {
  // Server-side calls reuse a short-lived presigned URL so there is a single signing path.
  const url = presign({ method, key, ttlSec: 60, signedHeaders: contentType ? { "content-type": contentType } : undefined });
  return fetch(url, { method, body: body ? Buffer.from(body) : undefined, headers: contentType ? { "Content-Type": contentType } : undefined, cache: "no-store" });
}

export const s3Store: DocumentStore = {
  name: "s3",
  durable: true,
  maxBytes: uploadPolicy.maxBytesDirect,
  async signUpload(key, contentType, _size, ttlSec): Promise<SignedUrl> {
    const url = presign({ method: "PUT", key, ttlSec, signedHeaders: { "content-type": contentType } });
    return { url, method: "PUT", headers: { "Content-Type": contentType }, expiresAt: new Date(Date.now() + ttlSec * 1000).toISOString() };
  },
  async signDownload(key, ttlSec, downloadName): Promise<SignedUrl> {
    const extraQuery = downloadName ? { "response-content-disposition": `attachment; filename="${downloadName.replace(/[^\w.\- ]/g, "_")}"` } : undefined;
    return { url: presign({ method: "GET", key, ttlSec, extraQuery }), method: "GET", headers: {}, expiresAt: new Date(Date.now() + ttlSec * 1000).toISOString() };
  },
  async put(key, body, contentType) {
    const r = await signedFetch("PUT", key, body, contentType);
    if (!r.ok) throw new Error(`S3 put failed ${r.status}`);
  },
  async get(key) {
    const r = await signedFetch("GET", key);
    if (!r.ok) return null;
    return { body: new Uint8Array(await r.arrayBuffer()), contentType: r.headers.get("content-type") || "application/octet-stream" };
  },
  async remove() {
    // Retention/deletion: configure a bucket lifecycle rule (see docs/18-readiness-review.md).
    // Explicit DeleteObject needs a signed DELETE; add it when the bucket is provisioned.
  },
};
