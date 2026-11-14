import type { NextConfig } from "next";

/**
 * Content-Security-Policy. Allows the OpenAI Ads pixel (script bzrcdn.openai.com, beacons
 * bzr.openai.com) plus GTM/GA4, Meta, Cloudflare Turnstile, GoHighLevel embeds and Supabase uploads.
 * Shipped as Report-Only so nothing a GTM container injects can break at launch: check the browser
 * console for violations, add any extra hosts below, then set CSP_ENFORCE=true to enforce.
 * 'unsafe-inline' is required for the inline pixel/GTM loaders and Next.js bootstrap scripts.
 */
const dev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""} https://bzrcdn.openai.com https://www.googletagmanager.com https://*.google-analytics.com https://connect.facebook.net https://challenges.cloudflare.com https://js.stripe.com https://js.paystack.co`,
  "connect-src 'self' https://*.r2.cloudflarestorage.com https://*.amazonaws.com https://api.stripe.com https://api.paystack.co https://bzr.openai.com https://bzrcdn.openai.com https://www.googletagmanager.com https://*.google-analytics.com https://*.analytics.google.com https://www.facebook.com https://*.supabase.co https://challenges.cloudflare.com",
  "img-src 'self' data: blob: https:",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "frame-src 'self' https://*.leadconnectorhq.com https://*.msgsndr.com https://link.msgsndr.com https://challenges.cloudflare.com https://www.googletagmanager.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self' https://checkout.stripe.com https://checkout.paystack.com",
  "object-src 'none'",
].join("; ");
const cspHeader = { key: process.env.CSP_ENFORCE === "true" ? "Content-Security-Policy" : "Content-Security-Policy-Report-Only", value: csp };

const securityHeaders = [
  cspHeader,
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

// Staging (any non-production Vercel deployment, or STAGING=1) gets a site-wide noindex header.
// Evaluated at build time; production builds (VERCEL_ENV=production) never get it.
const isStaging = process.env.STAGING === "1" || (!!process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production");
const privateHeaders = [{ key: "X-Robots-Tag", value: "noindex, nofollow" }, { key: "Cache-Control", value: "no-store" }];

const nextConfig: NextConfig = {
  // Opt-in standalone Node bundle for generic hosting. Vercel builds must stay on the default
  // output so this flag never changes production or preview deployments on Vercel.
  ...(process.env.BUILD_STANDALONE === "1" && !process.env.VERCEL ? { output: "standalone" as const } : {}),
  poweredByHeader: false,
  reactStrictMode: true,
  images: { formats: ["image/avif", "image/webp"] },
  async headers() {
    return [
      { source: "/(.*)", headers: isStaging ? [...securityHeaders, { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }] : securityHeaders },
      { source: "/admin/:path*", headers: privateHeaders },
      { source: "/ghana-build-readiness-review/case/:path*", headers: privateHeaders },
      { source: "/ghana-build-readiness-review/checkout/:path*", headers: privateHeaders },
      { source: "/property/thank-you", headers: privateHeaders },
      { source: "/api/property/:path*", headers: privateHeaders },
      { source: "/api/admin/:path*", headers: privateHeaders },
      { source: "/api/webhooks/:path*", headers: privateHeaders },
      { source: "/api/cron/:path*", headers: privateHeaders },
    ];
  },
};

export default nextConfig;
