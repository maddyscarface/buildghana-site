import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { Icon } from "@/components/ui/Icons";

export const metadata = pageMeta({ title: "Inquiry received", description: "Your private property inquiry has been received.", path: "/property/thank-you", noindex: true });

/** Confirmation only — never echoes submitted details. Reference is a short opaque code. */
export default async function ThankYou({ searchParams }: { searchParams: Promise<{ type?: string; ref?: string }> }) {
  const { type, ref } = await searchParams;
  const seller = type === "seller";
  const safeRef = ref && /^[SB]-[A-Z0-9]{6}$/.test(ref) ? ref : null;
  return (
    <section className="py-24 sm:py-32">
      <div className="container-x max-w-3xl">
        <p className="eyebrow">Inquiry received{safeRef ? ` · Reference ${safeRef}` : ""}</p>
        <h1 className="mt-4 font-display text-[2.4rem] leading-[1.08] text-forest sm:text-[3.2rem]">Thank you. A person will review it.</h1>
        <p className="lede mt-6 text-muted">{seller ? "Your property details are private and have not been published or shared." : "Your requirements are on our private matching list."} We'll contact you by your chosen method to confirm the details{seller ? " and your authority to sell" : ""}. Keep your reference for any follow-up.</p>
        <ul className="mt-8 space-y-3 text-[15.5px] text-ink/85">
          <li className="flex gap-2.5"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-gold-2" />Nothing is shared with {seller ? "a buyer" : "you"} until the seller authorises it and we approve that introduction.</li>
          <li className="flex gap-2.5"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-gold-2" />No payment is due. We never ask for deposits.</li>
          <li className="flex gap-2.5"><Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-gold-2" /><span>Changed your mind? <Link href="/property/how-it-works#requests" className="link-underline text-forest">Withdraw or delete your details</Link>.</span></li>
        </ul>
        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <Link href="/property" className="btn-forest">Back to property</Link>
          <Link href="/ghana-build-readiness-review" className="btn-ghost-dark">About the Readiness Review</Link>
        </div>
      </div>
    </section>
  );
}
