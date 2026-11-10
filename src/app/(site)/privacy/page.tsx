import { pageMeta } from "@/lib/seo";
import { site } from "@/config/site";

export const metadata = pageMeta({ title: "Privacy Policy | BuildGhana Abroad", description: "How BuildGhana Abroad collects, uses and protects your personal information.", path: "/privacy" });

export default function Privacy() {
  return (
    <section className="container-x max-w-3xl py-16">
      <div className="mb-8 rounded-xl border border-dashed border-gold-2/70 bg-gold/10 px-5 py-4 text-sm text-forest">
        <strong>Draft — legal review required before launch.</strong> This template reflects how the site is built. Have a qualified lawyer review it for the jurisdictions you market to (e.g. U.S. state privacy laws, UK/EU GDPR, Ghana Data Protection Act, 2012 (Act 843)).
      </div>
      <h1 className="text-4xl text-forest sm:text-5xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-muted">Last updated: [date of legal approval]</p>
      <div className="prose-bg mt-8">
        <h2>Who we are</h2>
        <p>{site.name} (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides construction management and advisory services for property owners building in Ghana. Legal entity name and contact address: [to be completed].</p>
        <h2>Information we collect</h2>
        <ul>
          <li><strong>Information you give us:</strong> name, email, phone/WhatsApp number, country of residence, project location, land status, project stage, construction type, budget range, timeline, services requested, project description and documents you choose to share.</li>
          <li><strong>Consent records:</strong> your contact, marketing and SMS/WhatsApp choices and when you made them.</li>
          <li><strong>Usage and advertising data:</strong> pages visited, device and browser information, IP address, campaign parameters (such as UTM tags) and advertising click identifiers (such as gclid or fbclid), collected via cookies and similar technologies subject to your cookie choices.</li>
        </ul>
        <h2>How we use it</h2>
        <ul>
          <li>To respond to your request, schedule calls and provide services.</li>
          <li>To prioritise follow-up based on project details (budget, timeline, stage, land status and services). We do not use protected characteristics such as race, national origin, religion, sex or age for this.</li>
          <li>To send marketing emails or SMS/WhatsApp messages only if you opted in. You can unsubscribe at any time.</li>
          <li>To measure and improve our website and advertising, subject to your cookie choices.</li>
        </ul>
        <h2>Who we share it with</h2>
        <ul>
          <li>Service providers who operate our systems on our behalf: CRM and communications (GoHighLevel), hosting (Vercel), data storage, spam protection.</li>
          <li>Advertising and analytics platforms (Google, Meta) to measure conversions. Contact details are hashed before being sent by our servers where the platform supports it.</li>
          <li>Professionals in Ghana (e.g. lawyers, surveyors, engineers) only when needed to deliver services you have engaged us for.</li>
        </ul>
        <p><strong>We do not sell your personal information.</strong> Mobile numbers and SMS opt-in consent are not shared with third parties for their marketing purposes.</p>
        <h2>Cookies</h2>
        <p>You can change your cookie choices at any time using &ldquo;Cookie settings&rdquo; in the footer.</p>
        <h2>Retention</h2>
        <p>We keep enquiry information for as long as needed to respond and for a reasonable period afterwards [retention period to be set], and client records as required by law and contract.</p>
        <h2>Your rights</h2>
        <p>Depending on where you live, you may have rights to access, correct, delete or restrict use of your information, and to opt out of certain processing. Contact us at [privacy contact email] to exercise them.</p>
        <h2>Security</h2>
        <p>We use encryption in transit, access controls and reputable service providers. No system is perfectly secure.</p>
        <h2>Contact</h2>
        <p>[Privacy contact email and postal address — to be completed]</p>
      </div>
    </section>
  );
}
