import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { articles } from "@/content/articles";
import { Icon } from "@/components/ui/Icons";
import { CtaBand } from "@/components/ui/Blocks";

export const metadata = pageMeta({
  title: "Guides for Building in Ghana From Abroad | BuildGhana Abroad Resources",
  description: "Practical guides for overseas owners building homes and developing property in Ghana: land due diligence, budgeting, permits, oversight and stalled projects.",
  path: "/resources",
});

export default function Resources() {
  return (
    <>
      <section className="bg-forest pb-16 pt-16 text-ivory">
        <div className="container-x max-w-4xl">
          <p className="eyebrow-dark">Resources</p>
          <h1 className="mt-4 text-[2.5rem] leading-tight sm:text-6xl">Plain-English guides for building in Ghana from abroad.</h1>
          <p className="mt-5 text-lg text-ivory/75">Written for owners who want to understand the process before they fund it. Regulatory content is reviewed by Ghana-qualified professionals before it is marked as verified.</p>
        </div>
      </section>
      <section className="py-20">
        <div className="container-x grid gap-5 md:grid-cols-3">
          {articles.map((a) => (
            <Link key={a.slug} href={`/resources/${a.slug}`} className="group card flex flex-col p-7 hover:border-forest/30 hover:bg-white">
              <p className="text-xs font-semibold uppercase tracking-wider text-gold-2">Guide</p>
              <h2 className="mt-3 text-2xl leading-snug text-forest">{a.title}</h2>
              <p className="mt-3 flex-1 text-[15px] text-muted">{a.summary}</p>
              <span className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-forest">Read the guide <Icon name="arrow" className="h-4 w-4" /></span>
            </Link>
          ))}
        </div>
      </section>
      <CtaBand heading="Have a specific question about your project?" body="Send us the details. We'll answer it directly — and tell you if you need a professional opinion." />
    </>
  );
}
