import { notFound } from "next/navigation";
import { tpConfig } from "@/lib/transparency/config";
import { demoPersonas } from "@/lib/transparency/seed";
import { LoginForm } from "@/components/portal/LoginForm";
import { DemoBanner } from "@/components/portal/ui";
import { Logo } from "@/components/ui/Icons";

export const dynamic = "force-dynamic";
export const metadata = { title: "Client portal sign-in", robots: { index: false, follow: false } };

const safeNext = (n?: string) => (n && /^\/(portal|field|office)(\/[A-Za-z0-9/_-]*)?(\?[A-Za-z0-9=&_-]*)?$/.test(n) ? n : "");

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  if (!tpConfig().enabled) notFound();
  const { next } = await searchParams;
  return (
    <main className="min-h-screen bg-forest">
      <DemoBanner />
      <div className="mx-auto grid max-w-5xl gap-10 px-5 py-14 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:py-20">
        <div className="text-ivory">
          <a href="/" aria-label="BuildGhana Abroad home"><Logo light /></a>
          <h1 className="mt-10 font-display text-[2.3rem] leading-tight sm:text-[2.9rem]">BuildGhana client portal</h1>
          <p className="mt-4 max-w-md text-[16px] leading-relaxed text-ivory/80">See what was reported, what was reviewed, what was inspected and what needs your decision — for one synthetic demo project.</p>
          <ul className="mt-8 space-y-3 text-[15px] text-ivory/80">
            <li>• Staging demo only. Production sign-in will be invite-only with email verification and MFA (owner decision pending).</li>
            <li>• Every person, amount and image here is synthetic.</li>
            <li>• Private pages are never indexed and carry no analytics or ad tags.</li>
          </ul>
        </div>
        <div className="rounded-[22px] bg-ivory p-6 shadow-2xl sm:p-8">
          <h2 className="font-display text-2xl text-forest">Sign in to the demo</h2>
          <p className="mb-6 mt-1 text-sm text-muted">Choose who you want to see the project as.</p>
          <LoginForm personas={demoPersonas.map(({ userId, label }) => ({ userId, label }))} next={safeNext(next)} />
        </div>
      </div>
    </main>
  );
}
