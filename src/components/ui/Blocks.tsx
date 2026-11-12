import Link from "next/link";
import type { Claim } from "@/config/site";
import type { Faq } from "@/content/services";
import { Icon } from "./Icons";
import { Photo } from "@/components/media/Photo";

export function SectionHead({ eyebrow, title, body, dark = false, center = false }: { eyebrow?: string; title: string; body?: string; dark?: boolean; center?: boolean }) {
  return (
    <div className={`max-w-3xl ${center ? "mx-auto text-center" : ""}`}>
      {eyebrow && <p className={dark ? "eyebrow-dark" : "eyebrow"}>{eyebrow}</p>}
      <h2 className={`mt-3 font-display text-[2.1rem] leading-[1.08] tracking-[-0.015em] sm:text-[2.8rem] ${dark ? "text-ivory" : "text-forest"}`}>{title}</h2>
      {body && <p className={`mt-4 text-[17px] leading-relaxed ${dark ? "text-ivory/75" : "text-muted"}`}>{body}</p>}
    </div>
  );
}

export function CheckList({ items, dark = false }: { items: string[]; dark?: boolean }) {
  return (
    <ul className="space-y-3">
      {items.map((i) => (
        <li key={i} className="flex gap-3">
          <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full ${dark ? "bg-gold/15 text-gold" : "bg-forest text-gold"}`}>
            <Icon name="check" className="h-3.5 w-3.5" />
          </span>
          <span className={dark ? "text-ivory/85" : "text-ink/85"}>{i}</span>
        </li>
      ))}
    </ul>
  );
}

export function FaqList({ faqs }: { faqs: Faq[] }) {
  return (
    <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white">
      {faqs.map((f) => (
        <details key={f.q} className="group px-5 py-5 sm:px-7">
          <summary className="flex cursor-pointer list-none items-start justify-between gap-6 text-[17px] font-semibold text-forest">
            {f.q}
            <span aria-hidden className="mt-1 text-gold-2 transition-transform group-open:rotate-45">＋</span>
          </summary>
          <p className="mt-3 leading-relaxed text-ink/80">{f.a}</p>
        </details>
      ))}
    </div>
  );
}

export function CtaBand({ heading, body, label = "Request a Project Assessment", href = "/assessment", secondary }: {
  heading: string; body: string; label?: string; href?: string; secondary?: { label: string; href: string };
}) {
  return (
    <section className="relative isolate overflow-hidden bg-forest py-24 text-ivory sm:py-28">
      <Photo name="accra_skyline" className="photo-shade absolute inset-0 -z-10 h-full w-full" sizes="100vw" labelPosition="br" />
      <div className="container-x relative grid items-center gap-8 lg:grid-cols-[1.25fr_1fr]">
        <div>
          <h2 className="font-display text-[2.2rem] leading-[1.08] sm:text-[3rem]">{heading}</h2>
          <p className="mt-4 max-w-xl text-[17px] text-ivory/80">{body}</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row lg:justify-end">
          <Link href={href} className="btn-gold whitespace-nowrap">{label} <Icon name="arrow" className="h-4 w-4" /></Link>
          {secondary && <Link href={secondary.href} className="btn-ghost-light whitespace-nowrap backdrop-blur-sm">{secondary.label}</Link>}
        </div>
      </div>
    </section>
  );
}

/** Visible marker for claims that must be confirmed before launch. Never renders as a real claim. */
export function ClaimRow({ claim }: { claim: Claim }) {
  return (
    <li className={`rounded-xl px-4 py-3 ${claim.verified ? "bg-white" : "border border-dashed border-gold-2/70 bg-gold/10"}`}>
      <p className="text-sm font-semibold text-forest">{claim.label}</p>
      <p className="text-sm text-muted">{claim.verified ? claim.value : `${claim.value} — to confirm before launch`}</p>
    </li>
  );
}

export function Placeholder({ label, className = "" }: { label: string; className?: string }) {
  return (
    <div className={`flex items-center justify-center rounded-[var(--radius-card)] border border-dashed border-forest/25 bg-[repeating-linear-gradient(135deg,#efe8da_0_12px,#f7f3eb_12px_24px)] p-6 text-center text-sm font-medium text-muted ${className}`}>
      {label}
    </div>
  );
}

export function JsonLd({ data }: { data: object }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export function Breadcrumbs({ items }: { items: { name: string; href: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-ivory/60">
      <ol className="flex flex-wrap gap-2">
        {items.map((i, idx) => (
          <li key={i.href} className="flex gap-2">
            {idx > 0 && <span aria-hidden>/</span>}
            {idx === items.length - 1 ? <span aria-current="page" className="text-ivory/85">{i.name}</span> : <Link href={i.href} className="hover:text-gold">{i.name}</Link>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
