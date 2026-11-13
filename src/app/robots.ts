import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { indexable } from "@/lib/env";

/** Private paths. robots.txt is NOT access control — each of these is also auth-gated and/or noindex. */
export const privateDisallow = [
  "/api/", "/admin", "/ghana-build-readiness-review/case/", "/ghana-build-readiness-review/checkout/",
  "/ghana-build-readiness-review/payment", "/ghana-build-readiness-review/status", "/thank-you", "/property/thank-you",
];

export default function robots(): MetadataRoute.Robots {
  if (!indexable) return { rules: [{ userAgent: "*", disallow: "/" }] }; // staging / preview / explicitly blocked
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: privateDisallow },
      // ChatGPT ads review + ChatGPT search may read public pages (owner may change this policy).
      { userAgent: ["OAI-AdsBot", "OAI-SearchBot"], allow: "/", disallow: privateDisallow },
    ],
    sitemap: `${site.canonicalUrl}/sitemap.xml`,
    host: site.canonicalUrl,
  };
}
