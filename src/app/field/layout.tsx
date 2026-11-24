import type { Metadata } from "next";

export const metadata: Metadata = { title: "Field reporting", robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } };

export default function FieldLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-ivory">{children}</div>;
}
