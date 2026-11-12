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
    <section className="bg-ivory-2/60 py-20">
      <div className="container-x max-w-xl rounded-[22px] border border-line bg-white p-8 text-center">
        <h1 className="font-display text-3xl text-forest">Check your review status</h1>
        <p className="mt-3 text-muted">Open the private link from your confirmation or update email. For your security, case pages are only reachable through that link.</p>
        <Link href={readiness.path} className="btn-forest mt-6">Back to the Readiness Review</Link>
      </div>
    </section>
  );
}
