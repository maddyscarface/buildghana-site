import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { WhatsAppFloat } from "@/components/layout/StickyMobileCta";
import { JsonLd } from "@/components/ui/Blocks";
import { siteGraph } from "@/lib/seo";

export default function SiteLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <JsonLd data={siteGraph()} />
      <Header />
      <main id="main">{children}</main>
      <Footer />
      <WhatsAppFloat />
    </>
  );
}
