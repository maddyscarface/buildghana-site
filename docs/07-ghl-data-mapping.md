# 07 — GoHighLevel Data Mapping

**Status: adapter built, NOT connected.** Nothing is sent to GHL until `GHL_PRIVATE_TOKEN` and `GHL_LOCATION_ID` are set. Then verify using doc 13 before you call it live.

Adapter: `src/lib/server/ghl.ts` (LeadConnector API v2, `Version: 2021-07-28`).
Calls made per lead, in order:
1. `POST /contacts/upsert`: standard fields, tags, custom fields
2. `POST /contacts/{id}/notes`: full human-readable submission + score breakdown
3. `POST /opportunities/`: in `GHL_PIPELINE_ID`, at `GHL_STAGE_PRIORITY` (priority tier) or `GHL_STAGE_NEW_LEAD`

Before go-live, confirm these endpoints and payload shapes against your account's current API docs (highlevel.stoplight.io). Field-level behaviour can change.

## 1. Create a Private Integration token
GHL → Settings → Private Integrations → New. Scopes: `contacts.write`, `contacts.readonly`, `opportunities.write`, `opportunities.readonly`, `locations/customFields.readonly`. Store it as `GHL_PRIVATE_TOKEN` in Vercel (Production + Preview, **not** exposed to the browser).

## 2. Standard field mapping
| Website field | GHL standard field | Notes |
|---|---|---|
| `first_name` | firstName | |
| `last_name` | lastName | |
| `email` | email | lower-cased, trimmed |
| `phone` | phone | as entered, with country code. GHL normalises |
| `current_country` (ISO-2) | country | only when 2-letter code |
| funnel | source | `Website — new_home` etc. |

## 3. Custom fields to create (Settings → Custom Fields, object: Contact)
Create a folder **"Ghana Project"** and **"Attribution"**. After creating each, copy its ID into the `GHL_CUSTOM_FIELD_IDS` JSON env var, keyed by the website key below. Fields without an ID are skipped, never guessed.

| Website key | GHL field name | Type | Folder |
|---|---|---|---|
| `lead_id` | Website Lead ID | Single line | Ghana Project |
| `funnel` | Funnel | Dropdown: new_home, rescue, investor, general | Ghana Project |
| `current_country` | Current Country | Single line | Ghana Project |
| `ghana_region` | Ghana Region | Dropdown (16 regions + Not decided) | Ghana Project |
| `ghana_city` | Ghana City / Area | Single line | Ghana Project |
| `land_status` | Land Status | Single line (label text) | Ghana Project |
| `project_stage` | Project Stage | Single line | Ghana Project |
| `construction_type` | Construction Type | Single line | Ghana Project |
| `budget_range` | Budget Range (USD) | Single line | Ghana Project |
| `start_timeline` | Expected Start | Single line | Ghana Project |
| `services_requested` | Services Requested | Multi-line | Ghana Project |
| `project_description` | Project Description | Multi-line | Ghana Project |
| `documents_available` | Documents Available | Multi-line | Ghana Project |
| `whatsapp_preferred` | WhatsApp on Phone | Single line (Yes/No) | Ghana Project |
| `lead_score` | Lead Score (Website) | Number | Ghana Project |
| `lead_tier` | Lead Tier | Dropdown: priority, standard, nurture | Ghana Project |
| `consent_marketing` | Consent: Email Marketing | Single line (Yes/No) | Ghana Project |
| `consent_sms_whatsapp` | Consent: SMS/WhatsApp | Single line (Yes/No) | Ghana Project |
| `consent_timestamp` | Consent Timestamp | Single line (ISO) | Ghana Project |
| `utm_source` … `utm_content` | UTM Source/Medium/Campaign/Term/Content | Single line ×5 | Attribution |
| `gclid` / `gbraid` / `wbraid` | GCLID / GBRAID / WBRAID | Single line ×3 | Attribution |
| `fbclid` / `fbc` / `fbp` | FBCLID / FBC / FBP | Single line ×3 | Attribution |
| `landing_page` / `referrer` | Landing Page / Referrer | Single line ×2 | Attribution |
| `first_touch_source` / `first_touch_campaign` | First-Touch Source / Campaign | Single line ×2 | Attribution |

Example env value:
```json
{"lead_id":"aBc123","funnel":"dEf456","ghana_region":"gHi789","lead_score":"...","gclid":"..."}
```
Get IDs via GHL UI (field settings) or `GET /locations/{locationId}/customFields`.

Labels (not raw codes) are sent for dropdown-like answers so the sales team reads them directly. Raw codes are preserved in website storage and in tags.

### Opportunity custom fields (create on Opportunity object, filled by staff/workflows)
Assessment Type · Assessment Fee · Assessment Paid Date · Proposal Value · Contract Value · Contract Signed Date · Lost Reason.

## 4. Tags written by the website
`source-website` · `funnel-{new_home|rescue|investor|general}` · `score-{priority|standard|nurture}` · `stage-{planning|land_only|design|permits|construction_active|stalled}` · `svc-{service}` (one per service) · `consent-email-marketing` · `consent-sms-whatsapp` · `src-google-ads` · `src-meta-ads`.

## 5. Pipeline: "Ghana Client Acquisition"
| # | Stage | Entered by |
|---|---|---|
| 1 | New Lead | Website (standard/nurture) |
| 2 | Priority Lead | Website (priority) |
| 3 | Contacted | Sales |
| 4 | Discovery Booked | Calendar workflow |
| 5 | Discovery Completed | Sales |
| 6 | Qualified | Sales → fires `qualified` webhook |
| 7 | Assessment Proposed | Sales |
| 8 | Assessment Paid | Payment workflow → fires `assessment_paid` |
| 9 | Assessment Delivered | Ops |
| 10 | Proposal Sent | Sales |
| 11 | Won: Contract Signed | Sales → fires `contract_signed` |
| 12 | Lost / Nurture | Sales (Lost Reason required) |

Copy the IDs of stages 1 and 2 into `GHL_STAGE_NEW_LEAD` and `GHL_STAGE_PRIORITY`.

## 6. Failure handling
If GHL is down or rejects a request, the lead is **still stored** (Upstash) and its ID is pushed to the `leads:ghl_retry` list. Replay manually (see doc 14 runbook). The user always sees success if storage succeeded.

## GHL-native alternative
If you'd rather run the funnels inside GHL Funnels: rebuild `/lp/*` pages with the same copy (`src/content/funnels.ts`) in GHL, use a GHL Survey with the same option values (`src/lib/lead/options.ts`), and implement scoring as GHL workflow "Add to Score" steps mirroring `src/config/lead-scoring.json`. You lose server-side idempotency and CAPI dedup control. Recommended only as a fallback.
