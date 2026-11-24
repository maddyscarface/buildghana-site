# Blueprint v1.0 alignment (Universal Business Launch OS) — branch `blueprint-v1`

Scope: BuildGhana site update only (vertical pack C). Not the generic multi-tenant platform. Staging only.
Gap analysis: kept outside the repo (box: /workspace/buildghana-update/gap-analysis.md). Artifacts: `docs/blueprint/`.

## What changed
**Audience framing (§05.C: diaspora, returning residents, Ghana residents, international investors; not U.S.-only)**
- Home "Who we work with" now shows the four buyer types (was three: residents, diaspora+returnees, sellers/buyers); property introductions remain linked below the grid.
- New `/who-we-serve` page: one section per buyer type (needs, how we work, CTA), visible FAQ mirrored in FAQPage JSON-LD, in sitemap and footer.
- Organization JSON-LD audiences split into residents, diaspora, returning residents and international investors. llms.txt states the audience and the Readiness Review outputs.
- "Reply within one business day (U.S. Eastern)" → time-zone neutral wording (assessment, thank-you, lead section).
- Optional `owner_profile` select on the lead form and the Readiness intake (step 1). Stored with the lead/case, shown in the readiness admin, mapped to GHL custom field `owner_profile` / `rr_owner_profile` when an id is configured. Never used for scoring, eligibility or audiences.

**Readiness outputs wording (§05.C)**: cost range copy now says provisional, GHS and USD, with the exchange rate, its source and the date checked (report already printed rate/source/date).

**Privacy and analytics (§02.5, §03.5 "zero sensitive data in URL query strings and analytics")**
- Fixed: the case page URL carries the private case token (`?t=`) and `page_view` sent `pathname + search`, so a configured GA4/Meta/GTM would have received the token and case id. Now:
  - `src/lib/client/safe-path.ts` keeps only UTM/click-id params and redacts `/case/<id>`; `RouteTracker` uses it; gtag `config` and GTM `set` get a sanitized `page_location`.
  - The case page moves the token to `sessionStorage` for that tab and strips it from the address bar (`history.replaceState`).

**Payments kill-switch (§04.7, hard rule: payments behind a disabled flag)**: live Stripe/Paystack needs provider keys **and** `READINESS_PAYMENTS_LIVE=true`. Health reports `readiness.payments.live_enabled`. Sandbox mock unchanged on preview.

**Business manifest (§02.1, §01.7)**: `src/config/manifest.ts` (Zod schema, facts with status/use policy, features, readiness intake/outputs) + `integrationStatuses()` (not_configured / mock_verified / connected from env) + `manifestViolations()`. `/api/health` → `blueprint`. Generated `docs/blueprint/*.json|csv`.

**Accessibility (§01.5 WCAG 2.2 AA)**: axe fixes — header logo accessible name now matches visible text; Readiness progress labels were forest-on-forest (invisible current step) and low-contrast; property form step labels contrast.

## Tests
`tests/blueprint.test.ts` (15): manifest schema/invariants and JSON sync, integration status derivation, safe paths + inline JS parity, payment kill-switch, owner_profile validation + GHL mapping, audience content rules, generated CSV sync.
