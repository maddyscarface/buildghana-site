import type { MetadataRoute } from "next";
import { site } from "@/config/site";
import { isStaging } from "@/lib/env";

export default function robots(): MetadataRoute.Robots {
  if (isStaging) return { rules: [{ userAgent: "*", disallow: "/" }] }; // block staging / preview deployments
  const disallow = ["/api/", "/admin", "/ghana-build-readiness-review/case/", "/ghana-build-readiness-review/checkout/"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow },
      // ChatGPT ads review + ChatGPT search must be able to read landing pages.
      { userAgent: ["OAI-AdsBot", "OAI-SearchBot"], allow: "/", disallow },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
