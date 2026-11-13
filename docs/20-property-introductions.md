# 20 — Private property introductions (Phase 3)

Admin-assisted, off-market seller/buyer inquiries. **Not** brokerage, escrow, a title guarantee or a public catalogue.

## Public routes
| Route | Purpose | Indexing |
|---|---|---|
| `/property` | Hub: sell / buy / how it works | indexable (production) |
| `/property/sell` | Seller inquiry (4 steps + consent) → optional private uploads | indexable |
| `/property/buy` | Buyer requirements (3 steps + consent) | indexable |
| `/property/how-it-works` | Process, due diligence, limits, withdrawal/deletion/abuse form | indexable |
| `/property/opportunities` | `waitlist` mode (default): no inventory. `listings` mode: only seller-authorised listings via `lib/property/public.ts`; page noindex if any listing lacks index consent | indexable unless above |
| `/property/thank-you` | Confirmation with opaque reference only | noindex + `X-Robots-Tag` + no-store |

## APIs
Public (origin check, rate limit, Turnstile when configured, honeypot, 4-s minimum fill, idempotent `submission_id`):
`POST /api/property/seller`, `POST /api/property/buyer`, `POST /api/property/{id}/uploads` (+ `/{assetId}` confirm; HMAC token, 72-h window, magic-byte check, optional scan), `POST /api/property/requests`.

Staff (`Authorization: Bearer <token>`; 404 when `ADMIN_TOKEN` unset, 401 otherwise, rate-limited): `/api/admin/property`, `/api/admin/property/{seller|buyer}/{id}`, `/api/admin/property/matches/{id}`, `/api/admin/property/assets/{id}` (5-min signed link, audited), `/api/admin/property/requests/{id}`. UI: `/admin/property` (linked from `/admin/readiness`).

## Roles
| | admin | reviewer | legal_reviewer |
|---|---|---|---|
| Contact details | ✓ | ✓ | — |
| GhanaPost GPS / directions | ✓ | — | ✓ |
| Documents | ✓ | — | ✓ |
| Run matching / review matches | ✓ | ✓ | — |
| Legal state, compliance checklist | ✓ | — | ✓ |
| Record/revoke seller authorisation, approve introduction, delete data | ✓ | — | — |

## Lifecycle
`submitted → contact_verified → documentation_requested → counsel_review_pending → reviewed → approved_for_introduction → matched → introduction_authorized → closed` (+ `lost`, `withdrawn`). Legal review is a separate track: `not_started, documents_requested, with_counsel, counsel_cleared_with_qualifications, counsel_flagged, not_required_yet`.

Introduction approval (server-enforced): admin · match reviewed · both records active and not duplicates · current unrevoked seller authorisation to share · seller `approved_for_introduction`/`matched` · buyer reviewed · counsel has not flagged · match still passes hard filters. Approval creates an `introductions` row; **no message is sent automatically** — staff introduce personally.

Withdrawal closes open matches and revokes authorisation. Deletion purges files, scrubs contact/location/notes, keeps an audit tombstone.

## Matching v1 (deterministic)
Hard filters: region, property type, asking ≤ 110 % of buyer max (GHS↔USD via the owner-entered Readiness FX rate, timestamped on each match), size range (approximate unit conversion; 1 plot ≈ 650 m² — owner to confirm). Score only ranks for a human; blockers list counsel status, encumbrance, buyer eligibility. Nothing implies availability or title.

## Privacy
Never in public HTML, JSON-LD, sitemap, llms.txt, analytics, pixels or CRM: GhanaPost GPS, directions, documents, seller prices. Client tracking passes through `safePropertyParams()`; Meta CAPI only with ad consent (`content_category` only). Drafts in localStorage exclude private fields. Retention: `PROPERTY_RETENTION_DAYS` (default 365) via admin "Run retention purge".

## Production prerequisites (owner)
Upstash KV (forms 503 without it in production), S3/R2 document storage, optional scan hook, GHL property pipelines + `pp_*` custom fields, counsel sign-off on the compliance checklist (Real Estate Agency Act 2020 (Act 1047) licensing, Data Protection Act 2012 (Act 843) registration, fees/commission model, non-citizen tenure wording) before charging anything.
