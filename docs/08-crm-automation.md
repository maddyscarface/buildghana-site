# 08 — CRM Automation Specification (GoHighLevel)

Each workflow lists **Trigger → Conditions → Actions → Exit criteria**. Build them in GHL → Automation → Workflows. All SMS/WhatsApp steps require the `consent-sms-whatsapp` tag. All marketing emails require `consent-email-marketing`. Transactional replies to the person's own request are sent on contact consent.

> SMS in the U.S. requires A2P 10DLC brand/campaign registration in GHL (LC Phone) before sending. WhatsApp requires a WhatsApp Business account connected to GHL and approved templates for messages outside the 24-hour window.

---

### WF-01 New Website Lead: Router
- **Trigger:** Contact Tag Added = `source-website`
- **Actions:**
  1. Wait 1 min (lets opportunity creation finish)
  2. If/Else on tag:
     - `score-priority` → go to WF-02
     - `score-standard` → go to WF-03
     - `score-nurture` → go to WF-04
  3. Internal notification (email + GHL mobile app) to sales: `{{contact.name}} · {{contact.lead_tier}} · {{contact.funnel}} · {{contact.budget_range}} · {{contact.ghana_region}}`
  4. Send email **E-00 "We received your request"** (transactional, all tiers), including the secure document-upload link (GHL Form with File Upload field, prefilled with contact ID)
- **Exit:** after routing.

### WF-02 Priority Follow-up (speed-to-lead)
- **Conditions:** tag `score-priority`; business-hours window (U.S. Eastern 8am–7pm, Mon–Sat)
- **Actions:**
  1. Create task for owner: "Call within 1 business day", due +4 business hours
  2. If `consent-sms-whatsapp` → SMS/WhatsApp **S-01**: "Hi {{first_name}}, this is {{user.first_name}} at BuildGhana Abroad. Thanks for the details on your {{ghana_region}} project. Book a time here: {{calendar_link}} or reply with a good time to call."
  3. Wait 24h → if no appointment → email **E-01P** booking reminder
  4. Wait 48h → if no appointment & no reply → task: second call attempt
  5. Wait 4 days → if no appointment → move to WF-03 sequence step 3
- **Exit:** Appointment booked (goal event) OR opportunity moved past "Contacted".

### WF-03 Standard Qualification
- **Actions:** E-01 (what we do + booking link) → wait 2d → E-02 (process + sample report) → wait 3d → E-03 (funnel-specific objection email) → wait 5d → E-04 ("Should I close your file?") → if no engagement, add tag `nurture-longterm` and go to WF-04.
- **Exit:** Appointment booked; reply received (pause and assign task); unsubscribe.

### WF-04 Educational Nurture (marketing consent only)
- **Condition:** `consent-email-marketing`. If absent → end after E-00.
- **Branch by funnel tag:**
  - `funnel-new_home` → NH-1 "Land first", NH-2 "Complete drawings", NH-3 "Permits", NH-4 "Line-item budgets", NH-5 "Paying against progress", NH-6 "What a report should contain" (every 5 days)
  - `funnel-rescue` → RS-1 "Protect the site now", RS-2 "Document before deciding", RS-3 "Structural questions", RS-4 "Cost to complete", RS-5 "Options" (every 4 days)
  - `funnel-investor` → IV-1 "Testing cost assumptions", IV-2 "Unit mix", IV-3 "Draw schedules", IV-4 "Reporting investors expect", IV-5 "Advisory vs delivery" (weekly)
  - Each email ends with "Request a Project Assessment"
- **Then:** monthly newsletter list.
- **Exit:** Appointment booked → remove from nurture; unsubscribe.

### WF-05 Appointment Booked
- **Trigger:** Customer Booked Appointment (Discovery calendar)
- **Actions:** move opportunity → Discovery Booked · confirmation email with prep checklist · reminders at 24h and 1h (email; SMS/WhatsApp if consented) · **Webhook** POST `{SITE_URL}/api/crm-webhook` with header `X-Webhook-Secret: {CRM_WEBHOOK_SECRET}` and body:
  ```json
  {"event":"appointment_booked","lead_id":"{{contact.website_lead_id}}","email":"{{contact.email}}","phone":"{{contact.phone}}","first_name":"{{contact.first_name}}","last_name":"{{contact.last_name}}"}
  ```
- **Calendar setting:** confirmation redirect URL = `{SITE_URL}/thank-you?type=booking&appt={{appointment.id}}`
- **Exit:** after reminders.

### WF-06 No-show / Reschedule
- **Trigger:** Appointment status = No Show
- **Actions:** email + SMS (if consent) with reschedule link → wait 2d → task for owner → if still no booking, back to WF-03 step 3.

### WF-07 Qualified
- **Trigger:** Opportunity stage changed → Qualified
- **Actions:** Webhook to `/api/crm-webhook` with `"event":"qualified"` · send assessment proposal email template for the funnel (Feasibility Assessment / Project Review / Feasibility Consultation) with payment link.
- **Exit:** stage changes.

### WF-08 Paid Assessment Intake
- **Trigger:** Payment Received (GHL Payments / Stripe product = Assessment) OR Invoice Paid
- **Actions:** move opportunity → Assessment Paid · set `Assessment Paid Date` and `Assessment Fee` · send intake form (documents, site access contact, authorisations) · create ops tasks (instruct lawyer/surveyor, schedule site visit) · Webhook `"event":"assessment_paid","value":{{payment.amount}},"currency":"USD"`.
- **Exit:** intake submitted (create task) or 5-day reminder chain.

### WF-09 Contract Signed
- **Trigger:** Stage → Won / Contract Signed (or document signed via GHL Documents & Contracts)
- **Actions:** set Contract Value/Date · Webhook `"event":"contract_signed","value":{{opportunity.monetary_value}}` · onboarding email · remove all nurture.

### WF-10 Unsubscribe / STOP hygiene
- **Trigger:** DND enabled on channel OR STOP reply
- **Actions:** remove consent tag for that channel · remove from all marketing workflows · note timestamp.

## Lead scoring in GHL
Website scoring is authoritative (`lead_score` field + tier tag). Optionally add GHL "Lead Score" engagement points: email open +1, link click +3, booking page visit +5, reply +10. Keep these separate from the fit score.

## Sales notifications
Priority: push + email instantly. Standard: daily 9am digest (Smart List "New website leads, last 24h"). Nurture: weekly digest.

## Reporting dashboards (GHL → Dashboard)
1. Leads by funnel × tier (this week / month)
2. Pipeline value by stage
3. Lead → Discovery Booked rate; Discovery → Qualified; Qualified → Assessment Paid; Assessment → Contract
4. Source (UTM / src-* tags) × Assessment Paid
5. Speed-to-lead: median time to first call task completion (priority)
6. No-show rate
