"use client";

import { useState } from "react";
import { track } from "@/lib/client/analytics";

type Item = { name: string; state: "uploading" | "done" | "error"; msg?: string };

/** Private uploads after a seller inquiry: signed URL → PUT → server confirm (magic-byte check + optional scan). */
export function PropertyUploads({ id, token }: { id: string; token: string }) {
  const [items, setItems] = useState<Item[]>([]);
  const upload = async (files: FileList | null, category: "media" | "document") => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const key = `${file.name}-${Date.now()}`;
      setItems((x) => [...x, { name: file.name, state: "uploading" }]);
      const fail = (msg: string) => setItems((x) => x.map((i) => (i.name === file.name && i.state === "uploading" ? { ...i, state: "error", msg } : i)));
      try {
        const r = await fetch(`/api/property/${id}/uploads`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, category, filename: file.name, content_type: file.type || "application/octet-stream", size: file.size }) });
        const j = await r.json();
        if (!r.ok || !j.ok) { fail(j.error || "Upload refused"); continue; }
        const put = await fetch(j.upload.url, { method: "PUT", headers: j.upload.headers, body: file });
        if (!put.ok) { fail("Upload failed"); continue; }
        const c = await fetch(`/api/property/${id}/uploads/${j.assetId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
        const cj = await c.json().catch(() => ({}));
        if (!c.ok || !cj.ok) { fail(cj.error || "Verification failed"); continue; }
        setItems((x) => x.map((i) => (i.name === file.name && i.state === "uploading" ? { ...i, state: "done" } : i)));
        track("document_upload", { form_id: "property-seller", category }); // no filename, no content
      } catch { fail("Network error"); }
      void key;
    }
  };
  return (
    <div className="mt-6 grid gap-4 sm:grid-cols-2">
      <label className="flex min-h-28 cursor-pointer flex-col justify-center rounded-2xl border border-dashed border-forest/30 bg-ivory-2/40 p-5 text-center hover:border-forest/60">
        <span className="font-semibold text-forest">Add photos or a short video</span>
        <span className="mt-1 text-[13px] text-muted">JPG, PNG, HEIC, MP4 or MOV</span>
        <input type="file" className="sr-only" multiple accept="image/jpeg,image/png,image/webp,image/heic,image/heif,video/mp4,video/quicktime" onChange={(e) => upload(e.target.files, "media")} />
      </label>
      <label className="flex min-h-28 cursor-pointer flex-col justify-center rounded-2xl border border-dashed border-forest/30 bg-ivory-2/40 p-5 text-center hover:border-forest/60">
        <span className="font-semibold text-forest">Add documents (private)</span>
        <span className="mt-1 text-[13px] text-muted">Indenture, site plan, search report — PDF or photo. Please don't upload ID cards.</span>
        <input type="file" className="sr-only" multiple accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={(e) => upload(e.target.files, "document")} />
      </label>
      {items.length > 0 && (
        <ul className="space-y-1.5 text-sm sm:col-span-2" aria-live="polite">
          {items.map((i, n) => (
            <li key={n} className="flex justify-between gap-3 rounded-lg bg-ivory-2/50 px-3 py-2">
              <span className="truncate">{i.name}</span>
              <span className={i.state === "error" ? "text-[#a2402b]" : i.state === "done" ? "text-forest" : "text-muted"}>{i.state === "done" ? "Uploaded privately" : i.state === "error" ? i.msg : "Uploading…"}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
