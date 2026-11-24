import Link from "next/link";
import { pageGraph, pageMeta } from "@/lib/seo";
import { FaqList, JsonLd, SectionHead } from "@/components/ui/Blocks";
import { Icon } from "@/components/ui/Icons";
import { tpFaqs, tpLimits, tpSections, tpSteps } from "@/content/transparency";

const title = "Construction Progress Updates You Can Verify";
const description = "How BuildGhana documents Ghana construction progress: dated site reports, office review, recorded inspections and a private owner portal — with clear limits on what photos prove.";
const path = "/project-transparency";
const crumbs = [{ name: "Home", href: "/" }, { name: "Project transparency", href: path }];
const oversight = "/assessment?service=owners_rep";

export const metadata = pageMeta({ title, description, path });

const states = [
  { k: "Reported", d: "Filed by the field team", c: "bg-ivory-2 text-forest" },
  { k: "Office reviewed", d: "Checked by a reviewer who didn't write it", c: "bg-[#e9eef3] text-[#1d3a52]" },
  { k: "Inspected", d: "Covered by a recorded inspection", c: "bg-[#e5efe8] text-[#173a28]" },
  { k: "Disputed", d: "Questioned — kept on record", c: "bg-[#f7e4df] text-[#5a1f13]" },
];

/** Illustrative portal preview — HTML mock with synthetic figures, never a real client screen or site photo. */
function PortalPreview() {
  return (
    <figure className="min-w-0">
      <div className="overflow-hidden rounded-[22px] border border-ivory/15 bg-ivory text-ink shadow-2xl">
        <div className="flex items-center justify-between gap-2 bg-forest px-4 py-2 text-[11px] text-ivory"><span className="font-semibold uppercase tracking-[0.16em] text-gold">Owner portal</span><span className="rounded-full bg-gold/20 px-2 py-0.5 text-gold">Synthetic demo</span></div>
        <div className="space-y-3 p-4 text-[13px]">
          <div className="flex flex-wrap items-baseline justify-between gap-1"><p className="font-display text-lg text-forest">Demo Accra Villa</p><p className="text-muted">Phase 3 of 6 · Blockwork</p></div>
          <div className="grid grid-cols-3 gap-2">
            {[["Last site report", "2 days ago"], ["Last office review", "3 days ago"], ["Last inspection", "Pre-pour · passed"]].map(([a, b]) => <div key={a} className="rounded-lg bg-white p-2"><p className="text-[10px] uppercase tracking-wider text-muted">{a}</p><p className="font-semibold text-forest">{b}</p></div>)}
          </div>
          <div className="rounded-lg bg-white p-3">
            <p className="text-[10px] uppercase tracking-wider text-muted">Schedule — baseline vs forecast</p>
            {[["Foundations", 100, 100], ["Blockwork", 62, 78], ["Roof", 40, 52]].map(([n, b, f]) => (
              <div key={n} className="mt-2"><p className="text-[11px]">{n}</p><div className="relative h-2 rounded bg-ivory-2"><div className="absolute inset-y-0 left-0 rounded bg-forest/30" style={{ width: `${b}%` }} /><div className="absolute inset-y-0 left-0 rounded border-r-2 border-gold-2" style={{ width: `${f}%` }} /></div></div>
            ))}
            <p className="mt-2 text-[11px] text-[#8a2f1d]">Blockwork forecast +21 days · reason recorded</p>
          </div>
          <div className="flex flex-wrap gap-1.5">{states.map((s) => <span key={s.k} className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${s.c}`}>{s.k}</span>)}</div>
          <div className="rounded-lg border border-gold-2/40 bg-gold/10 p-2 text-[12px]"><strong className="text-forest">Decision needed:</strong> change order CO-002 — owner approval requested</div>
        </div>
      </div>
      <figcaption className="mt-3 text-xs text-ivory/70">Illustrative preview using a synthetic demo project. Not a real client, site or budget.</figcaption>
    </figure>
  );
}

export default function ProjectTransparency() {
  return (
    <>
      <JsonLd data={pageGraph({ path, title, description, crumbs, faqs: tpFaqs, service: { name: "Construction progress reporting and owner portal", description: "Dated site reports, office review, recorded inspections and a private owner portal for Ghana construction projects.", serviceType: "Construction oversight reporting", audience: "Property owners in Ghana and abroad" } })} />
      <section className="relative isolate overflow-hidden bg-forest text-ivory">
        <div className="container-x grid gap-12 pb-16 pt-24 sm:pb-20 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div className="min-w-0">
            <p className="kicker text-gold"><span className="hairline" />Project transparency</p>
            <h1 className="mt-4 font-display text-[2.5rem] leading-[1.05] sm:text-[3.6rem]">Construction progress updates you can actually verify</h1>
            <p className="mt-5 max-w-xl text-[17px] leading-relaxed text-ivory/85">Dated site reports, reviewed photo and video evidence, recorded inspections and a private owner portal — so you aren&apos;t relying on scattered messages or promises alone. Every update says plainly whether it was reported, reviewed or inspected.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a href="#how-it-works" className="btn-gold text-center">See How Project Transparency Works <Icon name="arrow" className="h-4 w-4" /></a>
              <Link href={oversight} className="btn-ghost-light text-center">Request Construction Oversight</Link>
            </div>
            <p className="mt-5 text-sm text-ivory/75">Already a client? <Link href="/portal/login" className="font-semibold text-gold underline-offset-2 hover:underline">Client Portal</Link> · Not ready to build yet? <Link href="/ghana-build-readiness-review" className="font-semibold text-gold underline-offset-2 hover:underline">Start a Build Readiness Review</Link></p>
          </div>
          <PortalPreview />
        </div>
      </section>

      <section className="border-b border-line bg-ivory-2 py-6"><p className="container-x text-center text-[15px] font-medium text-forest">Photos show what was reported. Qualified reviews establish what was checked. You stay informed at every milestone.</p></section>

      <section id="how-it-works" aria-labelledby="how-title" className="scroll-mt-24 py-20 sm:py-24">
        <div className="container-x">
          <SectionHead eyebrow="How it works" title="Four steps between the site and your screen" body="Each step is done by a named person and recorded. Nothing reaches you until it has been reviewed." />
          <ol className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {tpSteps.map((s, i) => (
              <li key={s.title} className="card min-w-0 p-6">
                <div className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-full bg-forest text-gold"><Icon name={s.icon} className="h-5 w-5" /></span><span className="text-sm font-semibold text-gold-2">Step {i + 1}</span></div>
                <h2 id={i === 0 ? "how-title" : undefined} className="mt-4 font-display text-[1.4rem] leading-snug text-forest">{s.title}</h2>
                <p className="mt-2 text-[15px] leading-relaxed text-ink/80">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="states-title" className="bg-ivory-2 py-20 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-start">
          <SectionHead eyebrow="Evidence states" title="Every update tells you how far it has been checked" />
          <ul id="states-title" className="grid gap-3 sm:grid-cols-2">{states.map((s) => <li key={s.k} className={`rounded-[18px] p-5 ${s.c}`}><p className="font-display text-xl">{s.k}</p><p className="mt-1 text-sm opacity-85">{s.d}</p></li>)}</ul>
        </div>
      </section>

      <section className="py-20 sm:py-24">
        <div className="container-x grid gap-6 lg:grid-cols-3">
          {tpSections.map((s) => <div key={s.title} className="card min-w-0 p-7"><h2 className="font-display text-[1.45rem] leading-snug text-forest">{s.title}</h2><p className="mt-3 text-[15px] leading-relaxed text-ink/80">{s.body}</p></div>)}
        </div>
      </section>

      <section aria-labelledby="limits-title" className="bg-forest py-20 text-ivory sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <SectionHead dark eyebrow="Limits" title="What photographs — and this portal — do not prove" />
          <ul id="limits-title" className="space-y-3">{tpLimits.map((l) => <li key={l} className="flex gap-3 text-[16px] leading-relaxed text-ivory/85"><Icon name="check" className="mt-1 h-5 w-5 shrink-0 text-gold" />{l}</li>)}</ul>
        </div>
      </section>

      <section aria-labelledby="tp-faq" className="py-20 sm:py-24">
        <div className="container-x grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <SectionHead eyebrow="Questions" title="Straight answers" />
            <p className="mt-6 text-sm leading-relaxed text-muted">The client portal is being piloted. The preview on this page uses a wholly synthetic demo project; features available on your project depend on your signed service agreement.</p>
          </div>
          <div id="tp-faq"><FaqList faqs={tpFaqs} /></div>
        </div>
      </section>

      <section className="bg-ivory-2 py-20 sm:py-24">
        <div className="container-x flex flex-col items-start gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl"><h2 className="font-display text-[2.1rem] leading-tight text-forest sm:text-[2.6rem]">Request a project oversight consultation</h2><p className="mt-3 text-[17px] text-ink/80">Tell us where the project is and what stage it&apos;s at. We&apos;ll explain what reporting and review would look like for it — before you commit to anything.</p></div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link href={oversight} className="btn-gold text-center">Request Construction Oversight <Icon name="arrow" className="h-4 w-4" /></Link>
            <Link href="/ghana-build-readiness-review" className="btn-ghost-dark text-center">Start a Build Readiness Review</Link>
          </div>
        </div>
      </section>
    </>
  );
}
