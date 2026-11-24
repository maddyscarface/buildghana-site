"use client";

import { useEffect, useState } from "react";

/** Page-level confirmation that survives the form unmounting after router.refresh() (e.g. a decided item). */
export function flash(text: string, ok = true) { window.dispatchEvent(new CustomEvent("tp-flash", { detail: { text, ok } })); }

export function FlashHost() {
  const [m, setM] = useState<{ text: string; ok: boolean } | null>(null);
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const on = (e: Event) => { setM((e as CustomEvent).detail); clearTimeout(t); t = setTimeout(() => setM(null), 7000); };
    window.addEventListener("tp-flash", on);
    return () => { window.removeEventListener("tp-flash", on); clearTimeout(t); };
  }, []);
  return (
    <div role="status" aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-4 z-50 flex justify-center px-4">
      {m && <p data-flash className={`pointer-events-auto max-w-md rounded-full px-5 py-3 text-sm font-semibold shadow-lg ${m.ok ? "bg-forest text-ivory" : "bg-[#8a2f1d] text-white"}`}>{m.text}</p>}
    </div>
  );
}
