import type { Metadata } from "next";
import { site } from "@/config/site";

export function pageMeta({ title, description, path, noindex = false }: { title: string; description: string; path: string; noindex?: boolean }): Metadata {
  const url = `${site.url}${path === "/" ? "" : path}`;
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: site.name, type: "website", locale: "en_US" },
    twitter: { card: "summary_large_image", title, description },
    robots: noindex ? { index: false, follow: true } : { index: true, follow: true },
  };
}

export const orgJsonLd = () => ({
  "@context": "https://schema.org",
  "@type": "ProfessionalService",
  "@id": `${site.url}/#org`,
  name: site.name,
  url: site.url,
  slogan: site.tagline,
  description: site.description,
  areaServed: [{ "@type": "Country", name: "Ghana" }],
  knowsAbout: ["Construction management", "Owner's representation", "Construction inspection", "Feasibility studies", "Real estate development"],
  // address, telephone and sameAs intentionally omitted until verified — do not add placeholders.
});

export const breadcrumbJsonLd = (items: { name: string; href: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((i, idx) => ({ "@type": "ListItem", position: idx + 1, name: i.name, item: `${site.url}${i.href}` })),
});

export const faqJsonLd = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
});

export const serviceJsonLd = (s: { name: string; description: string; path: string }) => ({
  "@context": "https://schema.org",
  "@type": "Service",
  name: s.name,
  description: s.description,
  url: `${site.url}${s.path}`,
  areaServed: { "@type": "Country", name: "Ghana" },
  provider: { "@id": `${site.url}/#org` },
});
