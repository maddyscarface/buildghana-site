import type { Metadata } from "next";
import { CaseStatus } from "@/components/readiness/CaseStatus";

export const metadata: Metadata = { title: "Your Readiness Review case", robots: { index: false, follow: false } };

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CaseStatus caseId={id} />;
}
