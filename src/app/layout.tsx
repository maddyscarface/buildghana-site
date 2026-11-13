import type { Metadata, Viewport } from "next";
import "@fontsource-variable/newsreader";
import "@fontsource-variable/manrope";
import "./globals.css";
import { site } from "@/config/site";
import { Analytics, GtmNoScript } from "@/components/tracking/Analytics";
import { RouteTracker } from "@/components/tracking/RouteTracker";
import { ConsentBanner } from "@/components/tracking/ConsentBanner";
import { StickyMobileCta } from "@/components/layout/StickyMobileCta";
import { MarketingTags } from "@/components/tracking/MarketingTags";
import { isStaging } from "@/lib/env";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: `Construction Management in Ghana | ${site.shortName}`, template: `%s | ${site.shortName}` },
  description: site.description,
  applicationName: site.shortName,
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  formatDetection: { telephone: false },
  // Staging / preview deployments are never indexed. Production (VERCEL_ENV=production) is unaffected.
  ...(isStaging ? { robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } } } : {}),
};

export const viewport: Viewport = { themeColor: "#12291F", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <Analytics />
        <MarketingTags />
        <GtmNoScript />
        <RouteTracker />
        {children}
        <StickyMobileCta />
        <ConsentBanner />
      </body>
    </html>
  );
}
