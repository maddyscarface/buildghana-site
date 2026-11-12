import { z } from "zod";
import { requireAdmin } from "@/lib/readiness/admin-http";
import { json } from "@/lib/readiness/http";
import { getPriceSettings, setPriceSettings } from "@/lib/readiness/pricing";
import { documentStore } from "@/lib/readiness/storage";
import { stripeConfigured } from "@/lib/readiness/payments/stripe";
import { paystackConfigured } from "@/lib/readiness/payments/paystack";
import { ghlConfigured } from "@/lib/server/ghl";
import { kvConfigured } from "@/lib/server/kv";
import { tokenSecretConfigured, docsSecretConfigured } from "@/lib/readiness/secrets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const deny = await requireAdmin(req); if (deny) return deny;
  const store = documentStore();
  return json({
    ok: true, price: await getPriceSettings(),
    integrations: { storage: kvConfigured ? "upstash" : "memory (sandbox)", documents: store.durable ? "s3/r2" : "local (sandbox, not durable)", stripe: stripeConfigured(), paystack: paystackConfigured(), ghl: ghlConfigured, tokenSecret: tokenSecretConfigured, docsSecret: docsSecretConfigured },
  });
}

const body = z.object({
  usdMinor: z.number().int().min(100).max(10_000_000).nullable().optional(),
  ghsMinor: z.number().int().min(100).max(100_000_000).nullable().optional(),
  turnaroundDays: z.number().int().min(1).max(120).nullable().optional(),
  addOns: z.record(z.enum(["title_verification", "expedited", "third_party", "travel"]), z.object({ usdMinor: z.number().int().min(0).max(100_000_000).nullable(), ghsMinor: z.number().int().min(0).max(1_000_000_000).nullable() })).optional(),
  fx: z.object({ usdToGhs: z.number().positive().max(10_000), source: z.string().min(2).max(200), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).nullable().optional(),
  coverage: z.string().max(2000).nullable().optional(),
  refundPolicy: z.string().max(4000).nullable().optional(),
  costAssumptions: z.object({
    version: z.string().min(1).max(30), notes: z.string().max(4000), updatedAt: z.string().optional().default(""),
    ghsPerSqm: z.object({ basic: z.tuple([z.number(), z.number(), z.number()]), standard: z.tuple([z.number(), z.number(), z.number()]), high: z.tuple([z.number(), z.number(), z.number()]), luxury: z.tuple([z.number(), z.number(), z.number()]) }),
  }).nullable().optional(),
});

export async function PUT(req: Request) {
  const deny = await requireAdmin(req); if (deny) return deny;
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return json({ ok: false, error: "Invalid settings" }, 400);
  return json({ ok: true, price: await setPriceSettings(parsed.data as never) });
}
