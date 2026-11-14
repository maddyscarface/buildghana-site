import "server-only";
import { kvConfigured } from "@/lib/server/kv";
import { ghlConfigured } from "@/lib/server/ghl";
import { capiConfigured } from "@/lib/server/meta-capi";
import { ga4Configured } from "@/lib/server/ga4-mp";
import { googleAdsConfigured } from "@/lib/server/google-ads";
import { listRevenue, getCase, listCaseIds } from "@/lib/readiness/store";
import { listBuyers, listMatches, listSellers } from "@/lib/property/store";
import { s3Configured } from "@/lib/readiness/storage/s3";
import { stripeConfigured } from "@/lib/readiness/payments/stripe";
import { paystackConfigured } from "@/lib/readiness/payments/paystack";
import { dmStatus } from "@/lib/datamoon/config";
import { listEvents as dmEvents, listImports } from "@/lib/datamoon/store";
import { getProvider } from "@/lib/datamoon/adapter";
import { searchRecords } from "./records";
import { listJobs, outboxStats } from "./outbox";
import { opsEnabled, staffDefs } from "./auth";

/** Aggregate reporting (counts only — no PII). Revenue is split into sandbox vs live. */
export async function buildReport() {
  const { rows } = await searchRecords({ limit: 500 }, { pii: false });
  const count = <K extends string>(f: (r: (typeof rows)[number]) => K) => rows.reduce<Record<string, number>>((m, r) => { const k = f(r); m[k] = (m[k] ?? 0) + 1; return m; }, {});
  const revenue = await listRevenue();
  const sum = (live: boolean) => revenue.filter((r) => r.sandbox !== live).reduce<Record<string, number>>((m, r) => { m[r.currency] = (m[r.currency] ?? 0) + r.amountMinor; return m; }, {});
  return {
    generatedAt: new Date().toISOString(),
    totals: { records: rows.length, firstParty: rows.filter((r) => r.firstParty).length, vendorProspects: rows.filter((r) => !r.firstParty).length },
    byType: count((r) => r.type), byMarket: count((r) => r.market), bySource: count((r) => r.source), byMonth: count((r) => r.createdAt.slice(0, 7)),
    readinessByStatus: count((r) => (r.type === "readiness" ? r.status : "_")),
    propertyByStatus: count((r) => (r.type.startsWith("property") ? r.status : "_")),
    revenueMinor: { live: sum(true), sandbox: sum(false), note: "Readiness Review only; amounts are in minor units and come from the existing checkout." },
    outbox: await outboxStats(),
  };
}

/** Readiness / property operational queues (BuildGhana's replacement for an estimator tab). */
export async function queues(opts: { pii: boolean }) {
  const cases = (await Promise.all([...new Set(await listCaseIds(300))].map(getCase))).filter(Boolean).map((c) => ({
    id: c!.id, caseNumber: c!.caseNumber, status: c!.status, payment: c!.paymentStatus, title: c!.titleStatus, counsel: c!.counsel ? (c!.counsel.signedOffAt ? "signed_off" : "engaged") : "none",
    reviewer: c!.ops.reviewer, due: c!.ops.dueDate, openTasks: c!.ops.tasks.filter((t) => !t.done).length, reports: c!.reports.length, finalDelivered: c!.reports.some((r) => r.final && r.deliveredAt), sandbox: c!.sandbox, createdAt: c!.createdAt,
    client: opts.pii ? `${c!.contact.firstName} ${c!.contact.lastName}` : `${c!.contact.firstName.slice(0, 1)}. ${c!.contact.lastName.slice(0, 1)}.`,
  }));
  const prop = [...(await listSellers()), ...(await listBuyers())].filter((r) => !r.deletedAt).map((r) => ({ id: r.id, kind: r.kind, reference: r.reference, status: r.status, legal: r.legalState, sandbox: r.sandbox, createdAt: r.createdAt }));
  const matches = (await listMatches()).map((m) => ({ id: m.id, status: m.status, score: m.score, blockers: m.blockers.length, createdAt: m.createdAt }));
  return {
    readiness: { total: cases.length, awaitingPayment: cases.filter((c) => c.payment !== "paid").length, withCounsel: cases.filter((c) => c.status === "legal_title_check_pending").length, cases },
    property: { total: prop.length, counselPending: prop.filter((p) => p.legal === "with_counsel" || p.status === "counsel_review_pending").length, records: prop, matches },
    links: { readinessAdmin: "/admin/readiness", propertyAdmin: "/admin/property" },
  };
}

export async function integrationHealth() {
  const ob = await outboxStats();
  const jobs = await listJobs();
  const lastErrors = jobs.filter((j) => j.lastError && j.status !== "done").slice(0, 10).map((j) => ({ id: j.id, kind: j.kind, status: j.status, attempts: j.attempts, error: j.lastError, updatedAt: j.updatedAt }));
  const credits = await getProvider().getCreditStatus().catch(() => null);
  return {
    checkedAt: new Date().toISOString(),
    note: "Configured ≠ verified. Every item stays 'not verified live' until owner test evidence is recorded.",
    storage: { kv: kvConfigured ? "upstash" : "memory (NOT durable)", documents: s3Configured() ? "s3/r2 private bucket" : "local tmp sandbox (NOT durable)" },
    crm: { ghl: ghlConfigured ? "configured_unverified" : "log mode (not configured)", propertyPipelines: Boolean(process.env.GHL_PROP_SELLER_PIPELINE_ID && process.env.GHL_PROP_BUYER_PIPELINE_ID), readinessPipeline: Boolean(process.env.GHL_RR_PIPELINE_ID) },
    tracking: { metaCapi: capiConfigured, ga4Mp: ga4Configured, googleAdsUpload: googleAdsConfigured(), pixelsConsentGated: true },
    payments: { stripe: stripeConfigured(), paystack: paystackConfigured() },
    datamoon: { ...dmStatus(), provider: getProvider().mode, credits, recentWebhookEvents: (await dmEvents()).slice(0, 5), recentImports: (await listImports()).slice(0, 5).map((i) => ({ id: i.id, at: i.at, accepted: i.accepted, rejected: i.rejected, dryRun: i.dryRun, synthetic: i.synthetic })) },
    outbox: { ...ob, lastErrors, worker: process.env.CRON_SECRET ? "cron endpoint enabled (/api/cron/outbox)" : "manual (admin 'Run worker'); set CRON_SECRET + a scheduler" },
    admin: { enabled: opsEnabled(), staff: staffDefs().length, sessionCookie: "HttpOnly; SameSite=Strict" },
  };
}
