import type { MetadataRoute } from "next";
import { site } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const isProd = process.env.VERCEL_ENV ? process.env.VERCEL_ENV === "production" : true;
  if (!isProd) return { rules: [{ userAgent: "*", disallow: "/" }] }; // block preview deployments
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/"] },
      // ChatGPT ads review + ChatGPT search must be able to read landing pages.
      { userAgent: ["OAI-AdsBot", "OAI-SearchBot"], allow: "/", disallow: ["/api/"] },
    ],
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
