import { pageMeta } from "@/lib/seo";
import { LeadForm } from "@/components/form/LeadForm";
import { Icon } from "@/components/ui/Icons";
import { funnels, serviceOptions, type Funnel } from "@/lib/lead/options";

export const metadata = pageMeta({
  title: "Request a Project Assessment | BuildGhana Abroad",
  description: "Tell us about your Ghana construction project — land, stage, budget and timeline. We'll review it personally and recommend the right first step.",
  path: "/assessment",
});

export default async function Assessment({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const funnel: Funnel = funnels.includes(sp.funnel as Funnel) ? (sp.funnel as Funnel) : "general";
  const service = serviceOptions.some((o) => o.value === sp.service) ? sp.service : undefined;
  const stage = funnel === "rescue" ? "stalled" : undefined;

  return (
    <section className="bg-ivory-2 py-12 sm:py-20">
      <div className="container-x grid gap-10 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="lg:sticky lg:top-28 lg:self-start">
          <p className="eyebrow">Project assessment</p>
          <h1 className="mt-3 text-[2.4rem] leading-tight text-forest sm:text-5xl">Tell us about your project.</h1>
          <p className="mt-4 text-[17px] leading-relaxed text-muted">Four short steps. A real person reviews every request and replies within one business day (U.S. Eastern).</p>
          <ol className="mt-8 space-y-4">
            {[
              ["We review your answers", "and check fit, location and scope."],
              ["We send next steps", "usually a free discovery call invitation."],
              ["You get a written scope", "for any paid assessment, before you commit."],
            ].map(([a, b], i) => (
              <li key={a} className="flex gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-forest text-sm font-bold text-gold">{i + 1}</span>
                <p className="text-ink/85"><strong className="text-forest">{a}</strong> {b}</p>
              </li>
            ))}
          </ol>
          <p className="mt-8 flex items-center gap-2 text-sm text-muted"><Icon name="shield" className="h-5 w-5 text-gold-2" /> Your information is used only to respond to your request.</p>
        </div>
        <LeadForm funnel={funnel} defaultService={service} defaultStage={stage} variant="card" />
      </div>
    </section>
  );
}
