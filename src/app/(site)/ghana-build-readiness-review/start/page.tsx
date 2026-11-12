import { pageMeta } from "@/lib/seo";
import { readiness } from "@/config/readiness";
import { IntakeForm } from "@/components/readiness/IntakeForm";
import { PriceTag } from "@/components/readiness/PriceTag";
import { Photo } from "@/components/media/Photo";
import { Breadcrumbs } from "@/components/ui/Blocks";

export const metadata = pageMeta({
  title: "Start your Ghana Build Readiness Review | BuildGhana Abroad",
  description: "Tell us about your land, documents and plans. About ten minutes, then secure payment and private document upload.",
  path: `${readiness.path}/start`,
});

export default function StartPage() {
  return (
    <>
      <section className="bg-forest pb-28 pt-12 text-ivory sm:pb-32">
        <div className="container-x">
          <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: readiness.shortName, href: readiness.path }, { name: "Start", href: `${readiness.path}/start` }]} />
          <h1 className="display-lg mt-8 max-w-3xl">Start your {readiness.name}</h1>
          <p className="lede mt-4 max-w-2xl text-ivory/75">Five short steps. Your answers are saved when you finish, and nothing is charged until you check out.</p>
        </div>
      </section>
      <section className="-mt-20 pb-24">
        <div className="container-x grid gap-10 lg:grid-cols-[1.35fr_0.65fr]">
          <IntakeForm />
          <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
            <div className="rounded-[22px] border border-line bg-white p-6 shadow-sm"><PriceTag tone="light" /></div>
            <div className="overflow-hidden rounded-[22px]"><Photo name="land_site_inspection" className="aspect-[4/3]" sizes="30vw" /></div>
            <ul className="space-y-3 text-[14.5px] text-ink/80">
              <li>• Your details are used only for this review and its follow-up.</li>
              <li>• Documents are uploaded after payment, into private storage.</li>
              <li>• Title findings come from independent Ghanaian counsel.</li>
            </ul>
          </aside>
        </div>
      </section>
    </>
  );
}
