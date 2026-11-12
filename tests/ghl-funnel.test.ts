import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { planForwardOnly } from "@/config/ghl-pipelines";

const STAGES = { new_inquiry: "s_new", intake_started: "s_intake", payment_pending: "s_pay", paid_review: "s_paid", won: "s_won", lost: "s_lost" };
const uuid = () => crypto.randomUUID();

describe("forward-only GHL policy (new_inquiry / intake_started)", () => {
  it("creates when the contact has no opportunity in the pipeline", () => {
    expect(planForwardOnly(undefined, "new_inquiry", STAGES, false)).toBe("create");
  });
  it("moves forward from an earlier stage only", () => {
    expect(planForwardOnly("s_new", "intake_started", STAGES, true)).toBe("move");
    expect(planForwardOnly("s_intake", "intake_started", STAGES, true)).toBe("keep");
    expect(planForwardOnly("s_paid", "intake_started", STAGES, true)).toBe("keep");
    expect(planForwardOnly("s_intake", "new_inquiry", STAGES, true)).toBe("keep");
  });
  it("never reopens closed or unknown-stage opportunities", () => {
    expect(planForwardOnly("s_won", "new_inquiry", STAGES, true)).toBe("keep");
    expect(planForwardOnly("s_lost", "intake_started", STAGES, true)).toBe("keep");
    expect(planForwardOnly("s_other_pipeline_stage", "intake_started", STAGES, true)).toBe("keep");
  });
});

describe("draft start (no GHL configured)", () => {
  beforeEach(() => { vi.resetModules(); });
  it("is recorded once per email (case/space-insensitive) and validates input", async () => {
    const { registerDraftStart } = await import("@/lib/readiness/draft");
    const base = { submission_id: uuid(), first_name: "Ama", last_name: "Mensah", email: `ama.${Date.now()}@example.com` };
    expect(await registerDraftStart(base)).toEqual({ ok: true, first: true, crm: "skipped" });
    expect(await registerDraftStart({ ...base, submission_id: uuid(), email: `  ${base.email.toUpperCase()} ` })).toEqual({ ok: true, first: false, crm: "duplicate" });
    expect((await registerDraftStart({ ...base, email: "not-an-email" })).ok).toBe(false);
    expect((await registerDraftStart({ ...base, email: "bot@example.com", company_website: "spam" })).ok).toBe(false);
  });
});

type Call = { method: string; url: string; body?: Record<string, unknown> };
function mockGhl(existing: { id: string; pipelineId: string; pipelineStageId: string } | null) {
  const calls: Call[] = [];
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    const method = init?.method || "GET";
    calls.push({ method, url: String(url), body: init?.body ? JSON.parse(String(init.body)) : undefined });
    let out: unknown = {};
    if (String(url).includes("/contacts/upsert")) out = { contact: { id: "c_1" } };
    else if (String(url).includes("/opportunities/search")) out = { opportunities: existing ? [existing] : [] };
    else if (method === "POST" && String(url).endsWith("/opportunities/")) out = { opportunity: { id: "o_new" } };
    return new Response(JSON.stringify(out), { status: 200, headers: { "Content-Type": "application/json" } });
  });
  vi.stubGlobal("fetch", fetchMock);
  return calls;
}
const oppWrites = (calls: Call[]) => calls.filter((c) => c.url.includes("/opportunities") && !c.url.includes("/search"));

describe("GHL wiring (configured, mocked API)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("GHL_PRIVATE_TOKEN", "test-token");
    vi.stubEnv("GHL_LOCATION_ID", "loc_1");
    vi.stubEnv("GHL_RR_PIPELINE_ID", "p_rr");
    vi.stubEnv("GHL_RR_STAGE_IDS", JSON.stringify(STAGES));
    vi.stubEnv("GHL_PIPELINE_ID", "");
  });
  afterEach(() => { vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

  it("first draft save creates an 'intake started' opportunity; repeats make no API calls", async () => {
    const calls = mockGhl(null);
    const { registerDraftStart } = await import("@/lib/readiness/draft");
    const d = { submission_id: uuid(), first_name: "Kofi", last_name: "Boateng", email: `kofi.${Date.now()}@example.com` };
    expect(await registerDraftStart(d)).toEqual({ ok: true, first: true, crm: "ok" });
    const w = oppWrites(calls);
    expect(w).toHaveLength(1);
    expect(w[0].method).toBe("POST");
    expect(w[0].body).toMatchObject({ pipelineId: "p_rr", pipelineStageId: "s_intake", contactId: "c_1" });
    // contact payload carries no parcel/document data
    const contact = calls.find((c) => c.url.includes("/contacts/upsert"))!.body!;
    expect(JSON.stringify(contact)).not.toMatch(/parcel|indenture|deed|budget/i);
    const n = calls.length;
    expect(await registerDraftStart({ ...d, submission_id: uuid() })).toMatchObject({ ok: true, first: false });
    expect(calls.length).toBe(n);
  });

  it("a draft from an existing paid client does not move their opportunity back", async () => {
    const calls = mockGhl({ id: "o_paid", pipelineId: "p_rr", pipelineStageId: "s_paid" });
    const { registerDraftStart } = await import("@/lib/readiness/draft");
    await registerDraftStart({ submission_id: uuid(), first_name: "Efua", last_name: "Asante", email: `efua.${Date.now()}@example.com` });
    expect(oppWrites(calls)).toHaveLength(0);
  });

  it("a draft moves a 'new inquiry' opportunity forward to 'intake started'", async () => {
    const calls = mockGhl({ id: "o_new", pipelineId: "p_rr", pipelineStageId: "s_new" });
    const { registerDraftStart } = await import("@/lib/readiness/draft");
    await registerDraftStart({ submission_id: uuid(), first_name: "Yaw", last_name: "Mensah", email: `yaw.${Date.now()}@example.com` });
    const w = oppWrites(calls);
    expect(w).toHaveLength(1);
    expect(w[0]).toMatchObject({ method: "PUT", url: expect.stringContaining("/opportunities/o_new") });
    expect(w[0].body).toMatchObject({ pipelineStageId: "s_intake" });
  });

  const lead = () => ({
    submission_id: uuid(), funnel: "new_home", first_name: "Ama", last_name: "Mensah", email: "ama@example.com", phone: "+16175550100",
    whatsapp_same: true, current_country: "US", ghana_region: "Greater Accra", ghana_city: "East Legon", land_status: "owned_documented",
    project_stage: "permits", construction_type: "single_family", budget_range: "200k_400k", start_timeline: "0_3m",
    services: ["construction_management"], project_description: "x", documents_available: [], consent_contact: true,
    consent_marketing: false, consent_sms_whatsapp: false, company_website: "", form_started_at: 0, attribution: {},
  });
  const score = { score: 80, tier: "priority", tag: "lead-priority", breakdown: {} };

  it("a general lead enters the pipeline at 'new inquiry'", async () => {
    const calls = mockGhl(null);
    const { syncLeadToGhl } = await import("@/lib/server/ghl");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const r = await syncLeadToGhl(lead() as any, score as any, "lead_1");
    expect(r.status).toBe("ok");
    const w = oppWrites(calls);
    expect(w).toHaveLength(1);
    expect(w[0].body).toMatchObject({ pipelineId: "p_rr", pipelineStageId: "s_new", status: "open" });
  });

  it("a general lead never drags an existing readiness opportunity back to 'new inquiry'", async () => {
    const calls = mockGhl({ id: "o_pay", pipelineId: "p_rr", pipelineStageId: "s_pay" });
    const { syncLeadToGhl } = await import("@/lib/server/ghl");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await syncLeadToGhl(lead() as any, score as any, "lead_2");
    expect(oppWrites(calls)).toHaveLength(0);
  });
});
