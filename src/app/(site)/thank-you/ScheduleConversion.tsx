"use client";

import { useEffect } from "react";
import { trackOnce } from "@/lib/client/analytics";

/** Fires `schedule` once per appointment id (refresh/back-button safe). */
export function ScheduleConversion({ appointmentId }: { appointmentId?: string }) {
  useEffect(() => {
    const id = appointmentId || `anon-${new Date().toISOString().slice(0, 13)}`;
    trackOnce(`schedule:${id}`, "schedule", { appointment_id: id, transaction_id: id }, `appt:${id}`);
  }, [appointmentId]);
  return null;
}
