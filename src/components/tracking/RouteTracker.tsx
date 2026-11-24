"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution } from "@/lib/client/attribution";
import { track } from "@/lib/client/analytics";
import { isUntrackedPath, safePagePath } from "@/lib/client/safe-path";

/** Captures attribution and fires a virtual page_view on every App Router navigation. */
export function RouteTracker() {
  const pathname = usePathname();
  useEffect(() => {
    // Staff admin URLs carry record ids: never send them to analytics/ad platforms (Phase 4).
    if (pathname && isUntrackedPath(pathname)) return;
    captureAttribution();
    // Blueprint v1: privacy-filtered path (no tokens/ids/emails; only UTM + click ids survive).
    track("page_view", { page_path: safePagePath(window.location.pathname, window.location.search), page_title: document.title });
  }, [pathname]);
  return null;
}

export function ViewService({ service, funnel }: { service: string; funnel: string }) {
  useEffect(() => { track("view_service", { service, funnel }); }, [service, funnel]);
  return null;
}
