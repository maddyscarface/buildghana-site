import Link from "next/link";
import { notFound } from "next/navigation";
import { articleBySlug, articles } from "@/content/articles";
import { serviceBySlug } from "@/content/services";
import { disclaimers, site } from "@/config/site";
import { pageMeta, breadcrumbJsonLd } from "@/lib/seo";
import { Breadcrumbs, CtaBand, JsonLd } from "@/components/ui/Blocks";
import { Icon } from "@/components/ui/Icons";

export const dynamicParams = false;
export const generateStaticParams = () => articles.map((a) => ({ slug: a.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleBySlug((await params).slug);
  if (!a) return {};
  return pageMeta({ title: `${a.title} | ${site.name}`, description: a.metaDescription, path: `/resources/${a.slug}` });
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const a = articleBySlug((await params).slug);
  if (!a) notFound();
  const crumbs = [{ name: "Home", href: "/" }, { name: "Resources", href: "/resources" }, { name: a.title, href: `/resources/${a.slug}` }];

  return (
    <>
      <JsonLd data={{
        "@context": "https://schema.org", "@type": "Article", headline: a.title, description: a.metaDescription,
        dateModified: a.updated, author: { "@type": "Organization", name: site.name }, publisher: { "@id": `${site.url}/#org` },
        mainEntityOfPage: `${site.url}/resources/${a.slug}`,
      }} />
      <JsonLd data={breadcrumbJsonLd(crumbs)} />

      <section className="bg-forest pb-14 pt-10 text-ivory">
        <div className="container-x max-w-3xl">
          <Breadcrumbs items={crumbs} />
          <h1 className="mt-8 text-[2.3rem] leading-tight sm:text-5xl">{a.title}</h1>
          <p className="mt-4 text-sm text-ivory/60">Updated {new Date(a.updated).toLocaleDateString("en-US", { dateStyle: "long" })}
            {a.reviewed ? ` · Reviewed by ${a.reviewed.by}, ${a.reviewed.credential}` : ""}</p>
        </div>
      </section>

      <article className="container-x max-w-3xl py-14">
        {!a.reviewed && (
          <div className="mb-8 rounded-xl border border-dashed border-gold-2/70 bg-gold/10 px-5 py-4 text-sm text-forest">
            <strong>Professional review pending.</strong> This guide is general information. Regulatory points are being reviewed by a Ghana-qualified professional. {disclaimers.regulatory}
          </div>
        )}
        <div className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-line">
          <p className="text-xs font-bold uppercase tracking-wider text-gold-2">Short answer</p>
          <p className="mt-2 text-[17px] leading-relaxed text-ink">{a.answer}</p>
        </div>
        <div className="prose-bg mt-6">
          {a.sections.map((s) => (
            <section key={s.h}>
              <h2>{s.h}</h2>
              {s.p?.map((p) => <p key={p}>{p}</p>)}
              {s.list && <ul>{s.list.map((l) => <li key={l}>{l}</li>)}</ul>}
            </section>
          ))}
        </div>
        <div className="mt-10 rounded-2xl bg-ivory-2 p-6">
          <p className="font-semibold text-forest">Related services</p>
          <ul className="mt-3 space-y-2">
            {a.related.map((r) => { const s = serviceBySlug(r); return s ? <li key={r}><Link className="inline-flex items-center gap-2 text-forest hover:underline" href={`/${r}`}><Icon name="arrow" className="h-4 w-4 text-gold-2" />{s.navLabel}</Link></li> : null; })}
          </ul>
        </div>
      </article>
      <CtaBand heading="Want this applied to your project?" body="Tell us where you are and we'll recommend the right next step." label={a.cta.label} href={a.cta.href} />
    </>
  );
}
