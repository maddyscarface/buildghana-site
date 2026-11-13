/**
 * Route inventory + keyword-to-URL map (Phase 3 §2). One canonical URL per primary intent.
 * Drives sitemap.ts (indexable routes only) and the SEO audit test. Keyword themes are hypotheses to
 * validate in Search Console / keyword research — no search-volume claims are made.
 * `updated` = last meaningful content change (used as sitemap lastModified; never `new Date()`).
 */
export type RouteSeo = {
  path: string; audience: string; queryGroup: string; stage: "informational" | "commercial" | "transactional" | "utility";
  primary: string; secondary: string[]; cta: string; schema: string[]; indexable: boolean; updated: string; priority: number;
};

export const P3 = "2026-11-13";

export const routeInventory: RouteSeo[] = [
  { path: "/", audience: "Owners in Ghana and abroad (diaspora, returnees, residents)", queryGroup: "brand + construction management Ghana", stage: "commercial", primary: "construction management Ghana", secondary: ["build house in Ghana", "Ghana diaspora home building", "construction supervision Accra"], cta: "/ghana-build-readiness-review", schema: ["WebPage", "FAQPage", "Organization", "WebSite"], indexable: true, updated: P3, priority: 1 },
  { path: "/ghana-build-readiness-review", audience: "Owners preparing to build (in Ghana or abroad)", queryGroup: "readiness / due diligence", stage: "transactional", primary: "Ghana build readiness review", secondary: ["land due diligence Ghana", "building permit Ghana", "construction cost Ghana"], cta: "/ghana-build-readiness-review/start", schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"], indexable: true, updated: P3, priority: 0.9 },
  { path: "/property", audience: "Sellers and buyers of land/property in Ghana", queryGroup: "buy / sell land Ghana", stage: "commercial", primary: "off-market property Ghana", secondary: ["buy land in Ghana", "sell land in Ghana"], cta: "/property/sell · /property/buy", schema: ["WebPage", "Service", "FAQPage", "BreadcrumbList"], indexable: true, updated: P3, priority: 0.9 },
  { path: "/property/sell", audience: "Owners, families and agents selling land or property", queryGroup: "sell land Ghana", stage: "transactional", primary: "sell land in Ghana", secondary: ["sell property in Ghana privately", "sell family land Ghana"], cta: "Seller form", schema: ["WebPage", "BreadcrumbList", "FAQPage"], indexable: true, updated: P3, priority: 0.8 },
  { path: "/property/buy", audience: "Buyers in Ghana and abroad", queryGroup: "buy land Ghana", stage: "transactional", primary: "buy land in Ghana", secondary: ["buy property in Ghana from abroad", "land for sale Ghana diaspora"], cta: "Buyer form", schema: ["WebPage", "BreadcrumbList", "FAQPage"], indexable: true, updated: P3, priority: 0.8 },
  { path: "/property/how-it-works", audience: "Sellers and buyers evaluating the service", queryGroup: "process / safety", stage: "informational", primary: "how to buy land safely in Ghana", secondary: ["land title verification Ghana", "Ghana land search"], cta: "/property", schema: ["WebPage", "BreadcrumbList", "FAQPage"], indexable: true, updated: P3, priority: 0.7 },
  { path: "/property/opportunities", audience: "Buyers looking for opportunities", queryGroup: "land for sale Ghana", stage: "commercial", primary: "property opportunities Ghana", secondary: [], cta: "/property/buy", schema: ["WebPage", "BreadcrumbList"], indexable: true, updated: P3, priority: 0.5 },
  { path: "/build-in-ghana", audience: "First-time builders", queryGroup: "build house in Ghana", stage: "informational", primary: "build a house in Ghana", secondary: ["building in Ghana process", "Ghana building permit"], cta: "/assessment", schema: ["WebPage", "FAQPage"], indexable: true, updated: P3, priority: 0.9 },
  { path: "/our-process", audience: "Prospective clients", queryGroup: "process", stage: "commercial", primary: "Ghana construction project management process", secondary: [], cta: "/assessment", schema: ["WebPage"], indexable: true, updated: P3, priority: 0.7 },
  { path: "/about", audience: "Prospective clients", queryGroup: "brand", stage: "commercial", primary: "BuildGhana", secondary: [], cta: "/assessment", schema: ["AboutPage"], indexable: true, updated: P3, priority: 0.6 },
  { path: "/projects", audience: "Prospective clients", queryGroup: "proof", stage: "commercial", primary: "BuildGhana projects", secondary: [], cta: "/assessment", schema: ["WebPage"], indexable: true, updated: P3, priority: 0.5 },
  { path: "/resources", audience: "Researchers", queryGroup: "guides", stage: "informational", primary: "Ghana building guides", secondary: [], cta: "/resources/*", schema: ["CollectionPage"], indexable: true, updated: P3, priority: 0.7 },
  { path: "/assessment", audience: "Ready-to-talk owners", queryGroup: "construction management Ghana", stage: "transactional", primary: "Ghana project assessment", secondary: [], cta: "Lead form", schema: ["ContactPage"], indexable: true, updated: P3, priority: 0.8 },
  { path: "/book-consultation", audience: "Ready-to-talk owners", queryGroup: "consultation", stage: "transactional", primary: "Ghana construction consultation", secondary: [], cta: "Booking", schema: ["ContactPage"], indexable: true, updated: P3, priority: 0.7 },
  { path: "/privacy", audience: "All", queryGroup: "legal", stage: "utility", primary: "privacy", secondary: [], cta: "—", schema: ["WebPage"], indexable: true, updated: P3, priority: 0.2 },
  { path: "/terms", audience: "All", queryGroup: "legal", stage: "utility", primary: "terms", secondary: [], cta: "—", schema: ["WebPage"], indexable: true, updated: "2026-11-12", priority: 0.2 },
  { path: "/image-credits", audience: "All", queryGroup: "legal", stage: "utility", primary: "image credits", secondary: [], cta: "—", schema: ["WebPage"], indexable: true, updated: P3, priority: 0.1 },
  // Not indexable (noindex + excluded from sitemap): checkout, private case pages, thank-you, ad landing pages, admin.
  { path: "/ghana-build-readiness-review/start", audience: "Paying clients", queryGroup: "checkout", stage: "transactional", primary: "—", secondary: [], cta: "Intake", schema: [], indexable: false, updated: P3, priority: 0 },
  { path: "/property/thank-you", audience: "Submitters", queryGroup: "—", stage: "utility", primary: "—", secondary: [], cta: "—", schema: [], indexable: false, updated: P3, priority: 0 },
  { path: "/thank-you", audience: "Submitters", queryGroup: "—", stage: "utility", primary: "—", secondary: [], cta: "—", schema: [], indexable: false, updated: P3, priority: 0 },
];
