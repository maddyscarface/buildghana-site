import { verifyDocSig } from "@/lib/readiness/secrets";
import { localStore } from "@/lib/readiness/storage/local";
import { json, noStore } from "@/lib/readiness/http";

export const runtime = "nodejs";

/**
 * Signed-URL endpoint for the LOCAL (sandbox) document adapter only. The S3/R2 adapter's signed
 * URLs point straight at the bucket and never hit this route.
 */
export async function PUT(req: Request) {
  const q = new URL(req.url).searchParams;
  const key = q.get("key") || "", exp = Number(q.get("exp")), ct = q.get("ct") || "", size = Number(q.get("size")), sig = q.get("sig") || "";
  if (!verifyDocSig("put", key, exp, sig, `${ct}\n${size}`)) return json({ ok: false, error: "Link expired or invalid" }, 403);
  if ((req.headers.get("content-type") || "").split(";")[0] !== ct) return json({ ok: false, error: "Content type mismatch" }, 415);
  const buf = new Uint8Array(await req.arrayBuffer());
  if (buf.byteLength !== size || buf.byteLength > localStore.maxBytes) return json({ ok: false, error: "Size mismatch" }, 413);
  await localStore.put(key, buf, ct);
  return json({ ok: true });
}

export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const key = q.get("key") || "", exp = Number(q.get("exp")), sig = q.get("sig") || "", name = q.get("name") || "";
  if (!verifyDocSig("get", key, exp, sig, name)) return json({ ok: false, error: "Link expired or invalid" }, 403);
  const obj = await localStore.get(key);
  if (!obj) return json({ ok: false, error: "Not found (sandbox storage is temporary)" }, 404);
  return new Response(Buffer.from(obj.body), { headers: { ...noStore, "Content-Type": obj.contentType, "Content-Disposition": `attachment; filename="${(name || key.split("/").pop() || "file").replace(/[^\w.\- ]/g, "_")}"` } });
}
