import defaultConfig from "@/config/lead-scoring.json";
import type { Lead } from "./schema";

export type ScoringConfig = typeof defaultConfig;
export type Tier = "priority" | "standard" | "nurture";

export type ScoreResult = {
  score: number;
  tier: Tier;
  breakdown: Record<string, number>;
  tag: string;
  configVersion: string;
};

/** Loads scoring rules: env override (admin-editable without deploy) → JSON file. */
export function loadScoringConfig(): ScoringConfig {
  const raw = process.env.LEAD_SCORING_JSON;
  if (raw && raw.trim()) {
    try {
      const parsed = JSON.parse(raw) as ScoringConfig;
      if (parsed?.thresholds && parsed?.weights) return parsed;
      console.warn("[scoring] LEAD_SCORING_JSON missing thresholds/weights — using defaults");
    } catch {
      console.warn("[scoring] LEAD_SCORING_JSON is not valid JSON — using defaults");
    }
  }
  return defaultConfig;
}

const pick = (table: Record<string, number>, key: string | undefined) => (key && table[key]) || 0;

type ScorableLead = Pick<
  Lead,
  "budget_range" | "land_status" | "start_timeline" | "project_stage" | "services" |
  "phone" | "ghana_city" | "project_description" | "documents_available" | "construction_type"
>;

export function scoreLead(lead: ScorableLead, config: ScoringConfig = loadScoringConfig()): ScoreResult {
  const w = config.weights;
  const breakdown: Record<string, number> = {
    budget: pick(w.budget, lead.budget_range),
    land_status: pick(w.land_status, lead.land_status),
    start_timeline: pick(w.start_timeline, lead.start_timeline),
    project_stage: pick(w.project_stage, lead.project_stage),
    service_fit: Math.min(
      w.service_fit_max,
      Math.max(0, ...(lead.services ?? []).map((s) => pick(w.service_fit as Record<string, number>, s))),
    ),
  };

  const c = config.completeness;
  let completeness = 0;
  for (const f of c.fields) {
    const v = (lead as Record<string, unknown>)[f];
    if (f === "project_description") {
      if (typeof v === "string" && v.trim().length >= c.description_min_chars) completeness += c.points_per_field;
    } else if (Array.isArray(v) ? v.length > 0 : typeof v === "string" ? v.trim().length > 0 : Boolean(v)) {
      completeness += c.points_per_field;
    }
  }
  breakdown.completeness = completeness;

  const score = Math.max(0, Math.min(100, Object.values(breakdown).reduce((a, b) => a + b, 0)));
  const tier: Tier =
    score >= config.thresholds.priority ? "priority" : score >= config.thresholds.standard ? "standard" : "nurture";

  return { score, tier, breakdown, tag: config.routing[tier].tag, configVersion: config.version };
}
