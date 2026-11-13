import Image from "next/image";
import { pageMeta } from "@/lib/seo";
import { allStock } from "@/content/images";

export const metadata = pageMeta({
  title: "Image Credits",
  description: "Credits and licences for the illustrative photographs used on this site.",
  path: "/image-credits",
  noindex: true,
});

export default function ImageCredits() {
  return (
    <>
      <section className="bg-forest pb-16 pt-16 text-ivory">
        <div className="container-x max-w-4xl">
          <p className="eyebrow-dark">Image credits</p>
          <h1 className="mt-4 font-display text-[2.5rem] leading-tight sm:text-5xl">Illustrative photography</h1>
          <p className="mt-5 text-lg text-ivory/75">The photographs on this site show places and construction in Ghana. They are not BuildGhana Abroad projects, clients or staff. Each is used under the licence shown; images were resized and recompressed for the web, and those adaptations are shared under the same licence.</p>
        </div>
      </section>
      <section className="py-16">
        <ul className="container-x grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {allStock.map((img) => (
            <li key={img.slug} className="overflow-hidden rounded-2xl border border-line bg-white">
              <div className="relative aspect-[3/2]"><Image src={img.src} alt={img.alt} fill sizes="(min-width:1024px) 30vw, 100vw" className="object-cover" /></div>
              <div className="p-4 text-sm">
                <p className="text-forest">{img.alt}</p>
                <p className="mt-2 text-muted">Photo: {img.author} · <a className="underline" href={img.licenseUrl} target="_blank" rel="noopener license">{img.license}</a></p>
                <p className="mt-1"><a className="text-forest underline" href={img.sourceUrl} target="_blank" rel="noopener">Source: Wikimedia Commons</a></p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
