import Image from "next/image";
import { stock, type StockKey } from "@/content/images";

/**
 * Stock photograph with a mandatory "illustrative" label. These images come from Wikimedia
 * Commons and never show BuildGhana Abroad projects — the label keeps that honest on the page.
 * Full credits: /image-credits (required by CC BY-SA).
 */
export function Photo({
  name, className = "", sizes = "(min-width: 1024px) 50vw, 100vw", priority = false, label = true,
  labelPosition = "br", fill = true, rounded = "", imgClassName = "", creditLink = true, labelClassName,
}: {
  name: StockKey; className?: string; sizes?: string; priority?: boolean; label?: boolean;
  labelPosition?: "br" | "bl" | "tr" | "tl"; fill?: boolean; rounded?: string; imgClassName?: string;
  /** Set false when the photo sits inside a link (nested <a> is invalid HTML). */
  creditLink?: boolean;
  /** Overrides the label position classes (e.g. to keep it clear of an overlay). */
  labelClassName?: string;
}) {
  const img = stock[name];
  const pos = labelClassName ?? { br: "bottom-2.5 right-2.5", bl: "bottom-2.5 left-2.5", tr: "top-2.5 right-2.5", tl: "top-2.5 left-2.5" }[labelPosition];
  return (
    <figure className={`photo-frame ${rounded} ${className}`}>
      {fill ? (
        <Image src={img.src} alt={img.alt} fill sizes={sizes} priority={priority} fetchPriority={priority ? "high" : undefined} className={`object-cover ${imgClassName}`} />
      ) : (
        <Image src={img.src} alt={img.alt} width={img.width} height={img.height} sizes={sizes} priority={priority} className={`h-auto w-full ${imgClassName}`} />
      )}
      {label && (
        <figcaption className={`absolute z-10 ${pos} max-w-[85%] rounded-full bg-black/45 px-2.5 py-1 text-xs font-medium leading-none tracking-wide text-white/85 backdrop-blur-sm`}>
          Illustrative · Ghana · {creditLink ? <a href="/image-credits" className="-my-4 inline-flex min-h-11 items-center underline decoration-white/40 underline-offset-2 hover:text-white">photo credit</a> : <span>{img.author}, {img.license}</span>}
        </figcaption>
      )}
    </figure>
  );
}
