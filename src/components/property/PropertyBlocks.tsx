import Link from "next/link";
import type { ReactNode } from "react";
import { Photo } from "@/components/media/Photo";
import { Breadcrumbs } from "@/components/ui/Blocks";
import { Icon } from "@/components/ui/Icons";
import type { StockKey } from "@/content/images";
import { propertyPrinciples } from "@/content/property";

export function PropertyHero({ image, crumbs, kicker, title, lede, children }: {
  image: StockKey; crumbs: { name: string; href: string }[]; kicker: string; title: ReactNode; lede: ReactNode; children?: ReactNode;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-forest text-ivory">
      <Photo name={image} priority sizes="100vw" className="photo-shade absolute inset-0 -z-10 h-full w-full" />
      <div className="container-x pb-16 pt-10 sm:pb-24">
        <Breadcrumbs items={crumbs} />
        <div className="mt-12 max-w-3xl sm:mt-16">
          <p className="kicker text-gold"><span className="hairline" />{kicker}</p>
          <h1 className="display-lg mt-5">{title}</h1>
          <div className="lede mt-6 max-w-2xl text-ivory/85">{lede}</div>
          {children && <div className="mt-8 flex flex-col flex-wrap gap-3 sm:flex-row">{children}</div>}
        </div>
      </div>
    </section>
  );
}

export function Principles({ dark = false }: { dark?: boolean }) {
  return (
    <ul className={`grid gap-px overflow-hidden rounded-[22px] border sm:grid-cols-2 ${dark ? "border-ivory/15 bg-ivory/15" : "border-line bg-line"}`}>
      {propertyPrinciples.map((p) => (
        <li key={p.title} className={dark ? "bg-forest p-7" : "bg-ivory p-7"}>
          <Icon name="shield" className={`h-5 w-5 ${dark ? "text-gold" : "text-gold-2"}`} />
          <h3 className={`mt-4 font-display text-[1.35rem] leading-snug ${dark ? "text-ivory" : "text-forest"}`}>{p.title}</h3>
          <p className={`mt-2 text-[15px] leading-relaxed ${dark ? "text-ivory/75" : "text-muted"}`}>{p.body}</p>
        </li>
      ))}
    </ul>
  );
}

export function Steps({ steps }: { steps: { n: string; title: string; body: string }[] }) {
  return (
    <ol className="relative border-l border-line pl-8 sm:pl-10">
      {steps.map((s) => (
        <li key={s.n} className="relative pb-10 last:pb-0">
          <span className="absolute -left-[49px] top-0 flex h-9 w-9 items-center justify-center rounded-full bg-forest font-display text-sm text-gold sm:-left-[57px]">{s.n}</span>
          <h3 className="font-display text-[1.45rem] leading-tight text-forest">{s.title}</h3>
          <p className="mt-2 max-w-xl text-[15.5px] leading-relaxed text-muted">{s.body}</p>
        </li>
      ))}
    </ol>
  );
}

export function ReviewCrossSell() {
  return (
    <aside className="rounded-[22px] border border-gold/40 bg-gold/10 p-6 sm:p-7">
      <p className="font-semibold text-forest">Planning to build on the land?</p>
      <p className="mt-2 text-[15px] leading-relaxed text-ink/80">The paid Ghana Build Readiness Review is separate from any property inquiry and never bundled automatically. It covers a documented site visit, permits, a GHS/USD cost range and an optional counsel-led title check.</p>
      <Link href="/ghana-build-readiness-review" className="mt-4 inline-flex min-h-11 items-center gap-2 text-[15px] font-semibold text-forest hover:text-gold-2">About the Readiness Review <Icon name="arrow" className="h-4 w-4" /></Link>
    </aside>
  );
}
