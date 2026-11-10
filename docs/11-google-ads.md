# 11 — Google Ads Campaign Structure

**Keyword volumes, CPCs and CPAs are UNVERIFIED.** Validate in Keyword Planner before setting budgets. Expect low volume for a niche cross-border service: the plan favours exact/phrase precision over reach.

## Account setup
- Conversion actions: **Lead – Website Form** (primary, from GTM, enhanced conversions for leads ON), **Discovery Booked** (secondary initially), **Qualified Lead / Paid Assessment / Contract Signed** (offline import, see doc 09).
- Auto-tagging ON (gclid). Parallel tracking ON. Final URL suffix: `utm_source=google&utm_medium=cpc&utm_campaign={_campaign}&utm_term={keyword}&utm_content={creative}` (define `{_campaign}` custom parameter per campaign).
- Location: **Presence: people in or regularly in** the targeted locations (not "interest in"). Initial geo: United States. Ghana searchers are excluded at launch (we're acquiring overseas owners), so revisit later.
- Language: English. Networks: Search only (disable Display & Search Partners initially).
- Bidding: Maximize Conversions (Lead) → tCPA after ~30 conversions/30 days → value-based bidding once offline Paid Assessment values flow.

## Campaigns & ad groups
| Campaign | Ad group | Exact / phrase keywords (proposed) | Landing page |
|---|---|---|---|
| **G1 Build House Ghana** | Build house in Ghana | [build house in ghana], [building a house in ghana], "build a house in ghana", "building a home in ghana", "build house in ghana from usa", "build in ghana from abroad" | /lp/new-home |
| | Cost / planning | "cost to build a house in ghana", "how to build a house in ghana", "ghana house plans and cost" | /build-in-ghana (organic-style intent) |
| **G2 Ghana Construction Companies** | Construction companies | [construction companies in ghana], "ghana construction company", "building contractors in ghana", "ghana home builders", "best construction company in ghana" | /construction-management-ghana |
| **G3 Construction Management** | CM / PM | "construction management ghana", "project management construction ghana", "construction manager ghana" | /construction-management-ghana |
| **G4 Project Supervision** | Supervision / owner's rep | "construction supervision ghana", "supervise building project in ghana", "monitor construction in ghana from abroad", "building inspector ghana", "owner's representative ghana" | /owners-representation |
| **G5 Unfinished Construction** | Stalled | "unfinished building ghana", "complete unfinished house ghana", "stalled construction ghana", "finish building project ghana" | /lp/stalled-project |
| **G6 Residential Development** | Investors | "real estate development ghana", "build rental property ghana", "apartment development ghana", "invest in property development ghana" | /lp/investors |
| | Land | "land verification ghana", "ghana land search", "land due diligence ghana" | /land-feasibility |
| **G7 Brand** | Brand | [buildghana abroad], "buildghana" | / |

Start with exact + phrase only. Add broad match only in G1/G5 after tCPA bidding is stable, with strict negatives.

## Negative keywords (shared list "BGA – Core negatives")
`jobs, job, vacancy, vacancies, career, salary, hiring, recruitment, apprenticeship, course, courses, training, school, university, degree, pdf, ppt, thesis, project topics, assignment, free, cheap, wikipedia, materials price list, cement price, iron rod price, blocks price, rent, for rent, for sale, apartment for rent, house for sale, buy house, plot for sale, land for sale, airbnb, hotel, visa, embassy, minecraft, sims, game, lego, drawing, cartoon, nigeria, kenya, south africa, toilet, kitchen cabinets`
- *Note:* "for sale"/"land for sale" excluded because we don't broker. Revisit if a land-sourcing service is added.
- Funnel-crossing negatives: in G2/G3 add `unfinished, stalled` (route to G5).

## Responsive search ads (one RSA per ad group, ≥ 10 headlines)
**G1 headlines** (≤30 chars): Build Your Home in Ghana · Managed From Abroad · Stay in Control From the U.S. · Verified Before You Pay · Line-Item Budgets & Schedules · Independent Site Reporting · Start With a Feasibility Check · Land Checked Before You Build · Dated Photo & Video Reports · One Accountable Team · Request a Project Assessment · Written Scope. Fixed Fees.
**G1 descriptions** (≤90): Plan, budget and manage your Ghana home build from abroad with documented progress reports. · Land checks, complete drawings, line-item budgets and milestone payments — in the right order. · Start with a fixed-fee Feasibility Assessment. Free discovery call. Request yours today. · Independent oversight from a U.S.-led team working with Ghana-registered professionals.
**G5 headlines:** Stalled Build in Ghana? · Get the Facts Before Paying More · Independent Project Review · Cost to Complete, in Writing · Engineer-Reviewed Concerns · Recovery Options You Control · No Obligation to Use Us · Documented Site Condition · Request a Project Review · Finish Your Ghana Project
**G5 descriptions:** We document your unfinished building, estimate the cost to complete and give you a recovery plan. · Structural questions referred to a qualified Ghana-registered engineer. Report is yours to keep.
**G4 headlines:** Construction Oversight Ghana · Independent Owner's Rep · Inspections at Every Stage · Payment Verification · Reports With Dated Photos · We Work for You, Not the Builder
**G6 headlines:** Develop Rental Property in Ghana · Test Costs Before You Invest · Investor-Grade Reporting · Feasibility Consultation · Cost & Schedule Control
Pin "Build Your Home in Ghana" (or ad-group equivalent) to position 1 only if asset performance shows it's needed. Otherwise leave unpinned.

**Do not use:** "licensed in Ghana", "guaranteed", "#1", "best", review stars or prices you haven't approved.

## Assets (extensions)
- **Sitelinks:** Our Process · Owner's Representation · Stalled Project Review · Land Due Diligence · Sample Report (→ /our-process) · Book a Discovery Call
- **Callouts:** Written Scope First · Milestone Payments · Dated Photo Reports · Free Discovery Call · Fixed-Fee Assessments · U.S.-Led Team
- **Structured snippets (Services):** Feasibility, Design Coordination, Budgeting, Owner's Rep, Construction Mgmt, Project Rescue, Development
- **Lead form asset:** not at launch (keeps consent + dedup in our form).
- **Call asset:** only once a staffed U.S. number exists. Schedule to business hours.
- **Image assets:** illustration + sample-report crops (labelled).

## Conversion goals
Account default goal = **Lead – Website Form** until offline imports work. Then switch campaign goals to **Qualified Lead** (primary) with Lead as secondary, then **Paid Assessment** with value.

## Search term monitoring
- Week 1–4: review search terms **3× per week**. Add negatives aggressively. Promote converting terms to exact.
- Then weekly. Maintain a "watch" list (e.g. "cost" queries: tend to be research-stage, so route to /build-in-ghana with lower bids).
- Flag queries indicating location *in* Ghana + local builder intent. They may be poor fit for an overseas-owner offer.

## Budget recommendation (assumption, unverified)
Start **$40–70/day** total: G1 35% · G5 20% · G4 15% · G2/G3 15% · G6 10% · G7 5%. Expect volume-limited campaigns. Don't spread thinner than ~$10/day per campaign: consolidate if needed.
