import Link from "next/link";
import { Header } from "@/components/layout/Header";

export default function NotFound() {
  return (
    <>
      <Header />
      <main id="main" className="container-x flex min-h-[60vh] flex-col items-start justify-center py-24">
        <p className="eyebrow">404</p>
        <h1 className="mt-3 text-5xl text-forest">This page isn&rsquo;t on the plans.</h1>
        <p className="mt-4 text-lg text-muted">The page you&rsquo;re looking for doesn&rsquo;t exist or has moved.</p>
        <div className="mt-8 flex gap-3"><Link href="/" className="btn-forest">Go home</Link><Link href="/assessment" className="btn-ghost-dark">Request an assessment</Link></div>
      </main>
    </>
  );
}
