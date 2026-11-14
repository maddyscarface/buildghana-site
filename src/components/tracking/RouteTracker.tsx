"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { captureAttribution } from "@/lib/client/attribution";
import { track } from "@/lib/client/analytics";

/** Captures attribution and fires a virtual page_view on every App Router navigation. */
export function RouteTracker() {
  const pathname = usePathname();
  useEffect(() => {
    // Staff admin URLs carry record ids: never send them to analytics/ad platforms (Phase 4).
    if (pathname?.startsWith("/admin")) return;
    captureAttribution();
    track("page_view", { page_path: window.location.pathname + window.location.search, page_title: document.title });
  }, [pathname]);
  return null;
}

export function ViewService({ service, funnel }: { service: string; funnel: string }) {
  useEffect(() => { track("view_service", { service, funnel }); }, [service, funnel]);
  return null;
}
