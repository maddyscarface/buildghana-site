# 02 — Sitemap & Funnel Architecture

## Sitemap (all routes built)
| Route | Purpose | Index | Primary CTA |
|---|---|---|---|
| `/` | Home: positioning, services, process, reporting, founder, FAQ, form | ✓ | Request a Project Assessment |
| `/build-in-ghana` | New-home hub (Funnel A organic) | ✓ | Request a Project Assessment |
| `/land-feasibility` | Service 1 | ✓ | Request a Land Assessment |
| `/design-coordination` | Service 2 *(added: needed for the 7-service model)* | ✓ | Request a Project Assessment |
| `/preconstruction-budgeting` | Service 3 *(added)* | ✓ | Request a Project Assessment |
| `/owners-representation` | Service 4 | ✓ | Request a Project Assessment |
| `/construction-management-ghana` | Service 5 | ✓ | Request a Project Assessment |
| `/ghana-project-rescue` | Service 6 (Funnel B organic) | ✓ | Request a Project Review |
| `/ghana-property-development` | Service 7 (Funnel C organic) | ✓ | Request a Feasibility Consultation |
| `/our-process` | Process + controls | ✓ | Assessment |
| `/about` | Founder, credentials, values | ✓ | Assessment |
| `/projects` | Verified case-study placeholders | ✓ | Assessment |
| `/resources` + `/resources/[slug]` | Guides (3 launch articles) | ✓ | Contextual |
| `/assessment` | Standalone multi-step form (`?funnel=` and `?service=` prefill) | ✓ | Submit |
| `/book-consultation` | GHL calendar embed | ✓ | Book |
| `/thank-you` | Post-lead / post-booking confirmation | ✗ noindex | Book call |
| `/lp/new-home` | **Funnel A** paid landing page | ✗ noindex | Check My Project Fit |
| `/lp/stalled-project` | **Funnel B** paid landing page | ✗ noindex | Get My Project Reviewed |
| `/lp/investors` | **Funnel C** paid landing page | ✗ noindex | Book a Feasibility Consultation |
| `/privacy`, `/terms` | Drafts flagged for legal review | ✓ | — |
| `/api/lead`, `/api/crm-webhook`, `/api/health` | Server routes | — | — |

## Funnels

```
A  New Home       Ad → /lp/new-home → 4-step form (funnel=new_home) → /thank-you → Discovery call (GHL calendar)
                  → Paid Feasibility Assessment → Construction Management Proposal
B  Stalled        Ad → /lp/stalled-project → form (funnel=rescue, stage=stalled prefilled) → /thank-you → Discovery call
                  → Paid Project Review → Recovery Scope
C  Investors      Ad → /lp/investors → form (funnel=investor, service=development) → /thank-you → Feasibility Consultation (paid)
                  → Development Proposal
```

| | A: New Home | B: Stalled | C: Investors |
|---|---|---|---|
| Headline | Build the home you've planned for, without managing it by WhatsApp. | Your build in Ghana stopped. Get the facts before you send more money. | Develop income property in Ghana with the controls you'd expect at home. |
| Visual | Residence illustration (→ real project photos) | Same, later: documented stalled-site photos (with permission) | Sample reporting dashboard |
| Offer | Feasibility Assessment (fixed fee) | Project Review (fixed fee) | Feasibility Consultation (fixed fee, creditable) |
| Top objections | Cost vs local builder · I have a builder · land problems · travel | Already lost money · blame · obligation · salvageable? | Returns projections · deal sourcing · minimum size |
| GHL pipeline entry | New Lead (or Priority) | New Lead (or Priority) | New Lead (or Priority) |
| Nurture | NH-1..6 | RS-1..5 | IV-1..5 (see doc 08) |

Fees are deliberately "quoted in writing". Set real numbers in `src/content/funnels.ts → FEES` once approved.

## Conversion events per funnel step
`page_view → view_service → form_start → form_step (2..4) → generate_lead → schedule → qualified_lead → purchase (paid assessment) → close_convert_lead (contract)`. See doc 09.
