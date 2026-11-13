import "server-only";
import { kv } from "@/lib/server/kv";
import type { AnyRecord, AuditEntry, BuyerRequirement, Introduction, Match, PrivacyRequest, PropertyAsset, PropertyLead, SellerAuthorization, VerificationTask } from "./model";

/**
 * KV persistence for the private property marketplace (Upstash in production, memory in sandbox).
 * Table-equivalents (see db/property-schema.sql): property_leads, buyer_requirements, seller_authorizations,
 * property_assets, matches, introductions, verification_tasks, audit_log (+ privacy_requests).
 * Every key is prefixed "pp:" and NOTHING here is reachable from a public route without staff auth,
 * except the narrow sanitised projection in public.ts.
 */
export const PK = {
  seller: (id: string) => `pp:seller:${id}`,
  buyer: (id: string) => `pp:buyer:${id}`,
  sellers: "pp:idx:sellers",
  buyers: "pp:idx:buyers",
  auth: (id: string) => `pp:auth:${id}`,
  authFor: (propertyId: string) => `pp:authfor:${propertyId}`,
  asset: (id: string) => `pp:asset:${id}`,
  match: (id: string) => `pp:match:${id}`,
  matches: "pp:idx:matches",
  matchPair: (p: string, b: string) => `pp:pair:${p}:${b}`,
  intro: (id: string) => `pp:intro:${id}`,
  intros: "pp:idx:intros",
  task: (id: string) => `pp:task:${id}`,
  tasksFor: (recordId: string) => `pp:tasks:${recordId}`,
  request: (id: string) => `pp:req:${id}`,
  requests: "pp:idx:requests",
  audit: (entity: string) => `pp:audit:${entity}`,
  auditAll: "pp:audit:all",
  submission: (sid: string) => `pp:sub:${sid}`,
  owner: (kind: string, key: string) => `pp:owner:${kind}:${key}`,
  parcel: (key: string) => `pp:parcel:${key}`,
  compliance: "pp:compliance",
  events: "pp:events",
};

const getJson = async <T>(k: string): Promise<T | null> => { const raw = await kv.get(k); return raw ? (JSON.parse(raw) as T) : null; };
const setJson = (k: string, v: unknown) => kv.set(k, JSON.stringify(v));
const now = () => new Date().toISOString();

export async function saveRecord(r: AnyRecord) { r.updatedAt = now(); await setJson(r.kind === "seller" ? PK.seller(r.id) : PK.buyer(r.id), r); }
export const getSeller = (id: string) => getJson<PropertyLead>(PK.seller(id));
export const getBuyer = (id: string) => getJson<BuyerRequirement>(PK.buyer(id));
export const getRecord = (kind: "seller" | "buyer", id: string) => (kind === "seller" ? getSeller(id) : getBuyer(id)) as Promise<AnyRecord | null>;

async function listByIndex<T>(idx: string, get: (id: string) => Promise<T | null>, limit = 300) {
  const ids = [...new Set(await kv.lrange(idx, 0, limit - 1))];
  return (await Promise.all(ids.map(get))).filter(Boolean) as T[];
}
export const listSellers = () => listByIndex(PK.sellers, getSeller);
export const listBuyers = () => listByIndex(PK.buyers, getBuyer);
export async function indexRecord(r: AnyRecord) { await kv.lpush(r.kind === "seller" ? PK.sellers : PK.buyers, r.id); }

export async function saveAuthorization(a: SellerAuthorization) { await setJson(PK.auth(a.id), a); await kv.set(PK.authFor(a.propertyId), a.id); }
export async function currentAuthorization(propertyId: string) {
  const id = await kv.get(PK.authFor(propertyId));
  return id ? getJson<SellerAuthorization>(PK.auth(id)) : null;
}

export const saveAsset = (a: PropertyAsset) => setJson(PK.asset(a.id), a);
export const getAsset = (id: string) => getJson<PropertyAsset>(PK.asset(id));

export const saveMatch = (m: Match) => { m.updatedAt = now(); return setJson(PK.match(m.id), m); };
export const getMatch = (id: string) => getJson<Match>(PK.match(id));
export const listMatches = () => listByIndex(PK.matches, getMatch, 500);
export async function claimPair(p: string, b: string, matchId: string) { return kv.setNX(PK.matchPair(p, b), matchId, 60 * 60 * 24 * 365 * 3); }
export const pairMatchId = (p: string, b: string) => kv.get(PK.matchPair(p, b));

export const saveIntro = (i: Introduction) => setJson(PK.intro(i.id), i);
export const listIntros = () => listByIndex(PK.intros, (id) => getJson<Introduction>(PK.intro(id)), 500);

export const saveTask = (t: VerificationTask) => { t.updatedAt = now(); return setJson(PK.task(t.id), t); };
export const getTask = (id: string) => getJson<VerificationTask>(PK.task(id));
export async function tasksFor(recordId: string) { return listByIndex(PK.tasksFor(recordId), getTask, 100); }

export const saveRequest = (r: PrivacyRequest) => setJson(PK.request(r.id), r);
export const getRequest = (id: string) => getJson<PrivacyRequest>(PK.request(id));
export const listRequests = () => listByIndex(PK.requests, getRequest, 300);

export async function audit(entity: string, actor: AuditEntry["actor"], action: string, detail?: Record<string, unknown>) {
  const e: AuditEntry = { at: now(), actor, action, entity, detail };
  const s = JSON.stringify(e);
  await kv.lpush(PK.audit(entity), s);
  await kv.lpush(PK.auditAll, s);
}
export async function getAudit(entity: string) { return (await kv.lrange(PK.audit(entity), 0, 199)).map((s) => JSON.parse(s) as AuditEntry); }

export async function getCompliance(): Promise<Record<string, { done: boolean; note?: string; by?: string; at?: string }>> {
  return (await getJson(PK.compliance)) ?? {};
}
export const setCompliance = (v: Record<string, { done: boolean; note?: string; by?: string; at?: string }>) => setJson(PK.compliance, v);

/** Server-side event log (match_reviewed, introduction_approved…) — ids and coarse fields only. */
export async function logEvent(name: string, detail: Record<string, string | number | boolean | undefined>) {
  await kv.lpush(PK.events, JSON.stringify({ at: now(), name, ...detail }));
}
export async function listEvents() { return (await kv.lrange(PK.events, 0, 199)).map((s) => JSON.parse(s) as Record<string, unknown>); }
