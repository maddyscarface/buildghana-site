import type { Metadata } from "next";

export const metadata: Metadata = { title: "Client portal", robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } };

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-ivory">{children}</div>;
}
