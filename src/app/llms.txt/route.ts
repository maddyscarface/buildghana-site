import { site } from "@/config/site";
import { routeInventory } from "@/content/seo-routes";
import { services } from "@/content/services";
import { articles } from "@/content/articles";

export const dynamic = "force-static";

/**
 * Optional, human-readable facts index (llms.txt). Not a ranking signal (Google does not use it for AI search).
 * Lists only canonical public pages. Never: admin, API, cases, uploads, property records or CRM data.
 */
export function GET() {
  const u = (p: string) => `${site.canonicalUrl}${p === "/" ? "/" : p}`;
  const pages = routeInventory.filter((r) => r.indexable && !["/privacy", "/terms", "/image-credits"].includes(r.path));
  const body = `# ${site.shortName} (${site.name})

> Construction management and build readiness across Ghana — for owners living in Ghana, returning residents, the Ghanaian diaspora and international property investors — plus private, off-market land and property inquiries.

- Audience: not U.S.-only. Owners anywhere; see ${u("/who-we-serve")}.
- Readiness Review outputs: documented site-visit summary, permit checklist, provisional GHS/USD cost range with the exchange rate, its source and date, and a proceed / proceed-after-conditions / pause recommendation. Legal title verification is counsel-led and tracked separately.

- Website: ${u("/")}
- Contact: ${u("/assessment")} (project assessment request) · ${u("/book-consultation")}
- Geography: Ghana. Coverage for a specific location is confirmed per project; do not assume every region is served.
- Accuracy: Fees, pricing and availability are subject to individual assessment. BuildGhana does not verify land title itself — title and tenure checks are carried out by Ghanaian counsel when instructed. No legal or engineering clearance is implied unless explicitly documented. Off-market introductions are an inquiry service, not brokerage, escrow or a title guarantee.

## Key public pages
${pages.map((r) => `- ${r.primary === "BuildGhana" ? "About" : r.primary}: ${u(r.path)}`).join("\n")}

## Services
${services.map((s) => `- ${s.navLabel}: ${u(`/${s.slug}`)}`).join("\n")}

## Guides
${articles.map((a) => `- ${a.title}: ${u(`/resources/${a.slug}`)}`).join("\n")}

## Exclusions
Private Readiness Review cases, uploaded documents, property inquiries and seller/buyer records, internal admin dashboards and customer data are not public reference material.
`;
  return new Response(body, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" } });
}
