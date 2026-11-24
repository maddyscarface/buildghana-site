"use client";

import { usePathname } from "next/navigation";
import { isUntrackedPath } from "@/lib/client/safe-path";

/**
 * Renders tags/pixels/consent UI only on public pages. The client portal, field capture, office console and
 * admin never load GTM, GA4, Meta, the OpenAI pixel or the intent (DataMoon) pixel (Phase 5 spec 06 §A).
 * Portal entry points use full page loads, so tags loaded on public pages are not carried into the portal.
 */
export function TrackingGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "/";
  if (isUntrackedPath(pathname)) return null;
  return <>{children}</>;
}
