"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { updateConsent } from "@/lib/client/analytics";

const KEY = "bga_consent";

export function ConsentBanner() {
  const [open, setOpen] = useState(false);
  const [custom, setCustom] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [ads, setAds] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    try { if (!localStorage.getItem(KEY)) setOpen(true); } catch { setOpen(true); }
    const reopen = () => setOpen(true);
    window.addEventListener("bga:open-consent", reopen);
    return () => window.removeEventListener("bga:open-consent", reopen);
  }, []);

  const save = (c: { analytics: boolean; ads: boolean }) => {
    try { localStorage.setItem(KEY, JSON.stringify({ ...c, at: new Date().toISOString() })); } catch {}
    updateConsent(c);
    setOpen(false);
  };

  if (!open || pathname?.startsWith("/admin")) return null;
  return (
    <div role="dialog" aria-modal="false" aria-labelledby="consent-title"
      className="fixed inset-x-3 bottom-24 z-50 mx-auto w-auto max-w-[min(36rem,calc(100vw-1.5rem))] rounded-2xl border border-line bg-white p-5 shadow-2xl md:bottom-6">
      <p id="consent-title" className="font-semibold text-forest">Your privacy choices</p>
      <p className="mt-1.5 text-sm text-muted">
        We use cookies to measure site performance and, with your permission, to measure and improve our advertising.
        See our <Link href="/privacy" className="underline">privacy policy</Link>.
      </p>
      {custom && (
        <div className="mt-3 space-y-2 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked disabled /> Strictly necessary (always on)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={analytics} onChange={(e) => setAnalytics(e.target.checked)} /> Analytics</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={ads} onChange={(e) => setAds(e.target.checked)} /> Advertising measurement</label>
        </div>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <button className="btn-forest !min-h-11 !px-5 !py-2 text-sm" onClick={() => save({ analytics: true, ads: true })}>Accept all</button>
        <button className="btn-ghost-dark !min-h-11 !px-5 !py-2 text-sm" onClick={() => save({ analytics: false, ads: false })}>Reject non-essential</button>
        {custom
          ? <button className="btn-ghost-dark !min-h-11 !px-5 !py-2 text-sm" onClick={() => save({ analytics, ads })}>Save choices</button>
          : <button className="text-sm font-semibold text-forest underline" onClick={() => setCustom(true)}>Customise</button>}
      </div>
    </div>
  );
}
