import { PropertyAdmin } from "@/components/property/PropertyAdmin";
import { adminEnabled } from "@/lib/readiness/secrets";

export const dynamic = "force-dynamic";

export default function AdminPropertyPage() {
  if (!adminEnabled()) {
    return (
      <main className="container-x flex min-h-screen max-w-lg flex-col justify-center py-20">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gold-2">BuildGhana admin</p>
        <h1 className="mt-2 font-display text-3xl text-forest">Admin is locked on this deployment</h1>
        <p className="mt-3 text-muted">Set <code className="rounded bg-white px-1.5 py-0.5">ADMIN_TOKEN</code> (16+ characters) to enable the private property queue. Optional reviewer / legal-reviewer roles use <code className="rounded bg-white px-1.5 py-0.5">PROPERTY_REVIEWER_TOKEN</code> and <code className="rounded bg-white px-1.5 py-0.5">PROPERTY_LEGAL_TOKEN</code>.</p>
      </main>
    );
  }
  return <PropertyAdmin />;
}
