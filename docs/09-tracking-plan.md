# 09 — Analytics & Tracking Plan

**Status: implemented in code, not verified.** No tag has fired against a live GA4 property, Pixel or Ads account. Use doc 13 to verify.

## Architecture
```
Browser ── dataLayer (src/lib/client/analytics.ts) ──► GTM ──► GA4 · Google Ads · Meta Pixel
   │                                                           (Consent Mode v2 gates all of them)
   └─ POST /api/lead ──► Meta CAPI "Lead" (same event_id) ──► dedup with Pixel
GHL workflows ──► /api/crm-webhook ──► Meta CAPI (Schedule / QualifiedLead / Purchase) + GA4 Measurement Protocol
GHL / Ads UI ──► Google Ads offline conversion import (gclid / gbraid / wbraid) for qualified, paid, signed
```

## Event taxonomy
| Event (dataLayer) | When | Key params | GA4 | Google Ads | Meta |
|---|---|---|---|---|---|
| `page_view` | every route change | page_path, page_title | page_view | — | PageView |
| `view_service` | service or LP view | service, funnel | view_item (or custom) | — | ViewContent |
| `form_start` | first interaction with form | form_id, funnel | form_start | — | — (custom optional) |
| `form_step` | each step advance | step, step_name | form_step | — | — |
| `form_abandon` | tab hidden after start, before submit | last_step | form_abandon | — | — |
| `generate_lead` | **server-confirmed** submit | event_id = transaction_id = lead id, lead_tier, funnel, user_data | generate_lead (**key event**) | **Lead – Website Form** (primary) | **Lead** (browser + CAPI, dedup on event_id) |
| `schedule` | thank-you?type=booking (once per appointment) | appointment_id | schedule (key event) | Discovery Booked (secondary→primary later) | **Schedule** (browser + CAPI) |
| `qualified_lead` | CRM stage Qualified | lead_id | qualified_lead (MP) | Qualified Lead (offline import) | QualifiedLead (CAPI custom) |
| `purchase` | assessment paid | value, currency, transaction_id | purchase (MP) | Paid Assessment (offline import, value) | Purchase (CAPI) |
| `close_convert_lead` | contract signed | value | close_convert_lead (MP) | Contract Signed (offline import, value) | Purchase (CAPI, stage=contract_signed) |
| `whatsapp_click`, `cta_click` | clicks | location | custom | — | Contact (optional) |

## Deduplication rules
1. **One lead id per form instance.** `submission_id` (UUID) is created when the form mounts and reused on retries, so the server stores, syncs and sends CAPI once (`lead:lock:{id}` in Redis, 7 days).
2. **Browser fires `generate_lead` only after the server returns ok**, once per lead id (`localStorage bga_fired:lead:{id}`). The thank-you page does **not** fire a lead conversion, so a reload can't double-count.
3. **Meta:** Pixel Lead (GTM) sends `eventID = {{DLV - event_id}}`; CAPI Lead sends `event_id = leadId`. Meta dedupes within 48h.
4. **Google Ads:** conversion tag sends `transaction_id = lead id`, so Ads drops duplicates.
5. **GA4:** guarded client-side by rule 2 (GA4 has no lead dedup).
6. **CRM events:** `event_id = {lead_id}:{event}` plus a Redis lock, so GHL retries are ignored.

## GTM container build
**Variables (Data Layer):** `DLV - event_id`, `DLV - transaction_id`, `DLV - funnel`, `DLV - lead_tier`, `DLV - service`, `DLV - user_data` · **User-Provided Data** variable: Code → `{{DLV - user_data}}` (email, phone_number, address.first_name/last_name).
**Triggers (Custom Event):** `page_view`, `view_service`, `form_start`, `form_step`, `form_abandon`, `generate_lead`, `schedule`, `whatsapp_click`.

| Tag | Type | Trigger | Settings |
|---|---|---|---|
| GA4 Config | Google Tag (G-XXXX) | Initialization – All Pages | `send_page_view=false` (SPA, we send our own) |
| GA4 – page_view | GA4 Event | CE page_view | page_location, page_title |
| GA4 – events | GA4 Event `{{Event}}` | CE form_start, form_step, form_abandon, view_service, whatsapp_click | params passthrough |
| GA4 – generate_lead | GA4 Event | CE generate_lead | lead_tier, funnel, transaction_id; user_data = UPD variable |
| GA4 – schedule | GA4 Event | CE schedule | |
| Google Ads – Conversion Linker | Linker | All Pages | |
| Google Ads – Lead | Ads Conversion | CE generate_lead | Transaction ID = `{{DLV - transaction_id}}`; **Include user-provided data** = UPD variable (enhanced conversions) |
| Google Ads – Discovery Booked | Ads Conversion | CE schedule | Transaction ID = appointment id |
| Meta – Base Pixel | Custom HTML / template | Initialization (consent: ad_storage) | `fbq('init', PIXEL)`; `fbq('track','PageView')` on CE page_view |
| Meta – Lead | template | CE generate_lead | `fbq('track','Lead',{content_category:funnel},{eventID:{{DLV - event_id}}})` |
| Meta – Schedule | template | CE schedule | eventID = `{{DLV - event_id}}` |
| Meta – ViewContent | template | CE view_service | |

Set **Consent Settings** on each tag: GA4 needs `analytics_storage`; Ads/Meta need `ad_storage` (+ `ad_user_data` for enhanced conversions). Use Advanced Consent Mode (default consent set in `Analytics.tsx` before GTM loads).

## Enhanced conversions for leads (Google Ads)
1. Ads → Goals → Settings → Enhanced conversions for leads → ON, method **Google Tag Manager**.
2. The `Google Ads – Lead` tag includes user-provided data (email/phone) from the dataLayer. Google hashes them.
3. Offline stages (Qualified, Paid Assessment, Contract Signed): create **Import** conversion actions ("Conversions from clicks"/leads). Upload from GHL via its Google Ads integration if available on your plan, or a scheduled CSV/Sheets upload with columns: `Google Click ID` (or GBRAID/WBRAID), or hashed email/phone for EC-for-leads matching, `Conversion Name`, `Conversion Time`, `Conversion Value`, `Currency`. Click IDs are stored on the contact (Attribution fields).
4. Primary vs secondary: start with Lead = primary. After ~30 Qualified per month, switch bidding primary to Qualified / Paid Assessment (doc 15).

## Meta Conversions API
- Lead: sent from `/api/lead` with hashed em/ph/fn/ln/country/external_id, plus client IP, UA, fbc, fbp.
- Schedule / QualifiedLead / Purchase: from `/api/crm-webhook`, `action_source=system_generated`.
- Set **Events Manager → Dataset → Conversion leads optimization** later if desired (requires CRM events). "QualifiedLead" is a custom event: create a custom conversion if you want to optimise on it.
- Test with `META_TEST_EVENT_CODE`, then remove it.

## First-party attribution
`src/lib/client/attribution.ts` captures UTM params, gclid, gbraid, wbraid and fbclid (builds `fbc`), reads `_fbp`, landing page and referrer. Last-touch is kept 90 days and first-touch is permanent, both in localStorage. Everything is sent with the lead → stored → copied to GHL Attribution fields.

**UTM convention:** `utm_source={meta|google}&utm_medium={paid_social|cpc}&utm_campaign={funnel}_{objective}_{yyyymm}&utm_content={creative_id}&utm_term={keyword|audience}`.

## Privacy & consent
- Banner: Accept all / Reject non-essential / Customise. Stored in `bga_consent`, reopenable from the footer.
- `NEXT_PUBLIC_CONSENT_DEFAULT=denied` (recommended; required posture for UK/EU visitors once you expand there).
- `ads_data_redaction` + `url_passthrough` on.
- Server CAPI respects lead's submission as a direct business interaction. Have counsel confirm your consent text covers server-side conversion sharing for each market.

## Validation guide
**GA4 DebugView:** install Tag Assistant / enable GTM Preview → Admin → DebugView → walk the funnel → confirm `page_view` (once per route), `form_start` once, `form_step` ×3, `generate_lead` once with `transaction_id`, then `schedule` after booking. Mark `generate_lead`, `schedule`, `qualified_lead`, `purchase` as Key events.
**Google Tag Assistant (tagassistant.google.com):** confirm Conversion Linker, Ads Lead tag fires once on `generate_lead`, the "User-provided data" section is populated, and consent state flips after Accept.
**Meta Events Manager → Test Events:** set `META_TEST_EVENT_CODE`, submit a test lead → see **Lead (Browser)** and **Lead (Server)** with the same Event ID and "Deduplicated". Check Event Match Quality ≥ 6 after a few days.
**CRM webhook:** `curl -X POST $SITE/api/crm-webhook -H "X-Webhook-Secret: $SECRET" -H 'Content-Type: application/json' -d '{"event":"qualified","lead_id":"<real id>","email":"test@example.com"}'` → `{"ok":true,...}`; repeat → `{"duplicate":true}`.
