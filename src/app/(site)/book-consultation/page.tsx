import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { site } from "@/config/site";
import { CheckList } from "@/components/ui/Blocks";
import { BookingFrame } from "@/components/form/BookingFrame";

export const metadata = pageMeta({
  title: "Book a Free Discovery Call",
  description: "Book a free 30-minute discovery call about your Ghana construction or development project, at a time that suits your time zone.",
  path: "/book-consultation",
});

export default function BookConsultation() {
  return (
    <section className="bg-ivory-2 py-12 sm:py-20">
      <div className="container-x grid min-w-0 gap-10 lg:grid-cols-[0.75fr_1.25fr]">
        <div className="min-w-0">
          <p className="eyebrow">Discovery call</p>
          <h1 className="mt-3 text-[2.4rem] leading-tight text-forest sm:text-5xl">Book a free 30-minute call.</h1>
          <p className="mt-4 text-[17px] text-muted">Choose a time that works in your time zone. We'll use the call to understand your project and recommend a first step.</p>
          <div className="mt-8"><CheckList items={["Your goals, land and budget", "Where the project is today", "Which assessment (if any) makes sense", "Fees and timing — in writing afterwards"]} /></div>
          <p className="mt-8 text-sm text-muted">Prefer to send details first? <Link href="/assessment" className="font-semibold text-forest underline">Request a project assessment</Link>.</p>
        </div>
        <BookingFrame url={site.bookingUrl} />
      </div>
    </section>
  );
}
