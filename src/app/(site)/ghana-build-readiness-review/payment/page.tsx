import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { readiness } from "@/config/readiness";

export const metadata: Metadata = { title: "Readiness Review payment", robots: { index: false, follow: false } };

/** /ghana-build-readiness-review/payment?case=<id>&t=<token> — payment handoff: the case page shows fee summary + hosted checkout choices. */
export default async function PaymentPage({ searchParams }: { searchParams: Promise<{ case?: string; t?: string }> }) {
  const { case: id, t } = await searchParams;
  if (id && /^[0-9a-f-]{36}$/i.test(id) && t) redirect(`${readiness.path}/case/${id}?t=${encodeURIComponent(t)}`);
  redirect(`${readiness.path}/start`);
}
