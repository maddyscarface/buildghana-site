import "server-only";
import { kv } from "@/lib/server/kv";
import { syncLeadToGhl } from "@/lib/server/ghl";
import { syncPropertyToGhl } from "@/lib/property/crm";
import { getRecord, saveRecord } from "@/lib/property/store";
import { syncCaseToGhl } from "@/lib/readiness/crm";
import { getCase, saveCase } from "@/lib/readiness/store";
import { importJob } from "@/lib/datamoon/service";
import { syncVendorContact } from "@/lib/datamoon/ghl-map";
import type { Handler, JobKind } from "./outbox";

/** Outbox handlers: re-load the record by id and re-run the existing (unchanged) CRM sync functions. */
export const handlers: Partial<Record<JobKind, Handler>> = {
  "ghl.lead": async (job) => {
    const raw = await kv.get(`lead:data:${job.ref}`);
    if (!raw) return { status: "error", detail: "lead not found" };
    const rec = JSON.parse(raw);
    const r = await syncLeadToGhl(rec.lead, rec.score, job.ref);
    return r.status === "error" ? { status: "error", detail: r.error } : r.status === "skipped" ? { status: "skipped", detail: r.reason } : { status: "ok" };
  },
  "ghl.property": async (job) => {
    const kind = job.payload?.kind === "buyer" ? "buyer" : "seller";
    const r = await getRecord(kind, job.ref);
    if (!r) return { status: "error", detail: "record not found" };
    if (r.deletedAt) return { status: "ok", detail: "deleted — nothing to sync" };
    const s = await syncPropertyToGhl(r);
    r.crm = { ...(r.crm || {}), contactId: s.contactId ?? r.crm?.contactId, opportunityId: s.opportunityId ?? r.crm?.opportunityId, lastSync: new Date().toISOString(), lastResult: s.status };
    await saveRecord(r);
    return { status: s.status, detail: s.detail };
  },
  "ghl.readiness": async (job) => {
    const c = await getCase(job.ref);
    if (!c) return { status: "error", detail: "case not found" };
    const s = await syncCaseToGhl(c);
    c.crm = { contactId: s.contactId ?? c.crm?.contactId, opportunityId: s.opportunityId ?? c.crm?.opportunityId, lastSync: new Date().toISOString(), lastResult: s.status };
    await saveCase(c);
    return { status: s.status, detail: s.detail };
  },
  "datamoon.import": importJob,
  "datamoon.ghl_contact": (job) => syncVendorContact(job.ref),
};
