# Open questions and owner decisions (blueprint G1–G5)

Blocking for production go-live of the blueprint-v1 changes: none (all changes are additive and run with integrations off). Blocking for the listed features:

1. **Readiness Review fee** (G2): set `BASE_REVIEW_FEE_USD` / `BASE_REVIEW_FEE_GHS` (or the admin fee setting) and refund/cancellation terms.
2. **Payment provider** (G3): Stripe (USD card) and/or Paystack (GHS card + mobile money). Keys + webhook secrets, then set `READINESS_PAYMENTS_LIVE=true`. Live charging stays off until all three exist.
3. **Private document storage** (G3): S3 or Cloudflare R2 bucket (`DOCS_S3_*`). Until then uploads live in function `/tmp` and are not durable.
4. **Malware scanning** for uploads (`PROPERTY_SCAN_URL` hook exists, no scanner connected).
5. **GoHighLevel** (G3): sub-account, Private Integration token, pipeline/stage ids and custom field ids (new optional field `owner_profile` / `rr_owner_profile`).
6. **Legal reviewer / Ghanaian counsel** (G2/G3): named counsel for title checks; legal review of privacy policy (Ghana Data Protection Act 2012 (Act 843), UK/EU GDPR, U.S. state laws), terms, consent wording, and the property-introduction model (agency/brokerage licensing boundaries).
7. **Coverage** (G2): which regions/districts are actually served, before any location pages are created (blueprint forbids thin city pages).
8. **Credentials and claims** (G1/G2): proof for founder credentials, Ghana registration/classification and insurance; otherwise they stay hidden.
9. **Brand sign-off** (G1): the current forest/gold direction was never formally approved against three alternatives; logo is a placeholder mark. Final trading name ("BuildGhana Abroad" vs "BuildGhana").
10. **Admin MFA / SSO** (G3): admin uses bearer tokens + session cookies; MFA needs an identity provider (e.g. Clerk/Auth0/Supabase Auth) — owner decision and possibly a paid plan.
11. **Analytics/ads** (G5): GTM/GA4/Meta/Google Ads ids, consent banner wording review. DataMoon stays mock until a contract, tier and permitted-use review exist; Ghana domestic outreach uses first-party/local channels only.
12. **Postgres** (G3): migrations are written (0004) but KV (Upstash) is still the store; Supabase/Postgres provisioning is an owner decision.
13. **Custom domain** (G5): none yet; production stays on `buildghana-site.vercel.app`.
