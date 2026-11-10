# 10 — Meta Ads Campaign Assets

All budgets, CPLs and volumes below are **planning assumptions, unverified** until real data comes in.

## Housing / Special Ad Category: compliance checks
These ads promote residential construction services. Meta's Housing special ad category covers ads about housing-related opportunities and services. **Default: declare Special Ad Category = Housing** for all three campaigns unless Meta's current policy or your Meta rep confirms otherwise in writing. Re-check Meta's policy page before launch, since the rules change.

Under Housing, expect: no age/gender targeting, a minimum location radius, restricted detailed targeting and no lookalike audiences. Regardless of category, **our own rules:**
- [ ] No targeting, exclusion or inference by ethnicity, national origin, ancestry, "African diaspora", "Ghanaian heritage", language-as-proxy, religion, age, sex or family status.
- [ ] Geography = countries/regions where prospects live (U.S. first), never neighbourhood-level targeting that proxies a protected group.
- [ ] Creative may say "building in Ghana" (the project location). It must not say or imply "for Ghanaians" or target people by origin. Copy speaks to *anyone building in Ghana*.
- [ ] No fake urgency, guarantees, testimonials or results.
- [ ] Imagery: real project photos (with permission), original illustration or licensed images. People in creative must not be chosen to signal a target demographic.
- [ ] Every ad links to an `/lp/*` page with privacy policy and clear offer.

## Campaign structure
| Campaign | Objective | Optimisation (start → later) | Ad sets |
|---|---|---|---|
| **BGA-A New Home** | Leads (website) | Lead → Schedule → Purchase (paid assessment) | A1 Broad U.S. · A2 Interest-light (construction/real estate/home design, if available under Housing) · A3 Retargeting |
| **BGA-B Stalled** | Leads (website) | Lead → Schedule | B1 Broad U.S. · B2 Retargeting (site visitors 30d) |
| **BGA-C Investors** | Leads (website) | Lead → Schedule | C1 Broad U.S. · C2 Interest-light (real estate investing, if permitted) |
| **BGA-R Retargeting** | Leads | Lead | R1 site visitors 7d · R2 form_start no lead 14d · R3 video viewers 50% 30d · R4 LP visitors 30d (exclude leads 180d) |

Placements: Advantage+ placements, then review by placement after 2 weeks. Use a **website** conversion location (our form), not instant forms, to keep data quality, consent capture and dedup intact. Optionally test Instant Forms with "Higher intent" + custom questions later as a separate ad set.

**Geo testing plan:** Phase 1 U.S. nationwide (broad, Housing-compliant). Phase 2: split by state cluster *only by observed lead quality* (e.g. if qualified leads concentrate in certain metros, raise budget there). Never pick geos as a proxy for a demographic. Phase 3: Canada, UK as separate campaigns with localised currency/time zones and a privacy review.

## Ad copy
### Funnel A: New Home
**Primary text**
1. Building a home in Ghana from abroad? Before you send another dollar, get the facts: your land checked, your budget tested, and a written plan for managing construction from where you live. Start with a Feasibility Assessment.
2. You shouldn't have to manage a construction site by voice note. We plan, verify and report on your Ghana build: line-item budgets, milestone payments and dated photo reports. Request a project assessment.
3. Land first. Then drawings. Then permits. Then budget. Then build. Most stalled projects in Ghana skip a step. We help you do it in the right order, managed from abroad.

**Headlines:** Build in Ghana. Stay in Control. · Plan Your Ghana Home Properly · Check Your Project Fit · Verified Progress Before Payment · Your Ghana Build, Managed
**Descriptions:** Fixed-fee Feasibility Assessment · Written scope before you commit · Reports with dated photos & video

### Funnel B: Stalled
**Primary text**
1. Has your building project in Ghana stopped? Before you send more money, find out exactly what was built, what condition it's in and what it will cost to finish. Request a Project Review.
2. Unfinished building. Silent builder. Unclear spending. A Project Review documents your site, gets structural questions answered by a qualified engineer and gives you a recovery plan. No obligation to use us to finish.
3. Every month a build sits, it costs you. Get the facts on your stalled Ghana project in one fixed-fee review.

**Headlines:** Stalled Build in Ghana? Get the Facts · Know What It Takes to Finish · Independent Project Review · Facts First. Then Decide.
**Descriptions:** Documented site review · Cost-to-complete estimate · Recovery options in writing

### Funnel C: Investors
**Primary text**
1. Developing rental property in Ghana? Test your construction costs, schedule and site before you commit capital, then build with line-item cost control and investor-grade reporting.
2. Returns on paper don't survive weak execution. We bring development discipline to Ghana projects: feasibility, budgets, draw schedules and independent reporting.

**Headlines:** Develop in Ghana With Control · Test the Deal Before You Fund It · Investor-Grade Construction Reporting
**Descriptions:** Feasibility Consultation · Cost & schedule tested · Advisory or delivery

## Image creative briefs
| ID | Funnel | Concept | Notes |
|---|---|---|---|
| IMG-A1 | A | Hero illustration of the residence (site asset) on forest bg + headline "Build in Ghana. Stay in control." | Brand colours, 1:1 and 4:5 |
| IMG-A2 | A | "The right order" 5-step graphic: Land → Design → Permit → Budget → Build | Text ≤ 20% |
| IMG-A3 | A | Phone mock showing the sample report, labelled "Sample report" | Must keep the "illustrative" label |
| IMG-B1 | B | Real stalled-site photo (with owner permission) + "Get the facts before you send more money" | Until available: illustration of exposed columns |
| IMG-B2 | B | Checklist card: "Documented · Engineer-reviewed · Cost to complete · Options" | |
| IMG-C1 | C | Dashboard crop: budget vs. actual, draw schedule | Labelled sample |
| IMG-C2 | C | Split card: "Pro forma" vs "Verified cost plan" | |

## Reels / video scripts (20–30s, founder-led or voiceover, captions on)
**R-A1 "Three questions" (New Home)**
0–3s: Hook on screen: "Building a house in Ghana from abroad?" · 3–12s: "Ask three questions before you send money. Is the land verified? Are the drawings complete? Is the budget line by line?" · 12–22s: B-roll: report on phone, site photos (labelled sample). "If any answer is no, start with a Feasibility Assessment." · 22–28s: CTA "Request a project assessment. Link below."

**R-B1 "Stop. Document. Decide." (Stalled)**
Hook: "Your build in Ghana stopped. Don't send more money yet." → Stop payments → Document the site → Engineer answers structural questions → Price the finish → "That's a Project Review." CTA.

**R-C1 "The pro forma isn't the project" (Investor)**
Hook: "Your Ghana rental returns depend on one number you haven't tested." → construction cost → schedule → draw control → CTA.

**R-Founder "Why I started this"**: Gary on camera, 45s, U.S. construction & development background, what he saw go wrong, the commitment ("verified before reported"). No claims beyond doc 01's verified list.

## Carousel concepts
1. **"5 reasons builds stall in Ghana"** (one card each + final CTA card)
2. **"What a good progress report contains"** (sample report sections)
3. **"Advisory vs. builder: which do you need?"** (decision tree)
4. **Investor: "From land to lease-up in 5 stages"**

## Retargeting sequence
| Window | Audience | Message |
|---|---|---|
| 0–3 days | LP/service visitors, no form_start | Process explainer (carousel 3) |
| 0–7 days | form_start, no lead | "Finish your assessment request — 2 minutes left" (no fake urgency) |
| 3–14 days | visitors | Founder video |
| 7–30 days | visitors + 50% video viewers | Resource article ad (land checklist / stalled guide) |
| Exclude | leads (180d), clients | |

## Creative testing plan
- Week 1–2: 3 concepts × 2 formats per funnel, Advantage+ creative off for clean reads.
- Kill rule: spend ≥ 2× target CPL with zero leads → pause. Promote rule: lowest CPL with ≥ 40% standard+priority tier share.
- Read quality, not just CPL: weekly **CPL by tier** from GHL (lead_tier × utm_content).
- Iterate hooks weekly. Keep 1 control ad.

## Budget allocation (starting assumption, unverified)
Test budget **$1,500–3,000/month**: A 45% · B 30% · C 15% · Retargeting 10%. Hold for 3–4 weeks before major changes. Move to Schedule optimisation once an ad set gets ~50 schedules/week (rarely at this budget: use Lead with quality filters until then).

## Lead quality reporting (weekly)
`utm_campaign × utm_content → leads, % priority, % standard, discovery booked, qualified, paid assessments, spend, cost per qualified, cost per paid assessment`. Source: GHL Smart List export joined with Ads Manager spend (sheet template in doc 15).
