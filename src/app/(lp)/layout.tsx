import Link from "next/link";
import { Header } from "@/components/layout/Header";
import { disclaimers, site } from "@/config/site";

/** Ad landing pages: minimal navigation to keep attention on the offer. */
export default function LandingLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Header minimal />
      <main id="main">{children}</main>
      <footer className="bg-forest pb-28 pt-10 text-xs text-ivory/60 md:pb-10">
        <div className="container-x space-y-3">
          <p>{disclaimers.licensing}</p>
          <p className="flex flex-wrap gap-4">
            <span>© {new Date().getFullYear()} {site.name}</span>
            <Link href="/privacy" className="underline">Privacy</Link>
            <Link href="/terms" className="underline">Terms</Link>
            <Link href="/" className="underline">Main site</Link>
          </p>
        </div>
      </footer>
    </>
  );
}
