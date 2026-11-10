import { beforeEach, describe, expect, it, vi } from "vitest";
import { leadSchema } from "@/lib/lead/schema";
import { scoreLead } from "@/lib/lead/scoring";
import scoringConfig from "@/config/lead-scoring.json";
import { processLead } from "@/lib/server/process-lead";
import { __resetMemoryStore } from "@/lib/server/kv";
import { buildCapiPayload } from "@/lib/server/meta-capi";
import { sha256 } from "@/lib/server/hash";

const NOW = 1_800_000_000_000;

const valid = (over: Record<string, unknown> = {}) => ({
  submission_id: "3f0e7c2a-1b2c-4d5e-8f90-123456789abc",
  funnel: "new_home",
  first_name: "Ama",
  last_name: "Mensah",
  email: "Ama.Mensah@Example.com ",
  phone: "+1 617 555 0100",
  whatsapp_same: true,
  current_country: "US",
  ghana_region: "Greater Accra",
  ghana_city: "East Legon",
  land_status: "owned_documented",
  project_stage: "permits",
  construction_type: "single_family",
  budget_range: "200k_400k",
  start_timeline: "0_3m",
  services: ["construction_management"],
  project_description: "Four-bedroom two-storey home on a documented plot; drawings complete and permit submitted.",
  documents_available: ["title_docs", "drawings"],
  consent_contact: true,
  consent_marketing: false,
  consent_sms_whatsapp: false,
  company_website: "",
  form_started_at: NOW - 60_000,
  attribution: { utm_source: "google", gclid: "abc123" },
  ...over,
});

const ctx = { ip: "203.0.113.5", userAgent: "vitest", now: NOW };

describe("form validation", () => {
  it("accepts a complete valid submission and normalises email", () => {
    const r = leadSchema.safeParse(valid());
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.email).toBe("ama.mensah@example.com");
  });

  it("rejects invalid email", () => {
    expect(leadSchema.safeParse(valid({ email: "not-an-email" })).success).toBe(false);
  });

  it("rejects missing contact consent", () => {
    const r = leadSchema.safeParse(valid({ consent_contact: false }));
    expect(r.success).toBe(false);
  });

  it("rejects unknown option values", () => {
    expect(leadSchema.safeParse(valid({ budget_range: "1m_plus" })).success).toBe(false);
    expect(leadSchema.safeParse(valid({ ghana_region: "Lagos" })).success).toBe(false);
  });

  it("requires at least one service", () => {
    expect(leadSchema.safeParse(valid({ services: [] })).success).toBe(false);
  });

  it("allows empty phone but rejects malformed phone", () => {
    expect(leadSchema.safeParse(valid({ phone: "" })).success).toBe(true);
    expect(leadSchema.safeParse(valid({ phone: "call me maybe" })).success).toBe(false);
  });

  it("rejects unexpected extra fields (strict)", () => {
    expect(leadSchema.safeParse(valid({ ethnicity: "x" })).success).toBe(false);
  });

  it("rejects non-uuid submission ids", () => {
    expect(leadSchema.safeParse(valid({ submission_id: "123" })).success).toBe(false);
  });
});

describe("lead scoring", () => {
  it("scores a strong lead as priority", () => {
    const r = scoreLead(leadSchema.parse(valid()), scoringConfig);
    expect(r.tier).toBe("priority");
    expect(r.score).toBeGreaterThanOrEqual(70);
    expect(r.score).toBeLessThanOrEqual(100);
  });

  it("scores an early-stage lead as nurture", () => {
    const r = scoreLead(leadSchema.parse(valid({
      budget_range: "not_sure", land_status: "searching", start_timeline: "12m_plus", project_stage: "planning",
      services: ["not_sure"], phone: "", ghana_city: "", project_description: "", documents_available: [],
    })), scoringConfig);
    expect(r.tier).toBe("nurture");
  });

  it("does not change score based on country of residence", () => {
    const a = scoreLead(leadSchema.parse(valid({ current_country: "US" })), scoringConfig);
    const b = scoreLead(leadSchema.parse(valid({ current_country: "GB" })), scoringConfig);
    expect(a.score).toBe(b.score);
  });

  it("respects admin override via LEAD_SCORING_JSON", async () => {
    const { loadScoringConfig } = await import("@/lib/lead/scoring");
    vi.stubEnv("LEAD_SCORING_JSON", JSON.stringify({ ...scoringConfig, thresholds: { priority: 102, standard: 101 } }));
    const r = scoreLead(leadSchema.parse(valid()), loadScoringConfig());
    expect(r.tier).toBe("nurture");
    vi.unstubAllEnvs();
  });
});

describe("processLead", () => {
  beforeEach(() => __resetMemoryStore());

  it("stores a valid lead without CRM credentials and reports integrations as skipped", async () => {
    const r = await processLead(valid(), ctx);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.duplicate).toBe(false);
      expect(r.integrations.ghl).toBe("skipped");
      expect(r.integrations.meta_capi).toBe("skipped");
    }
  });

  it("is idempotent: the same submission id is processed once", async () => {
    const first = await processLead(valid(), ctx);
    const second = await processLead(valid(), ctx);
    expect(first.ok && !first.duplicate).toBe(true);
    expect(second.ok && second.duplicate).toBe(true);
  });

  it("silently drops honeypot submissions", async () => {
    const r = await processLead(valid({ company_website: "http://spam" }), ctx);
    expect(r.ok && r.integrations.spam).toBe("honeypot");
  });

  it("silently drops submissions completed too fast", async () => {
    const r = await processLead(valid({ form_started_at: NOW - 500 }), ctx);
    expect(r.ok && r.integrations.spam).toBe("too_fast");
  });

  it("returns field errors for invalid input", async () => {
    const r = await processLead(valid({ email: "bad" }), ctx);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.fieldErrors?.email).toBeTruthy();
  });
});

describe("Meta CAPI payload", () => {
  it("hashes PII and carries the shared event_id", () => {
    const p = buildCapiPayload({ eventName: "Lead", eventId: "evt-1", user: { email: " Ama@Example.com", phone: "+1 (617) 555-0100", country: "US" } });
    const d = p.data[0];
    expect(d.event_id).toBe("evt-1");
    expect((d.user_data as { em: string[] }).em[0]).toBe(sha256("ama@example.com"));
    expect((d.user_data as { ph: string[] }).ph[0]).toBe(sha256("16175550100"));
    expect(JSON.stringify(p)).not.toContain("Ama@Example.com");
  });
});
