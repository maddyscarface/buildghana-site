import { pageMeta } from "@/lib/seo";
import { disclaimers, site } from "@/config/site";

export const metadata = pageMeta({ title: "Terms of Use | BuildGhana Abroad", description: "Terms governing use of the BuildGhana Abroad website.", path: "/terms" });

export default function Terms() {
  return (
    <section className="container-x max-w-3xl py-16">
      <div className="mb-8 rounded-xl border border-dashed border-gold-2/70 bg-gold/10 px-5 py-4 text-sm text-forest">
        <strong>Draft — legal review required before launch.</strong> These website terms do not replace the written engagement agreement for any paid service.
      </div>
      <h1 className="text-4xl text-forest sm:text-5xl">Terms of Use</h1>
      <p className="mt-2 text-sm text-muted">Last updated: [date of legal approval]</p>
      <div className="prose-bg mt-8">
        <h2>Use of this website</h2>
        <p>This website provides general information about {site.name}&rsquo;s services. By using it you agree to these terms.</p>
        <h2>No professional advice</h2>
        <p>Content on this site is general information, not legal, financial, engineering or investment advice. {disclaimers.regulatory}</p>
        <h2>Services and licensing</h2>
        <p>{disclaimers.licensing} {disclaimers.advisory}</p>
        <h2>Engagements</h2>
        <p>Paid services are provided only under a separate written agreement setting out scope, fees and responsibilities. Submitting a form or booking a call does not create a contract or professional relationship.</p>
        <h2>No guarantees</h2>
        <p>We do not guarantee construction costs, timelines, land title outcomes, permit approvals or investment returns. Estimates are based on stated assumptions.</p>
        <h2>Communications</h2>
        <p>If you opt in to SMS or WhatsApp messages, message frequency varies; message and data rates may apply; reply STOP to opt out or HELP for help.</p>
        <h2>Intellectual property</h2>
        <p>Site content and design belong to {site.name} or its licensors.</p>
        <h2>Limitation of liability</h2>
        <p>[To be drafted by counsel.]</p>
        <h2>Governing law</h2>
        <p>[Jurisdiction to be confirmed by counsel.]</p>
      </div>
    </section>
  );
}
