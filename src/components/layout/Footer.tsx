"use client";

import Link from "next/link";
import { disclaimers, nav, site } from "@/config/site";
import { Logo } from "@/components/ui/Icons";

export function Footer() {
  return (
    <footer className="bg-forest pb-28 pt-16 text-ivory/80 md:pb-12">
      <div className="container-x grid gap-12 md:grid-cols-12">
        <div className="md:col-span-4">
          <Logo light />
          <p className="mt-4 max-w-sm text-sm leading-relaxed">{site.description}</p>
          <Link href="/assessment" className="btn-gold mt-6 !min-h-11 !py-2.5 text-sm">Request a Project Assessment</Link>
        </div>
        <div className="md:col-span-4">
          <p className="eyebrow-dark">Services</p>
          <ul className="mt-3 space-y-2 text-sm">
            {nav.services.map((s) => <li key={s.href}><Link className="hover:text-gold" href={s.href}>{s.label}</Link></li>)}
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="eyebrow-dark">Company</p>
          <ul className="mt-3 space-y-2 text-sm">
            {[...nav.main, { href: "/book-consultation", label: "Book a Consultation" }].map((l) => (
              <li key={l.href}><Link className="hover:text-gold" href={l.href}>{l.label}</Link></li>
            ))}
          </ul>
        </div>
        <div className="md:col-span-2">
          <p className="eyebrow-dark">Legal</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li><Link className="hover:text-gold" href="/privacy">Privacy</Link></li>
            <li><Link className="hover:text-gold" href="/terms">Terms</Link></li>
            <li><button className="hover:text-gold" onClick={() => window.dispatchEvent(new Event("bga:open-consent"))}>Cookie settings</button></li>
          </ul>
        </div>
      </div>
      <div className="container-x mt-12 border-t border-ivory/10 pt-6 text-xs leading-relaxed text-ivory/55">
        <p>{disclaimers.licensing}</p>
        <p className="mt-2">© {new Date().getFullYear()} {site.name}. All rights reserved.</p>
      </div>
    </footer>
  );
}
