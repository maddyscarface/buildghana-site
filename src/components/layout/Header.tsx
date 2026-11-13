"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { nav } from "@/config/site";
import { Icon, Logo } from "@/components/ui/Icons";

export function Header({ minimal = false }: { minimal?: boolean }) {
  const [open, setOpen] = useState(false);
  const [svcOpen, setSvcOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 24);
    on(); window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  const overHero = pathname === "/" && !scrolled && !open;
  useEffect(() => { setOpen(false); setSvcOpen(false); }, [pathname]);
  useEffect(() => { document.body.style.overflow = open ? "hidden" : ""; }, [open]);

  return (
    <header className={`sticky top-0 z-40 text-ivory transition-[background-color,border-color,backdrop-filter] duration-500 ${overHero ? "border-b border-transparent bg-transparent" : "border-b border-ivory/10 bg-forest/95 backdrop-blur-md"}`}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:rounded focus:bg-gold focus:px-3 focus:py-2 focus:text-forest">Skip to content</a>
      <div className="container-x flex h-[72px] items-center justify-between gap-6">
        <Link href="/" aria-label="BuildGhana Abroad home"><Logo light /></Link>

        {!minimal && (
          <nav aria-label="Primary" className="hidden items-center gap-7 text-[14.5px] font-medium lg:flex">
            <div className="relative" onMouseLeave={() => setSvcOpen(false)}>
              <button className="flex items-center gap-1 hover:text-gold" aria-expanded={svcOpen} aria-haspopup="true"
                onClick={() => setSvcOpen((v) => !v)} onMouseEnter={() => setSvcOpen(true)}>
                Services <span aria-hidden className="text-gold">▾</span>
              </button>
              {svcOpen && (
                <div className="absolute left-0 top-full pt-3">
                  <ul className="w-80 rounded-2xl border border-line bg-ivory p-2 text-ink shadow-2xl">
                    {nav.services.map((s) => (
                      <li key={s.href}><Link href={s.href} className="block rounded-xl px-4 py-2.5 text-sm hover:bg-ivory-2">{s.label}</Link></li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            {nav.main.map((l) => (
              <Link key={l.href} href={l.href} className={`transition-colors hover:text-gold ${pathname === l.href || pathname.startsWith(l.href + "/") ? "text-gold" : ""}`}>{l.label}</Link>
            ))}
          </nav>
        )}

        <div className="flex items-center gap-3">
          <Link href="/assessment" className="btn-gold hidden !min-h-11 !py-2.5 text-sm lg:inline-flex">Request an Assessment</Link>
          {!minimal && (
            <button className="grid h-11 w-11 place-items-center rounded-full lg:hidden" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <Icon name={open ? "close" : "menu"} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="fixed inset-x-0 bottom-0 top-[72px] overflow-y-auto bg-forest px-5 pb-28 pt-4 lg:hidden">
          <p className="eyebrow-dark mt-2">Services</p>
          <ul className="mt-2 divide-y divide-ivory/10">
            {nav.services.map((s) => <li key={s.href}><Link href={s.href} className="block py-3.5 text-[17px]">{s.label}</Link></li>)}
          </ul>
          <p className="eyebrow-dark mt-6">Company</p>
          <ul className="mt-2 divide-y divide-ivory/10">
            {nav.main.map((l) => <li key={l.href}><Link href={l.href} className="block py-3.5 text-[17px]">{l.label}</Link></li>)}
            <li><Link href="/projects" className="block py-3.5 text-[17px]">Projects</Link></li>
            <li><Link href="/book-consultation" className="block py-3.5 text-[17px]">Book a Consultation</Link></li>
          </ul>
          <Link href="/assessment" className="btn-gold mt-8 w-full">Request a Project Assessment</Link>
        </div>
      )}
    </header>
  );
}
