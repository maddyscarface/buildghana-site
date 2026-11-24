# BuildGhana Phase 5: Transparency compliance map

Branch `phase5-transparency` (based on `blueprint-v1`). Staging: https://buildghana-transparency.vercel.app (Vercel preview `dpl_82BCdjgzsx3o2xiPTFNWbu6z5R5F`, noindex). Production (`dpl_6qPkrBxh…`) has not been touched and nothing has been merged to main. Status labels: **DONE** = built and tested; **DEMO** = works only with the synthetic in-memory adapter; **BLOCKED** = needs an owner decision or credentials.

## Spec 06 §A sign-off checklist
| # | Requirement | Status | Evidence |
|---|---|---|---|
| 1 | Homepage separates planned capabilities from live ones | PARTIAL | Homepage H1 is unchanged; 3 hero variants are in `docs/23b-transparency-hero-variants.md`. /project-transparency states the pilot status. **Existing homepage claims to review (not edited):** FAQ "dated, geo-tagged photos"; "Payments are tied to milestones that we have documented and verified"; commitments "payments released against verified milestones"; DashboardSection "Payment verification before release", "Hold-point inspection records". These describe features that are not yet live. |
| 2 | Ghana and diaspora audiences; time zones | DONE | Dates are rendered in each user's own time zone with a zone label (owner Europe/London, co-investor America/Toronto, site Africa/Accra). Phone numbers are not collected in the portal. |
| 3 | Invite/login and MFA for privileged roles | BLOCKED | The demo uses a shared access code, a persona picker and a signed 8 h HttpOnly SameSite=Strict cookie. Step-up is simulated by typing the project code. Real invites, email verification and MFA need an IdP. |
| 4 | Every API and storage operation enforces tenant, project and role | DONE | Service-layer `projectCtx` plus `can()` on every route; unknown and forbidden both return 404; denials are audited. Tests: IDOR cross-project and cross-tenant (pages, API, media, export), CSRF origin check, anonymous and wrong-role writes. |
| 5 | A supervisor cannot review their own work; no self-inspection | DONE | `reviewReport` and `recordInspection` reject self-review and self-inspection (unit tests). Independence is derived from the inspector's organisation. |
| 6 | Dated evidence, originals, revisions and server receipt time | DONE | Revisions are append-only and store device capture time (labelled device-reported), server receipt time, SHA-256 and attestation. |
| 7 | Clients see the review state, never a false "verified" | DONE | Evidence states Reported / Office reviewed / Inspected / Disputed. "Inspected" requires a non-fail inspection covering the report. Internal reviews are labelled as not independent. |
| 8 | Gallery only after authorisation; no public buckets | DONE (DEMO) | Media is served only through `/api/portal/media/:id` with a 5-minute signed URL, a session re-check, nosniff and CSP sandbox. The store is in-memory; R2/S3 is BLOCKED. |
| 9 | Baseline vs forecast schedule and blockers | DONE | Schedule bars, variance in days, blockers and a change history (`schedule_revisions`). |
| 10 | Change orders and decisions are audit-logged | DONE | Decisions are tied to a payload version, confirmed with the project code and immutable once approved; there is an audit event for each action. |
| 11 | Requested, approved and reconciled amounts kept separate; no automated disbursement | DONE | Four ledger buckets that are never summed; only RECONCILED is shown as "Paid"; a disbursement needs an evidence document. No payment provider is connected. |
| 12 | Reports and drawings private and noindex; no pixel on the portal | DONE | Headers and meta noindex, `private, no-store`, robots disallow. `TrackingGate` strips GA4, GTM, Meta, marketing tags and consent on /portal, /field and /office. e2e confirms zero third-party requests on portal pages. |
| 13 | Offline and poor-connection recovery; upload retries on phones | DONE | 256 KB chunks with retry and backoff, resume from the server's `receivedBytes`, a simulated-drop toggle, and localStorage plus server autosave (e2e @390). |
| 14 | No documents, amounts or media sent to GHL, DataMoon, GA4 or Meta | DONE | The static test scans `src/lib/transparency` for ghl/kv/datamoon/analytics/fetch imports; the outbox text is neutral. There is no GHL mapping. |
| 15 | Ghana privacy, worker photo consent, contractor independence | BLOCKED (owner/legal) | Crew is recorded as a count only. A safe-photography checklist and an "avoid faces and children" rule are in place. The legal review has not been done. |
| 16 | Owner approves notification texts and cadence | BLOCKED | Notifications are logged in the outbox and never sent. |
| 17 | Rejected photos and revised reports keep earlier versions | DONE | A correction copies the last revision into the draft; the earlier revision stays visible ("Earlier revisions (preserved)"). |
| 18 | Staging demo uses synthetic records only | DONE | "Demo Accra Villa" (DEMO-ACC-01): 6 phases, 12 seeded reports (3 corrected), 2 inspections (1 failed), ms-3 delayed +21 days, owner decision dr-2/CO-002, budget change CO-001. Every screen carries a "Synthetic demo" banner; evidence tiles are SVG diagrams labelled "not a site photograph". |

## Spec 06 §C demo script
Steps 1–12 are automated in `tests/e2e-transparency/e2e.mjs`: **62/62 pass on a single-instance server** (local `next start`). **On Vercel staging**, seeded browsing passes for every route, persona and viewport (sweep 72/72). The stateful script (field submit followed by the office seeing it) fails there because the in-memory store is per serverless instance, so writes land on different instances. A shared durable store (Supabase) is required before staff can demo the stateful flow live. This is a known limitation and the reason Postgres is first on the needs list.

## Hard rules
No production deploy · no merge to main · no paid plans or live payment keys · DataMoon still mocked · no invented reviews, inspectors, credentials, partners or photos · no emails sent · secrets in `/workspace/buildghana-update/secrets/transparency-demo.env` (chmod 600), passed per deployment and never committed (checked with git grep) · the staging deploy overrides `UPSTASH_REDIS_REST_URL`/`TOKEN` to empty, so this alias **cannot write to the shared production Upstash** · other sites untouched · blueprint-v1 alias untouched.

## Pre-existing issue (not caused by Phase 5)
`scripts/e2e-smoke.mjs` times out at the budget step on **blueprint-v1 as well** (checked on a clean worktree), so the script is out of date with the current lead form. The responsive suite passes (17 pages × 11 viewports).

## Needs (credentials and decisions)
Supabase/Postgres (apply `db/migrations/0005_transparency.up.sql`, validated locally with PGlite) · R2/S3 private bucket · an IdP with invites and MFA · a malware scanner · an email/SMS/WhatsApp provider plus opt-ins · real inspector organisations and verified credentials · GHL field ids (only if CRM signals are wanted) · answers to spec 06 §B Q1–10.
