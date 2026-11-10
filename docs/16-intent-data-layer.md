# 16 — Optional Intent-Based Acquisition Layer

**Not connected. No vendor data is accessed by this system.** This is an evaluation and integration design for DataMoon, AudienceLab, Eyeota, Lotame or similar providers. Treat any vendor claims as unverified until tested.

## When to consider it
Only after first-party funnels (doc 15) have known cost per qualified lead, so a vendor test has a benchmark.

## Vendor evaluation criteria
| Criterion | What to ask / verify |
|---|---|
| Data provenance | How is intent collected (bidstream, publisher co-ops, panels, search)? Documented consent chain? |
| Legal basis | CCPA/CPRA + state laws (U.S.), UK/EU GDPR (if expanding), Ghana Act 843 relevance; DPA available? |
| Sensitive-data controls | Written guarantee that segments do **not** use or infer race, ethnicity, national origin, religion, health, etc. |
| Housing-ad compatibility | Can segments be used on platforms under Housing special ad rules? (Often **no** for Meta Housing; check per platform.) |
| Segment fit | Relevant categories: home construction/building, residential real estate investing, custom home design, property development, home financing *research* (not credit status) |
| Country coverage | U.S. first; Canada, UK, EU coverage and scale per segment |
| Freshness | Signal recency (≤ 7–30 days for active-planning intent); refresh cadence |
| Activation | Native destinations (The Trade Desk, DV360, LinkedIn, Meta, Google Customer Match?), match rates |
| Measurement | Supports holdout/control groups and incrementality tests |
| Pricing | CPM uplift vs. flat fee; minimums; pilot terms |

## Acceptable audience categories (illustrative, subject to vendor availability)
- In-market: residential construction / custom home building
- Interest: architecture & home design, real-estate investing, property development
- B2B/professional: real-estate investors, small developers (where offered)

**Not acceptable:** ethnicity/heritage/"diaspora" segments, language-as-proxy, religion, immigration-related, financial distress, any "look-alike of Ghanaians" construct.

## Activation methodology
1. Pilot one vendor, one segment family, one channel (programmatic display/CTV via a DSP that supports segment activation), **outside** Meta Housing restrictions only where permitted.
2. Creative = Funnel A or C assets; landing = `/lp/*` with `utm_source={vendor}&utm_medium=programmatic`.
3. 10–20% holdout to measure incrementality.
4. 4–6 week test; success = cost per qualified lead within 1.5× of best first-party channel.

## Compliance review (before any spend)
- Counsel reviews vendor DPA and segment taxonomy.
- Document the review in a decision log.
- No contact-level data (emails/phones) purchased or uploaded from vendors. **No scraped or unauthorised contact lists, ever.**

## Secure data import (if a vendor provides account- or contact-level data in future)
- Transfer only via SFTP/S3 with encryption. No email attachments.
- Ingest to a separate store, never directly into GHL.
- Validate consent fields. Records without documented consent are discarded.
- Hash before any platform upload (SHA-256, normalised).

## Deduplication & attribution
- Vendor-sourced visits are attributed via UTMs (first-party capture already built).
- Leads remain deduplicated by submission id + GHL email/phone upsert.
- Report vendor performance as its own `utm_source` in the weekly sheet.

## CRM segmentation
Tag `src-intent-{vendor}` (set via GHL workflow when `utm_source` matches) → separate nurture branch if needed → compare tier mix vs. other sources.
