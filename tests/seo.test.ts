import { describe, it, expect } from "vitest";
import sitemap from "@/app/sitemap";
import robots from "@/app/robots";
import { GET as llms } from "@/app/llms.txt/route";
import { brandTitle, pageGraph, pageMeta } from "@/lib/seo";
import { services } from "@/content/services";
import { funnelPages as funnels } from "@/content/funnels";

const PRIVATE = [/\/admin/, /\/api\//, /\/case\//, /checkout/, /\/payment/, /\/status/, /thank-you/, /\/lp\//];

describe("technical SEO", () => {
  it("sitemap lists only public canonical pages and includes the property hub", () => {
    const urls = sitemap().map((e) => e.url);
    expect(urls.length).toBeGreaterThan(10);
    for (const u of urls) for (const p of PRIVATE) expect(u).not.toMatch(p);
    expect(urls.some((u) => u.endsWith("/property"))).toBe(true);
    expect(urls.some((u) => u.endsWith("/property/sell"))).toBe(true);
    expect(new Set(urls).size).toBe(urls.length);
  });
  it("robots disallows private paths and points to the sitemap", () => {
    const r = robots();
    const rules = Array.isArray(r.rules) ? r.rules[0] : r.rules;
    const dis = ([] as string[]).concat(rules.disallow ?? []);
    for (const p of ["/api/", "/admin", "/property/thank-you"]) expect(dis).toContain(p);
    expect(String(r.sitemap)).toMatch(/sitemap\.xml$/);
  });
  it("llms.txt exposes no private routes or record data", async () => {
    const t = await llms().text();
    expect(t).toMatch(/readiness review/i);
    for (const p of ["/admin", "/api/", "/case/", "/checkout", "@example"]) expect(t).not.toContain(p);
  });
  it("titles are branded and within 60 characters", () => {
    const titles = [...services.map((s) => s.metaTitle), ...funnels.map((f) => f.metaTitle)].filter(Boolean).map((t) => brandTitle(t as string));
    for (const t of titles) { expect(t.endsWith("| BuildGhana")).toBe(true); expect(t.length).toBeLessThanOrEqual(60); }
  });
  it("page metadata sets canonical and noindex for private pages", () => {
    const m = pageMeta({ title: "Inquiry received", description: "x", path: "/property/thank-you", noindex: true });
    expect(m.robots).toMatchObject({ index: false });
    expect(String(m.alternates?.canonical)).toMatch(/\/property\/thank-you$/);
  });
  it("JSON-LD graph has stable ids, breadcrumbs and FAQ, and no address/phone/rating claims", () => {
    const g = pageGraph({ path: "/property/sell", title: "Sell Land or Property in Ghana", description: "d", crumbs: [{ name: "Home", href: "/" }, { name: "Sell", href: "/property/sell" }], faqs: [{ q: "Q?", a: "A." }] });
    const s = JSON.stringify(g);
    expect(s).toContain("BreadcrumbList"); expect(s).toContain("FAQPage"); expect(s).toContain("#webpage");
    for (const bad of ["aggregateRating", "Review", "telephone", "PostalAddress", "RealEstateListing", "geo"]) expect(s).not.toContain(bad);
  });
});
