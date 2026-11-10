# 13 — Testing & QA Checklist

Legend: ✅ verified in the build environment · ☐ must be verified by you on staging/production with real credentials.

## Automated (already run)
- ✅ `npm run typecheck`: no TypeScript errors
- ✅ `npm test`: 18 unit tests: validation (email, phone, enums, consent, strict extra fields, UUID), scoring (priority/nurture, no country effect, admin env override), processing (storage without CRM, idempotency, honeypot, too-fast bot rule, field errors), CAPI payload hashing + shared event_id
- ✅ `npm run build`: all routes compile and prerender
- ✅ `scripts/e2e-smoke.mjs` against `next start` (memory store): step validation errors shown, 4-step submission, redirect to thank-you, exactly one `generate_lead` with `event_id = transaction_id = lead id`, `form_start` fired, UTM + `fbc` captured, no re-fire on reload, no console/page errors
- ✅ API: duplicate submission returns `duplicate:true`. Cross-origin POST → 403. Invalid email → 422 with field error. Production with no storage/CRM → 503 (no silent lead loss). Webhook without secret → 401

## Functional (☐)
- ☐ Every route in doc 02 returns 200; unknown route → branded 404
- ☐ Form on: home, each service page, /assessment, each /lp/*, with `?service=` and `?funnel=` prefill working
- ☐ Each step blocks on missing required fields; errors announced and focus moves to first error
- ☐ Back button keeps answers; network failure shows retry message and resubmits with the same id
- ☐ Thank-you variants: lead (standard), lead (priority shows booking emphasis), booking
- ☐ Booking iframe loads; GHL redirect lands on `/thank-you?type=booking&appt=…`
- ☐ WhatsApp button appears only when `NEXT_PUBLIC_WHATSAPP_NUMBER` set; opens correct number
- ☐ Consent banner: Accept / Reject / Customise persist; footer "Cookie settings" reopens
- ☐ Turnstile (if enabled) renders on step 4 and server rejects missing token

## Integrations (☐ each requires credentials)
- ☐ `/api/health` shows the expected `configured` flags (reminder: configured ≠ working)
- ☐ **Upstash:** submit → key `lead:data:{id}` exists; `leads:index` updated
- ☐ **GHL:** contact created with all mapped custom fields populated; tags correct; note present; opportunity in correct stage; re-submit same email → contact updated, not duplicated
- ☐ **GHL failure path:** set a bad token on staging → lead still stored, id in `leads:ghl_retry`, user sees success
- ☐ **Workflows:** WF-01 routing per tier, notifications received, consent gating on SMS/marketing, STOP handling
- ☐ **CRM webhook:** stage change to Qualified → `/api/crm-webhook` 200; repeat → duplicate
- ☐ **Meta:** Test Events shows Lead Browser + Server, same Event ID, deduplicated. Schedule/Purchase server events from webhook
- ☐ **GA4 DebugView:** event sequence in doc 09; key events marked
- ☐ **Google Ads Tag Assistant:** Lead conversion fires once with transaction_id + user-provided data; Conversion Linker present
- ☐ **Offline imports:** test upload of one Qualified conversion with a test gclid accepted (diagnostics)

## Cross-device / accessibility / performance (☐)
- ☐ iPhone Safari, Android Chrome, desktop Chrome/Safari/Edge/Firefox
- ☐ Sticky mobile CTA visible and not covering form controls; hidden on /assessment and /book-consultation
- ☐ Keyboard-only walkthrough of nav and full form
- ☐ Screen reader (VoiceOver) announces step changes and errors
- ☐ Colour contrast: gold text only on dark backgrounds or as `#B98C45` on ivory for small labels
- ☐ Lighthouse mobile targets in doc 12

## Content & compliance gate (must pass before launch)
- ☐ All `verified: false` items in `src/config/site.ts` resolved or removed (no dashed "to confirm" boxes visible)
- ☐ Fees in `src/content/funnels.ts` set or kept as "quoted in writing"
- ☐ Privacy & Terms reviewed by counsel; placeholders filled
- ☐ Articles reviewed by a Ghana-qualified professional (`reviewed` set) or review notice retained
- ☐ No testimonials, metrics, addresses or licences that aren't documented
- ☐ Meta campaigns declared under the correct Special Ad Category (doc 10)
- ☐ Founder photo and real project imagery added with permission
