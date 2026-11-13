import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { services } from "@/content/services";
import { articles } from "@/content/articles";
import { routeInventory, P3 } from "@/content/seo-routes";
import { indexable } from "@/lib/env";

/**
 * Only canonical, indexable, public 200 pages. Never: admin, API, checkout, case pages, thank-you pages,
 * ad landing pages (/lp/*), or any private property record. lastModified comes from content dates.
 * Staging returns an empty sitemap.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  if (!indexable) return [];
  const u = (p: string) => `${site.canonicalUrl}${p === "/" ? "" : p}`;
  return [
    ...routeInventory.filter((r) => r.indexable).map((r) => ({ url: u(r.path), lastModified: new Date(r.updated), priority: r.priority })),
    ...services.map((s) => ({ url: u(`/${s.slug}`), lastModified: new Date(P3), priority: 0.9 })),
    ...articles.map((a) => ({ url: u(`/resources/${a.slug}`), lastModified: new Date(a.updated), priority: 0.6 })),
  ];
}
