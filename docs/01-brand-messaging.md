# 01 — Brand Identity & Messaging System

## Positioning
**Build in Ghana. Stay in Control From Abroad.**

BuildGhana Abroad is a U.S.-led construction management and owner's-representation firm for people who live abroad and are building homes or developing property in Ghana. We bring U.S. project discipline (written scopes, line-item budgets, milestone-verified payments, hold-point inspections and structured reporting) to projects that are delivered by Ghana-registered entities and professionals.

**Category:** Construction management & independent owner's representation for diaspora/overseas owners.
**Enemy:** Building on faith: voice-note management, unverified photos, money sent before progress.
**Promise:** You will always know what has been built, what it cost and what happens next.
**Proof (not claims):** Process, documents, sample reporting and verified credentials. No testimonials, metrics or case studies until they actually exist.

## Audiences
| Segment | Trigger | Primary fear | Offer |
|---|---|---|---|
| A. New home builders | Land acquired or about to be, ready to start | Losing money to an unsupervised build | Feasibility Assessment |
| B. Stalled projects | Build stopped or trust broken | Throwing good money after bad | Project Review |
| C. Diaspora investors | Rental/multifamily thesis | Cost overruns eroding returns | Feasibility Consultation |
| D. Owners with a builder | Construction underway | Paying for work they can't verify | Owner's Representation |

Targeting and scoring use **project facts only** (budget, land, stage, timeline, service). Never ethnicity, national origin or other protected traits.

## Voice
- **Calm authority.** We have seen what goes wrong and say it plainly, without fear-selling.
- **Evidence over adjectives.** "Dated, geo-tagged photos" beats "world-class transparency."
- **Respectful of the reader's intelligence and money.** These are professionals planning six-figure projects.
- **Honest about limits.** We say what we don't do: legal opinions, land brokering, investment advice, and Ghana construction under U.S. licences.

| Say | Avoid |
|---|---|
| "Verified before you pay" | "Guaranteed on time and on budget" |
| "Ghana-registered professionals" | "Licensed in Ghana" (until verified) |
| "Fixed fee, quoted before you commit" | "Limited spots!", countdowns |
| "Sample report · illustrative data" | Fake dashboards presented as real |

## Message hierarchy
1. **Headline:** Build in Ghana. Stay in control from abroad.
2. **Support:** Professional construction management, independent project oversight and transparent coordination for overseas property owners.
3. **Three benefits:** Independent visibility · Money tied to progress · One accountable team.
4. **Proof:** Process → sample reporting → credentials (verified) → case studies (when real).
5. **CTA:** Request a Project Assessment (primary) · Book a Consultation (secondary) · WhatsApp (optional).

## Visual system
| Token | Hex | Use |
|---|---|---|
| Deep forest | `#12291F` | Primary background, buttons, header |
| Secondary green | `#203B2C` | Alternate dark sections, cards on dark |
| Warm ivory | `#F7F3EB` | Page background |
| Muted gold | `#D6AA64` | Primary CTA, accents, eyebrows on dark |
| Dark text | `#18241C` | Body text |
| Gold (text-safe) | `#B98C45` | Eyebrows on light backgrounds |

- **Display type:** Newsreader (editorial serif, self-hosted via Fontsource). Italic gold for emphasis.
- **Body type:** Manrope (clean, legible sans).
- **Shapes:** 20px card radius, pill buttons, fine architectural grid lines in hero, dashed survey-line motif.
- **Imagery:** Real Ghana project photography (when available) > original illustration > clearly labelled placeholder. Never stock photos presented as our projects.
- **Logo:** Roof chevron in gold over a house outline in an ivory or forest tile + "BuildGhana *Abroad*" wordmark. See `src/components/ui/Icons.tsx`.

## Alternative names & domains (availability NOT verified)
Check trademark (USPTO and the Ghana Registrar-General's Department) and domain availability before committing.
| Name | Domain ideas | Note |
|---|---|---|
| BuildGhana Abroad | buildghanaabroad.com | Current working brand. Clear, SEO-friendly |
| Homeward Build Co. | homewardbuild.com | Emotional, diaspora-neutral, expands to other countries |
| Owner's Eye Ghana | ownerseyeghana.com | Leads with oversight |
| Keystone Ghana Projects | keystoneghana.com | Premium, construction-native |
| Accra Bridge Construction Management | accrabridge.com | Geography-led; narrower |
| Sankofa Build Partners | sankofabuild.com | Cultural resonance; check existing marks |

## Compliance guardrails (copy)
- U.S. licences never imply authority to build in Ghana (footer + service disclaimers enforce this).
- Every credential lives in `src/config/site.ts` with `verified: false` until checked. Unverified items render as visible "to confirm before launch" markers.
- No testimonials, metrics, office addresses or case studies until real and documented.
