export type SignedUrl = { url: string; method: "PUT" | "GET"; headers: Record<string, string>; expiresAt: string };

/**
 * Private document storage. Objects are never public; every read and write goes through a
 * short-lived signed URL. Keys are opaque: cases/<caseId>/<docId>.<ext> (no client filenames).
 */
export interface DocumentStore {
  readonly name: "local" | "s3";
  readonly durable: boolean;
  readonly maxBytes: number;
  signUpload(key: string, contentType: string, size: number, ttlSec: number): Promise<SignedUrl>;
  signDownload(key: string, ttlSec: number, downloadName?: string): Promise<SignedUrl>;
  /** Server-side write (used by the local adapter's upload endpoint and for generated reports). */
  put(key: string, body: Uint8Array, contentType: string): Promise<void>;
  get(key: string): Promise<{ body: Uint8Array; contentType: string } | null>;
  remove(key: string): Promise<void>;
}
