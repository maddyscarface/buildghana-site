import Link from "next/link";
import { pageMeta } from "@/lib/seo";
import { site } from "@/config/site";
import { ScheduleConversion } from "./ScheduleConversion";
import { Icon } from "@/components/ui/Icons";

export const metadata = pageMeta({ title: "Thank You | BuildGhana Abroad", description: "We've received your request.", path: "/thank-you", noindex: true });

export default async function ThankYou({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const isBooking = sp.type === "booking";
  const priority = sp.tier === "priority";

  return (
    <section className="bg-ivory-2 py-20">
      {isBooking && <ScheduleConversion appointmentId={sp.appt} />}
      <div className="container-x max-w-3xl text-center">
        <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-forest text-gold"><Icon name="check" className="h-8 w-8" /></span>
        <h1 className="mt-6 text-[2.4rem] leading-tight text-forest sm:text-5xl">{isBooking ? "Your call is booked." : "Thank you — we've received your request."}</h1>
        <p className="mt-4 text-lg text-muted">
          {isBooking
            ? "You'll receive a confirmation email with the call details. If you have drawings, photos or documents, keep them handy for the call."
            : priority
              ? "Your project looks like a strong fit. A member of our team will contact you within one business day. You can also book your discovery call now."
              : "A member of our team will review your project and reply within one business day (U.S. Eastern) with next steps."}
        </p>
        {!isBooking && (
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/book-consultation" className="btn-forest">Book your discovery call</Link>
            {site.whatsapp && <a className="btn-ghost-dark" href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener">Message us on WhatsApp</a>}
          </div>
        )}
        <div className="mt-14 rounded-2xl bg-white p-6 text-left ring-1 ring-line">
          <p className="font-semibold text-forest">What happens next</p>
          <ol className="mt-4 list-decimal space-y-2 pl-5 text-ink/80">
            <li>We email you a secure link to upload drawings, documents or site photos (optional).</li>
            <li>We review your project and confirm whether we can help in your location.</li>
            <li>On the discovery call we recommend a first step and send a written scope and fee for any paid assessment.</li>
          </ol>
          <p className="mt-6 text-sm text-muted">While you wait: <Link className="underline" href="/resources/build-house-in-ghana-from-usa">How to build a house in Ghana from the U.S.</Link></p>
        </div>
      </div>
    </section>
  );
}
