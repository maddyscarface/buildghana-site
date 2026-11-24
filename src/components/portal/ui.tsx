import Link from "next/link";
import { FlashHost } from "./FlashHost";
import type { ReactNode } from "react";
import { evidenceLabel } from "@/lib/transparency/states";
import type { EvidenceState } from "@/lib/transparency/types";
import { Logo } from "@/components/ui/Icons";

export function fmtDate(iso: string | null | undefined, tz = "Africa/Accra", withTime = true) {
  if (!iso) return "Not provided";
  const d = new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso);
  return new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "numeric", month: "short", year: "numeric", ...(withTime && iso.length > 10 ? { hour: "2-digit", minute: "2-digit", timeZoneName: "short" } : {}) }).format(d);
}

export function DemoBanner({ compact = false }: { compact?: boolean }) {
  return (
    <div role="note" className="bg-gold text-forest">
      <p className={`mx-auto max-w-7xl px-4 ${compact ? "py-1.5 text-[12.5px]" : "py-2 text-[13px]"} font-semibold sm:px-8`}>
        Synthetic demo — illustrative information only. No real client, site, inspector, contractor, payment or photograph. Data is in-memory and resets.
      </p>
    </div>
  );
}

const evidenceTone: Record<EvidenceState, string> = {
  reported: "bg-[#efe8da] text-[#5b4a2c] ring-[#c9b48a]",
  reviewed: "bg-[#e5efe8] text-[#1f4a33] ring-[#9dbfa9]",
  verified: "bg-forest text-gold ring-forest",
  disputed: "bg-[#f7e4df] text-[#8a2f1d] ring-[#d9a093]",
};

export function EvidenceBadge({ state }: { state: EvidenceState | null }) {
  if (!state) return null;
  return <span title={evidenceLabel[state].explain} className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${evidenceTone[state]}`}>{evidenceLabel[state].label}</span>;
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "warn" | "good" | "bad" | "dark" }) {
  const t = { neutral: "bg-ivory-2 text-forest ring-line", warn: "bg-[#fbefd9] text-[#6b4a12] ring-[#e2c38a]", good: "bg-[#e5efe8] text-[#1f4a33] ring-[#9dbfa9]", bad: "bg-[#f7e4df] text-[#8a2f1d] ring-[#d9a093]", dark: "bg-forest text-ivory ring-forest" }[tone];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${t}`}>{children}</span>;
}

export function Card({ title, children, action, className = "" }: { title?: ReactNode; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`min-w-0 rounded-[18px] border border-line bg-white p-5 shadow-[0_1px_0_rgba(18,41,31,0.04)] sm:p-6 ${className}`}>
      {(title || action) && <div className="mb-4 flex flex-wrap items-center justify-between gap-3">{title && <h2 className="font-display text-[1.35rem] leading-tight text-forest">{title}</h2>}{action}</div>}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-dashed border-line bg-ivory px-4 py-5 text-sm text-muted">{children}</p>;
}

export type NavItem = { href: string; label: string; active?: boolean };

/** Private header: no marketing nav, no tracking, plain <a> to public pages (full page load). */
export function PortalHeader({ userName, roleLabel, area, nav }: { userName: string; roleLabel?: string; area: string; nav?: NavItem[] }) {
  return (
    <header className="bg-forest text-ivory">
      <DemoBanner compact />
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <a href="/" aria-label="BuildGhana Abroad home" className="shrink-0"><Logo light /></a>
          <span className="hidden text-xs font-semibold uppercase tracking-[0.18em] text-gold sm:inline">{area}</span>
        </div>
        <div className="flex min-w-0 items-center gap-3 text-sm">
          <span className="min-w-0 truncate text-ivory/85"><span className="font-semibold text-ivory">{userName}</span>{roleLabel ? ` · ${roleLabel}` : ""}</span>
          <form action="/portal/logout" method="post"><button className="min-h-11 rounded-full border border-ivory/30 px-4 text-ivory hover:bg-ivory/10">Sign out</button></form>
        </div>
      </div>
      {nav && nav.length > 0 && (
        <nav aria-label="Section" className="border-t border-ivory/10">
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-2 sm:px-6">
            {nav.map((n) => (
              <li key={n.href} className="shrink-0">
                <Link href={n.href} aria-current={n.active ? "page" : undefined} className={`inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-semibold ${n.active ? "border-gold text-ivory" : "border-transparent text-ivory/75 hover:text-ivory"}`}>{n.label}</Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
      <FlashHost />
    </header>
  );
}

export function PageTitle({ eyebrow, title, children }: { eyebrow?: string; title: string; children?: ReactNode }) {
  return (
    <div className="mb-6">
      {eyebrow && <p className="eyebrow">{eyebrow}</p>}
      <h1 className="mt-2 font-display text-[2rem] leading-tight text-forest sm:text-[2.4rem]">{title}</h1>
      {children && <div className="mt-2 max-w-3xl text-[15px] leading-relaxed text-muted">{children}</div>}
    </div>
  );
}
