import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { services } from "@/content/services";
import { articles } from "@/content/articles";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const staticPaths: [string, number][] = [
    ["/", 1], ["/build-in-ghana", 0.9], ["/our-process", 0.7], ["/about", 0.6], ["/projects", 0.5],
    ["/ghana-build-readiness-review", 0.9], ["/resources", 0.7], ["/assessment", 0.8], ["/book-consultation", 0.7], ["/privacy", 0.2], ["/terms", 0.2],
  ];
  return [
    ...staticPaths.map(([p, priority]) => ({ url: `${site.url}${p === "/" ? "" : p}`, lastModified: now, priority })),
    ...services.map((s) => ({ url: `${site.url}/${s.slug}`, lastModified: now, priority: 0.9 })),
    ...articles.map((a) => ({ url: `${site.url}/resources/${a.slug}`, lastModified: new Date(a.updated), priority: 0.6 })),
  ];
}
