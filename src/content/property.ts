import type { Faq } from "./services";

/** Shared, factual copy for the off-market property pages. No fees, licences or outcomes are claimed. */

export const propertyPrinciples = [
  { title: "Private by default", body: "Seller inquiries are never published. Exact locations, GhanaPost GPS addresses and documents are visible only to authorised BuildGhana staff and counsel." },
  { title: "Seller-authorised introductions", body: "We share a seller's property details or contact with a buyer only after the seller authorises it in writing and an admin approves that specific introduction." },
  { title: "Counsel-led title checks", body: "BuildGhana does not verify title or guarantee ownership. Appointed Ghanaian counsel conduct official searches and record their own findings and limits." },
  { title: "No money held", body: "We do not take deposits, hold funds in escrow or prepare purchase contracts. Sending an inquiry is free and is not an offer or listing agreement." },
];

export const sellerSteps = [
  { n: "01", title: "Send your details privately", body: "Region, district, approximate size, what you hold and what you'd like to achieve. Add photos or documents to private storage if you want — or later." },
  { n: "02", title: "We verify contact and authority", body: "A person contacts you to confirm who you are and your authority to sell — as owner, family representative, agent or attorney." },
  { n: "03", title: "Documentation and counsel review", body: "Where an introduction is likely, we request documents and, with your agreement, refer them to Ghanaian counsel. Their findings are recorded as theirs." },
  { n: "04", title: "You authorise sharing", body: "Nothing is shared until you sign an authorisation saying what may be shared with matched buyers, and whether your contact details may follow." },
  { n: "05", title: "Reviewed introductions", body: "When a buyer's requirements fit, staff review the match and an admin approves the introduction. You can withdraw at any time." },
];

export const buyerSteps = [
  { n: "01", title: "Describe what you need", body: "Regions, property type, size, budget in GHS or USD, timing and how you'll use it. It's not an offer and costs nothing." },
  { n: "02", title: "We confirm your brief", body: "We contact you to check the details, and refer eligibility or tenure questions to Ghanaian counsel where relevant." },
  { n: "03", title: "Internal matching", body: "Staff compare your brief with privately submitted properties using clear filters — region, type, budget, size, use and timing — and review every suggestion by hand." },
  { n: "04", title: "Introduction after seller approval", body: "If the seller authorises it and an admin approves, we introduce you. You then carry out — or ask us to coordinate — inspections and counsel's due diligence." },
];

export const propertyFaqs: Faq[] = [
  { q: "Is BuildGhana a licensed real estate broker?", a: "We do not claim to be. The property service is a private, off-market introduction service. Before any brokerage-style service, fee or commission is offered, Ghanaian counsel must confirm the applicable licensing and registration requirements. Any future fee would be set out in writing first." },
  { q: "Will my land be listed publicly?", a: "No. Seller inquiries are private by default and do not appear on this website, in search engines or in advertising data. A public listing would need your separate written authorisation, a factual review, permission to use images and separate consent to search indexing." },
  { q: "Does BuildGhana verify title or ownership?", a: "No. We record what you tell us as self-reported. Title, tenure, site plans and encumbrances are checked by appointed Ghanaian counsel through official searches, and their findings are recorded as theirs. No introduction is a guarantee of title or ownership." },
  { q: "Can I use this if I live in Ghana?", a: "Yes. The service is for sellers and buyers living in Ghana as well as returnees, the diaspora and international buyers. Use any phone number with its country code — Ghana numbers starting 0 are fine — and choose WhatsApp, phone or email." },
  { q: "Can non-Ghanaians buy land in Ghana?", a: "Rules on land interests differ for non-citizens; for example, non-citizens generally cannot hold freehold interests and may be limited to leaseholds. The exact position depends on the land and your circumstances, so Ghanaian counsel must advise before you commit. Your eligibility answer is self-reported and only used to route that advice." },
  { q: "Do I have to buy a Readiness Review?", a: "No. A property inquiry never requires a paid review. If you later plan to build on land you buy or already own, the Ghana Build Readiness Review is available separately." },
  { q: "How do I withdraw or delete my details?", a: "Use the request form on the How it works page with your reference number. A withdrawn listing is immediately excluded from matching. Deletion removes your contact details, location details and uploaded files, keeping only a minimal record that the request was actioned." },
];
