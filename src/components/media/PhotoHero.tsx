import type { ReactNode } from "react";
import { Photo } from "@/components/media/Photo";
import type { StockKey } from "@/content/images";

/** Interior page hero: full-bleed illustrative photo under a forest shade. */
export function PhotoHero({ image, kicker, title, children, align = "end" }: { image: StockKey; kicker: string; title: ReactNode; children?: ReactNode; align?: "end" | "center" }) {
  return (
    <section className="relative isolate overflow-hidden bg-forest text-ivory">
      <Photo name={image} priority sizes="100vw" className="photo-shade absolute inset-0 -z-10 h-full w-full" />
      <div className={`container-x flex min-h-[460px] flex-col pb-16 pt-24 sm:min-h-[520px] sm:pb-20 ${align === "end" ? "justify-end" : "justify-center"}`}>
        <div className="max-w-4xl">
          <p className="kicker text-gold"><span className="hairline" />{kicker}</p>
          <h1 className="display-lg mt-5">{title}</h1>
          {children && <div className="lede mt-6 max-w-2xl text-ivory/80">{children}</div>}
        </div>
      </div>
    </section>
  );
}
