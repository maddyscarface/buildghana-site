import type { Metadata } from "next";
import { site } from "@/config/site";
import { isStaging } from "@/lib/env";

/**
 * SEO helpers — the single place titles, canonicals, robots and JSON-LD are built.
 *
 * Canonicals use `site.canonicalUrl` (NEXT_PUBLIC_CANONICAL_URL → NEXT_PUBLIC_SITE_URL). The final production
 * domain is an owner decision; until it is set, canonicals point at the configured site URL.
 * Staging / preview deployments are ALWAYS noindex at page level (this used to be overridden by
 * per-page `robots: index` — fixed in Phase 3) as well as via the X-Robots-Tag header.
 */
const BRAND_SUFFIXES = [/\s*[|·—-]\s*BuildGhana Abroad\s*$/i, /\s*[|·—-]\s*BuildGhana\s*$/i];

/** Normalises a title to "<Topic> | BuildGhana" (spec format), avoiding double brands. */
export function brandTitle(title: string) {
  let t = title.trim();
  for (const r of BRAND_SUFFIXES) t = t.replace(r, "");
  return t.length ? `${t} | ${site.shortName}` : site.shortName;
}

export const abs = (path: string) => `${site.canonicalUrl}${path === "/" ? "" : path}`;

export function pageMeta({ title, description, path, noindex = false, image, ogType = "website" }: {
  title: string; description: string; path: string; noindex?: boolean; image?: { url: string; alt: string }; ogType?: "website" | "article";
}): Metadata {
  const url = abs(path);
  const t = brandTitle(title);
  const index = !noindex && !isStaging;
  return {
    title: { absolute: t },
    description,
    alternates: { canonical: url },
    openGraph: { title: t, description, url, siteName: site.shortName, type: ogType, locale: "en_GB", ...(image ? { images: [{ url: image.url, alt: image.alt }] } : {}) },
    twitter: { card: "summary_large_image", title: t, description, ...(image ? { images: [image.url] } : {}) },
    robots: index ? { index: true, follow: true } : { index: false, follow: !isStaging, ...(isStaging ? { nocache: true, googleBot: { index: false, follow: false } } : {}) },
  };
}

/* ───────────── JSON-LD (stable @id graph) ───────────── */

export const ids = {
  org: () => `${site.canonicalUrl}/#org`,
  website: () => `${site.canonicalUrl}/#website`,
  page: (path: string) => `${abs(path)}#webpage`,
  breadcrumb: (path: string) => `${abs(path)}#breadcrumb`,
  service: (path: string) => `${abs(path)}#service`,
  faq: (path: string) => `${abs(path)}#faq`,
};

/** Organization / ProfessionalService. Only verified facts: no address, phone, licences, ratings or reviews. */
export const orgNode = () => ({
  "@type": ["Organization", "ProfessionalService"],
  "@id": ids.org(),
  name: site.name,
  alternateName: site.shortName,
  url: site.canonicalUrl,
  slogan: site.tagline,
  description: site.description,
  logo: { "@type": "ImageObject", url: `${site.canonicalUrl}/icon-512.png`, width: 512, height: 512 },
  areaServed: { "@type": "Country", name: "Ghana" },
  audience: [
    { "@type": "Audience", audienceType: "Property owners and buyers living in Ghana", geographicArea: { "@type": "Country", name: "Ghana" } },
    { "@type": "Audience", audienceType: "Ghanaian diaspora, returnees and overseas owners building or buying in Ghana" },
  ],
  knowsAbout: ["Construction management", "Owner's representation", "Construction supervision", "Build readiness review", "Land due diligence coordination", "Ghana property development"],
  ...(site.email ? { email: site.email } : {}),
  // address, telephone, sameAs, licences and aggregateRating intentionally omitted until verified.
});

export const websiteNode = () => ({
  "@type": "WebSite", "@id": ids.website(), url: site.canonicalUrl, name: site.shortName, alternateName: site.name,
  description: site.description, publisher: { "@id": ids.org() }, inLanguage: "en",
});

/** Site-wide graph rendered once by the (site) layout. */
export const siteGraph = () => ({ "@context": "https://schema.org", "@graph": [orgNode(), websiteNode()] });

type Crumb = { name: string; href: string };
type Faq = { q: string; a: string };

/**
 * Per-page graph: WebPage (+ BreadcrumbList, Service, FAQPage) referencing the site-wide nodes by @id.
 * FAQPage must contain ONLY Q&A that is visibly rendered on the same page (no rich-result expectation).
 */
export function pageGraph({ path, title, description, crumbs, service, faqs, type = "WebPage", image }: {
  path: string; title: string; description: string; crumbs?: Crumb[]; faqs?: Faq[]; type?: "WebPage" | "AboutPage" | "ContactPage" | "CollectionPage" | "FAQPage";
  service?: { name: string; description: string; serviceType?: string; audience?: string };
  image?: string;
}) {
  const graph: Record<string, unknown>[] = [{
    "@type": type, "@id": ids.page(path), url: abs(path), name: brandTitle(title), description, inLanguage: "en",
    isPartOf: { "@id": ids.website() }, about: { "@id": ids.org() },
    ...(crumbs ? { breadcrumb: { "@id": ids.breadcrumb(path) } } : {}),
    ...(image ? { primaryImageOfPage: { "@type": "ImageObject", url: image.startsWith("http") ? image : `${site.canonicalUrl}${image}` } } : {}),
    ...(service ? { mainEntity: { "@id": ids.service(path) } } : {}),
  }];
  if (crumbs) graph.push({ "@type": "BreadcrumbList", "@id": ids.breadcrumb(path), itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.name, item: abs(c.href) })) });
  if (service) graph.push({
    "@type": "Service", "@id": ids.service(path), name: service.name, description: service.description, url: abs(path),
    serviceType: service.serviceType ?? service.name, provider: { "@id": ids.org() }, areaServed: { "@type": "Country", name: "Ghana" },
    ...(service.audience ? { audience: { "@type": "Audience", audienceType: service.audience } } : {}),
  });
  if (faqs?.length) graph.push({
    "@type": "FAQPage", "@id": ids.faq(path), isPartOf: { "@id": ids.page(path) },
    mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
  });
  return { "@context": "https://schema.org", "@graph": graph };
}

/* Back-compat helpers (kept for existing callers; prefer pageGraph). */
export const orgJsonLd = () => ({ "@context": "https://schema.org", ...orgNode() });
export const breadcrumbJsonLd = (items: Crumb[]) => ({
  "@context": "https://schema.org", "@type": "BreadcrumbList",
  itemListElement: items.map((i, idx) => ({ "@type": "ListItem", position: idx + 1, name: i.name, item: abs(i.href) })),
});
export const faqJsonLd = (faqs: Faq[]) => ({
  "@context": "https://schema.org", "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});
export const serviceJsonLd = (s: { name: string; description: string; path: string }) => ({
  "@context": "https://schema.org", "@type": "Service", name: s.name, description: s.description, url: abs(s.path),
  areaServed: { "@type": "Country", name: "Ghana" }, provider: { "@id": ids.org() },
});
