import { AdminDashboard } from "@/components/readiness/AdminDashboard";
import { adminEnabled } from "@/lib/readiness/secrets";

export const dynamic = "force-dynamic";

export default function AdminReadinessPage() {
  if (!adminEnabled()) {
    return (
      <main className="container-x flex min-h-screen max-w-lg flex-col justify-center py-20">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-2">BuildGhana admin</p>
        <h1 className="mt-2 font-display text-3xl text-forest">Admin is locked on this deployment</h1>
        <p className="mt-3 text-muted">Set an <code className="rounded bg-white px-1.5 py-0.5">ADMIN_TOKEN</code> environment variable (16+ random characters) to enable the Readiness Review queue.</p>
      </main>
    );
  }
  return <AdminDashboard />;
}
