import type { Metadata } from "next";
import Link from "next/link";
import { CaseStatus } from "@/components/readiness/CaseStatus";
import { readiness } from "@/config/readiness";

export const metadata: Metadata = { title: "Readiness Review status", robots: { index: false, follow: false } };

/** /ghana-build-readiness-review/status?case=<id>&t=<token> — the link used in client emails. */
export default async function StatusPage({ searchParams }: { searchParams: Promise<{ case?: string }> }) {
  const { case: id } = await searchParams;
  if (id && /^[0-9a-f-]{36}$/i.test(id)) return <CaseStatus caseId={id} />;
  return (
    <section className="bg-ivory-2/60 py-16 sm:py-24">
      <div className="container-x">
        <div className="mx-auto max-w-xl rounded-[22px] border border-line bg-white p-7 text-center shadow-sm sm:p-10">
          <p className="eyebrow">Private case page</p>
          <h1 className="mt-3 font-display text-[2rem] leading-tight text-forest sm:text-[2.4rem]">Check your review status</h1>
          <p className="mt-3 text-[16px] leading-relaxed text-muted">Open the private link from your confirmation or update email. For your security, case pages are only reachable through that link.</p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href={readiness.path} className="btn-forest">Back to the Readiness Review</Link>
            <Link href="/book-consultation" className="btn-ghost-dark">Lost your link?</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
