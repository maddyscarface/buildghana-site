import type { Metadata, Viewport } from "next";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/manrope";
import "./globals.css";
import { site } from "@/config/site";
import { Analytics, GtmNoScript } from "@/components/tracking/Analytics";
import { RouteTracker } from "@/components/tracking/RouteTracker";
import { ConsentBanner } from "@/components/tracking/ConsentBanner";
import { StickyMobileCta } from "@/components/layout/StickyMobileCta";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `${site.name} | Construction Management in Ghana for Owners Abroad`, template: `%s | ${site.name}` },
  description: site.description,
  applicationName: site.name,
  formatDetection: { telephone: false },
};

export const viewport: Viewport = { themeColor: "#12291F", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Analytics />
        <GtmNoScript />
        <RouteTracker />
        {children}
        <StickyMobileCta />
        <ConsentBanner />
      </body>
    </html>
  );
}
