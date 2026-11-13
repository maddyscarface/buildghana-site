"use client";

import Link from "next/link";
import { useEffect } from "react";
import { track } from "@/lib/client/analytics";

/**
 * Embeds the GoHighLevel calendar widget.
 * Conversion: configure the GHL calendar's confirmation redirect to
 *   {SITE_URL}/thank-you?type=booking&appt={{appointment.id}}
 * The thank-you page fires `schedule` once per appointment id. The server-side Meta "Schedule"
 * event comes from the GHL workflow → /api/crm-webhook (same id basis → dedup).
 */
export function BookingFrame({ url }: { url: string }) {
  useEffect(() => {
    // Some GHL widget versions postMessage on booking; record a non-conversion signal only.
    const onMsg = (e: MessageEvent) => {
      if (typeof e.data === "string" && /booking|appointment/i.test(e.data) && /leadconnector|msgsndr|gohighlevel/i.test(e.origin)) {
        track("cta_click", { location: "booking_widget", detail: "widget_message" });
      }
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  if (!url) {
    return (
      <div className="flex min-h-[520px] min-w-0 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-forest/25 bg-white p-5 text-center sm:p-8">
        <p className="font-display text-2xl text-forest">Booking calendar not connected yet</p>
        <p className="mt-3 max-w-md text-muted">Set <code className="rounded bg-ivory-2 px-1.5 break-all">NEXT_PUBLIC_GHL_BOOKING_URL</code> to your GoHighLevel calendar widget URL to show live availability here.</p>
        <Link href="/assessment" className="btn-forest mt-6">Request an assessment instead</Link>
      </div>
    );
  }
  return (
    <div className="min-w-0 overflow-hidden rounded-[1.5rem] border border-line bg-white shadow-xl">
      <iframe src={url} title="Book a discovery call" className="h-[760px] w-full border-0" loading="lazy" />
    </div>
  );
}
