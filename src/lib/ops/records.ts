import "server-only";
import { kv } from "@/lib/server/kv";
import { getCase, listCaseIds } from "@/lib/readiness/store";
import { listBuyers, listSellers } from "@/lib/property/store";
import { listVendorContacts } from "@/lib/datamoon/store";
import { BRAND_ID } from "./brand";
import { listProjects } from "./store";
import type { RecordType } from "./model";

/**
 * Unified, searchable record index across first-party leads, paid Readiness Review cases, property
 * sellers/buyers, ops projects and (separately labelled) DataMoon vendor prospects.
 * Legacy Phase 2/3 namespaces (lead:*, rr:*, pp:*) belong to this deployment's brand by construction.
 * PII is masked unless the caller has records.read_pii; free-text search over PII also requires it.
 */
export type RecordSummary = {
  type: RecordType; id: string; brand: string; reference: string; createdAt: string; status: string; secondary?: string;
  name: string; email: string; market: "ghana" | "abroad" | "unknown" | "us"; source: string; sandbox: boolean; crm?: string;
  firstParty: boolean;
};

export const maskEmail = (e?: string) => { if (!e || !e.includes("@")) return ""; const [u, d] = e.split("@"); return `${u.slice(0, 1)}***@${d}`; };
export const maskName = (f?: string, l?: string) => [f, l].filter(Boolean).map((x) => `${x!.slice(0, 1)}.`).join(" ");
const market = (country?: string): RecordSummary["market"] => (!country ? "unknown" : country === "GH" ? "ghana" : "abroad");

type Raw = RecordSummary & { _name: string; _email: string };

async function collect(): Promise<Raw[]> {
  const out: Raw[] = [];
  const leadIds = [...new Set(await kv.lrange("leads:index", 0, 499))];
  for (const id of leadIds) {
    const raw = await kv.get(`lead:data:${id}`); if (!raw) continue;
    const r = JSON.parse(raw) as { leadId: string; receivedAt: string; lead: Record<string, any>; score?: { tier?: string } };
    const l = r.lead;
    out.push({ type: "lead", id: r.leadId, brand: BRAND_ID, reference: `L-${r.leadId.slice(0, 6).toUpperCase()}`, createdAt: r.receivedAt, status: r.score?.tier || "new", secondary: l.funnel,
      name: "", email: "", _name: `${l.first_name ?? ""} ${l.last_name ?? ""}`.trim(), _email: l.email ?? "", market: market(l.current_country), source: l.attribution?.utm_source || "direct", sandbox: false, firstParty: true });
  }
  for (const id of [...new Set(await listCaseIds(500))]) {
    const c = await getCase(id); if (!c) continue;
    out.push({ type: "readiness", id: c.id, brand: BRAND_ID, reference: c.caseNumber, createdAt: c.createdAt, status: c.status, secondary: `${c.paymentStatus} · title ${c.titleStatus}`,
      name: "", email: "", _name: `${c.contact.firstName} ${c.contact.lastName}`, _email: c.contact.email, market: market(c.contact.country), source: c.attribution?.utm_source || "direct", sandbox: c.sandbox, crm: c.crm?.lastResult, firstParty: true });
  }
  for (const r of [...(await listSellers()), ...(await listBuyers())]) {
    if (r.deletedAt) continue;
    out.push({ type: r.kind === "seller" ? "property_seller" : "property_buyer", id: r.id, brand: BRAND_ID, reference: r.reference, createdAt: r.createdAt, status: r.status, secondary: `legal ${r.legalState}`,
      name: "", email: "", _name: `${r.contact.firstName} ${r.contact.lastName}`, _email: r.contact.email, market: market(r.contact.residenceCountry), source: r.attribution?.utm_source || "direct", sandbox: r.sandbox, crm: r.crm?.lastResult, firstParty: true });
  }
  for (const p of await listProjects()) {
    out.push({ type: "project", id: p.id, brand: p.brand, reference: p.reference, createdAt: p.createdAt, status: p.status, secondary: p.type, name: "", email: "", _name: p.title, _email: "", market: p.market, source: "staff", sandbox: p.sandbox, firstParty: true });
  }
  for (const v of await listVendorContacts()) {
    out.push({ type: "vendor_prospect", id: v.id, brand: v.brand, reference: v.contactId, createdAt: v.importedAt, status: v.status, secondary: `recipe ${v.recipeId}`, name: "", email: "",
      _name: `${v.firstName ?? ""} ${v.lastName ?? ""}`.trim(), _email: v.email ?? "", market: "us", source: v.synthetic ? "DataMoon (synthetic fixture)" : "DataMoon", sandbox: v.synthetic, crm: v.crm?.status, firstParty: false });
  }
  return out.filter((r) => r.brand === BRAND_ID);
}

export type RecordQuery = { q?: string; type?: string; status?: string; source?: string; market?: string; from?: string; to?: string; firstParty?: "1" | "0"; limit?: number };

export async function searchRecords(query: RecordQuery, opts: { pii: boolean }) {
  const all = await collect();
  const q = (query.q || "").trim().toLowerCase();
  const rows = all.filter((r) => {
    if (query.type && r.type !== query.type) return false;
    if (query.status && r.status !== query.status) return false;
    if (query.market && r.market !== query.market) return false;
    if (query.source && !r.source.toLowerCase().includes(query.source.toLowerCase())) return false;
    if (query.firstParty === "1" && !r.firstParty) return false;
    if (query.firstParty === "0" && r.firstParty) return false;
    if (query.from && r.createdAt < query.from) return false;
    if (query.to && r.createdAt.slice(0, 10) > query.to) return false;
    if (q) {
      const hay = [r.reference, r.id, r.status, r.secondary, r.type, ...(opts.pii ? [r._name, r._email] : [])].join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  }).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
  const total = rows.length;
  const page = rows.slice(0, Math.min(query.limit ?? 200, 500)).map(({ _name, _email, ...r }) => ({
    ...r,
    name: opts.pii ? _name : r.type === "project" ? _name : maskName(..._name.split(" ") as [string, string]),
    email: opts.pii ? _email : maskEmail(_email),
  }));
  return { total, rows: page };
}

const CSV_SAFE = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // spreadsheet formula injection guard
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
/** CSV of permitted fields only. Name/email columns are included only with records.read_pii. */
export function toCsv(rows: RecordSummary[], pii: boolean) {
  const cols: (keyof RecordSummary)[] = ["type", "reference", "createdAt", "status", "secondary", "market", "source", "firstParty", "sandbox", "crm", ...(pii ? (["name", "email"] as const) : [])];
  return [cols.join(","), ...rows.map((r) => cols.map((c) => CSV_SAFE(r[c])).join(","))].join("\n");
}
