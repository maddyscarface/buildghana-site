import type { Metadata } from "next";
import { SandboxCheckout } from "@/components/readiness/SandboxCheckout";

export const metadata: Metadata = { title: "Sandbox checkout", robots: { index: false, follow: false } };

export default function SandboxCheckoutPage() {
  return (
    <section className="bg-ivory-2/60 py-16 sm:py-24">
      <div className="container-x max-w-xl"><SandboxCheckout /></div>
    </section>
  );
}
