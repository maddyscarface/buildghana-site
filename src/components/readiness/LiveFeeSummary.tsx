"use client";
import { useEffect, useState } from "react";
import { FeeSummary, type PublicPrice } from "./FeeSummary";

export function LiveFeeSummary() {
  const [p, setP] = useState<PublicPrice | null>(null);
  useEffect(() => { fetch("/api/readiness/price").then((r) => r.json()).then(setP).catch(() => {}); }, []);
  return <FeeSummary price={p} />;
}
