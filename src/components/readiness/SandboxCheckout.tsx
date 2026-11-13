"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icon } from "@/components/ui/Icons";

const fmt = (minor: number, cur: string) => new Intl.NumberFormat("en-US", { style: "currency", currency: cur }).format(minor / 100);

function Inner() {
  const q = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const session = q.get("session") || "", via = q.get("via") || "stripe", amount = Number(q.get("amount") || 0), currency = q.get("currency") || "USD";
  const safe = (u: string | null) => (u && (u.startsWith(window.location.origin) || u.startsWith("/")) ? u : "/ghana-build-readiness-review");
  const complete = async (outcome: "paid" | "failed") => {
    setBusy(true); setErr("");
    const r = await fetch("/api/readiness/sandbox/complete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ session, outcome }) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) { setErr(j.error || "Sandbox payment failed"); setBusy(false); return; }
    window.location.href = outcome === "paid" ? safe(q.get("success")) : safe(q.get("cancel"));
  };
  return (
    <div className="overflow-hidden rounded-[26px] border border-line bg-white shadow-xl">
      <div className="bg-forest px-7 py-5 text-ivory">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold">Sandbox checkout · {via === "paystack" ? "Paystack (GHS)" : "Stripe (USD)"}</p>
        <p className="mt-1 font-display text-2xl">Ghana Build Readiness Review</p>
      </div>
      <div className="p-7">
        <div className="rounded-xl bg-gold/15 px-4 py-3 text-sm text-ink/85"><strong>Test mode.</strong> No payment keys are connected on this deployment. No card is charged and no money moves. This screen stands in for the provider's hosted checkout.</div>
        <dl className="mt-6 flex items-baseline justify-between border-b border-line pb-4">
          <dt className="text-muted">Amount</dt>
          <dd className="font-display text-3xl text-forest">{fmt(amount, currency)}</dd>
        </dl>
        <p className="mt-2 text-xs text-muted">If the owner hasn't set a price yet, a {fmt(100, currency)} sandbox test value is used. It is not the review fee.</p>
        <div className="mt-7 grid gap-3">
          <button disabled={busy || !session} onClick={() => complete("paid")} className="btn-forest w-full disabled:opacity-60"><Icon name="lock" className="h-4 w-4" /> Complete test payment</button>
          <button disabled={busy || !session} onClick={() => complete("failed")} className="btn-ghost-dark w-full">Simulate a failed payment</button>
        </div>
        {err && <p role="alert" className="mt-4 text-sm text-[#a2402b]">{err}</p>}
      </div>
    </div>
  );
}

export function SandboxCheckout() {
  return <Suspense fallback={null}><Inner /></Suspense>;
}
