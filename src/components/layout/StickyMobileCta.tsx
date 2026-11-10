"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { site } from "@/config/site";
import { track } from "@/lib/client/analytics";
import { Icon } from "@/components/ui/Icons";

const HIDE_ON = ["/assessment", "/book-consultation", "/thank-you"];

export function StickyMobileCta() {
  const pathname = usePathname();
  if (HIDE_ON.some((p) => pathname.startsWith(p))) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-ivory/10 bg-forest/97 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 md:hidden">
      <div className="flex gap-2.5">
        <Link href="/assessment" className="btn-gold flex-1 !min-h-12 text-[15px]"
          onClick={() => track("cta_click", { location: "sticky_mobile", cta: "assessment" })}>
          Request an Assessment
        </Link>
        {site.whatsapp && (
          <a href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hello, I'd like to discuss a construction project in Ghana.")}`}
            target="_blank" rel="noopener" aria-label="Message us on WhatsApp"
            className="btn-ghost-light !min-h-12 !px-4"
            onClick={() => track("whatsapp_click", { location: "sticky_mobile" })}>
            <Icon name="whatsapp" className="h-5 w-5" />
          </a>
        )}
      </div>
    </div>
  );
}

export function WhatsAppFloat() {
  if (!site.whatsapp) return null;
  return (
    <a href={`https://wa.me/${site.whatsapp}?text=${encodeURIComponent("Hello, I'd like to discuss a construction project in Ghana.")}`}
      target="_blank" rel="noopener" aria-label="Message us on WhatsApp"
      onClick={() => track("whatsapp_click", { location: "float" })}
      className="fixed bottom-6 right-6 z-30 hidden h-14 w-14 items-center justify-center rounded-full bg-forest text-gold shadow-xl ring-1 ring-gold/40 hover:bg-forest-2 md:flex">
      <Icon name="whatsapp" className="h-6 w-6" />
    </a>
  );
}
