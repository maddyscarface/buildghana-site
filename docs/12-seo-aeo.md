# 12 — SEO & Answer-Engine Optimisation Launch Plan

## Technical SEO (implemented)
| Item | Where | Status |
|---|---|---|
| Unique title + meta description per page | `pageMeta()` in every route; service copy in `src/content/services.ts` | ✓ built |
| Canonicals (absolute, from `NEXT_PUBLIC_SITE_URL`) | `src/lib/seo.ts` | ✓ (set the env var!) |
| Open Graph / Twitter cards + generated OG image | `pageMeta`, `src/app/opengraph-image.tsx` | ✓ |
| `sitemap.xml` (static, services, articles) | `src/app/sitemap.ts` | ✓ |
| `robots.txt` (blocks all on Vercel preview deployments; `/api/` on prod) | `src/app/robots.ts` | ✓ |
| noindex on `/lp/*` and `/thank-you` | route metadata | ✓ |
| Structured data | Organization/ProfessionalService (no address/phone until verified), Service, BreadcrumbList, FAQPage, Article | ✓ |
| Static generation of all content pages | SSG | ✓ |
| Self-hosted fonts (no third-party font requests) | Fontsource | ✓ |
| Security headers, no `x-powered-by` | `next.config.ts` | ✓ |
| Semantic HTML, skip link, focus styles, labelled form controls | components | ✓ |

**Structured-data rules:** no `AggregateRating`/`Review` until genuine reviews exist on a third-party platform. No `LocalBusiness` address until a real, verified office. FAQPage markup is valid but Google currently limits FAQ rich results to authoritative gov/health sites. It's kept for answer engines, not expected as a SERP feature.

## Information architecture & internal links
Home → 7 service pages (grid) → each service links to 2–3 related services + process. Articles link to related services. Build-in-Ghana hub links to the 4 new-home stages. Footer links all services. Add new articles to the relevant service page's "related" list as they're published.

## AEO (answer engines: Google AI Overviews, ChatGPT search, Perplexity)
- Each article opens with a **"Short answer"** block (40–70 words) that directly answers the title query (`answer` field).
- Question-shaped H2s, numbered steps, and lists.
- Named professions and authorities (Lands Commission, Metropolitan/Municipal/District Assemblies, licensed surveyors) give entities context.
- Explicit "what we don't do" statements improve trust signals and reduce misattribution.
- Reviewer byline (`reviewed`) once a Ghana-qualified professional signs off (E-E-A-T).
- Keep an `/llms.txt` (optional): one-paragraph company summary + key URLs. Add when content stabilises.

## Ghana construction terminology to use naturally
Indenture · site plan · land title certificate · Lands Commission search · stool/skin/family land · allodial vs. usufructuary interests (with plain explanations) · building permit · Metropolitan, Municipal and District Assemblies (MMDAs) · physical planning department · Land Use and Spatial Planning Authority (LUSPA) · Ghana Building Code · setting out · foundation/footing · columns, beams, slab (decking) · blockwork (sandcrete blocks) · lintel · roofing (aluminium / long-span sheets) · plastering · screeding · POP ceilings · septic/soakaway · borehole/polytank · ECG connection · Ghana Water connection · wall/gate fencing · snagging.

## Regulatory content: verification protocol
Every regulatory statement (laws, permits, authorities, procedures) must be checked by a Ghana-qualified lawyer, planner or surveyor before `reviewed` is set on the article. Current launch articles reference the Land Act, 2020 (Act 1036), the Lands Commission, MMDA building permits and Ghana's land-use and spatial planning framework. **All are pending verification**, and the pages display a review notice until then.

## 20 article topics (overseas owners actively planning)
| # | Title | Intent | Primary link | Status |
|---|---|---|---|---|
| 1 | How to Build a House in Ghana While Living in the U.S. | Planning | /build-in-ghana | **Drafted** |
| 2 | Land Due Diligence in Ghana: What to Check Before You Build | Land | /land-feasibility | **Drafted** |
| 3 | Your Construction Project in Ghana Has Stalled. What Now? | Rescue | /ghana-project-rescue | **Drafted** |
| 4 | How Much Does It Cost to Build a House in Ghana? (What Drives the Number) | Cost | /preconstruction-budgeting | Brief |
| 5 | How to Get a Building Permit in Ghana: The Process Explained | Permits | /design-coordination | Brief (needs reviewer) |
| 6 | Indenture, Site Plan, Land Title: Ghana Land Documents Explained | Land | /land-feasibility | Brief (needs reviewer) |
| 7 | Family Land in Ghana: What to Clarify Before You Build | Land | /land-feasibility | Brief (needs reviewer) |
| 8 | How to Pay a Builder in Ghana Safely From Abroad | Payments | /owners-representation | Brief |
| 9 | What a Construction Progress Report Should Contain | Oversight | /owners-representation | Brief |
| 10 | Owner's Representative vs. General Contractor: Which Do You Need? | Service choice | /owners-representation | Brief |
| 11 | Construction Stages of a House in Ghana, From Setting Out to Handover | Planning | /construction-management-ghana | Brief |
| 12 | Why Complete Drawings Save Money: Architectural vs. Structural vs. MEP | Design | /design-coordination | Brief |
| 13 | Can I Use an American House Plan in Ghana? | Design | /design-coordination | Brief |
| 14 | Building in Phases in Ghana: How to Pause Without Damaging the Structure | Planning/Rescue | /preconstruction-budgeting | Brief |
| 15 | Checking Whether an Unfinished Building Is Structurally Sound | Rescue | /ghana-project-rescue | Brief (engineer input) |
| 16 | Buying an Unfinished House in Ghana: Due Diligence Checklist | Rescue/Land | /ghana-project-rescue | Brief |
| 17 | Developing Rental Apartments in Ghana: A Construction-First Feasibility Guide | Investor | /ghana-property-development | Brief |
| 18 | Draw Schedules and Cost Control for Ghana Development Projects | Investor | /ghana-property-development | Brief |
| 19 | Choosing a Building Contractor in Ghana: 12 Questions to Ask | Contractor | /construction-management-ghana | Brief |
| 20 | Managing Exchange-Rate and Material Price Risk on a Ghana Build | Cost | /preconstruction-budgeting | Brief |

**Cadence:** 2 articles/month after launch, prioritising 4, 8, 10, 5, 19 (highest commercial intent). Each article: short answer, 900–1,600 words, 1 original graphic, reviewer byline where regulatory, 2+ internal links, CTA.

## Launch checklist
- [ ] `NEXT_PUBLIC_SITE_URL` = production domain (canonicals/sitemap depend on it)
- [ ] Google Search Console: verify domain (DNS), submit sitemap
- [ ] Bing Webmaster Tools: import from GSC
- [ ] Run Rich Results Test on home, one service page, one article
- [ ] Lighthouse mobile ≥ 90 Performance / 100 SEO / ≥ 95 Accessibility on home and one LP
- [ ] Replace placeholder imagery with real photography (with `alt` text) as it becomes available
- [ ] Google Business Profile: only if you have a verified, eligible location. Don't create one with a virtual address.
