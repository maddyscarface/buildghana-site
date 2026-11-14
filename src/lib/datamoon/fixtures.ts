/**
 * SYNTHETIC FIXTURES — not DataMoon data. Invented ids/names/emails (example.test) for testing the pipeline
 * without credentials. Topic names are illustrative hypotheses, NOT confirmed DataMoon topic ids.
 */
import type { CreditStatus, FeedSummary, Topic } from "./types";

export const FIXTURE_LABEL = "Synthetic fixture — not real DataMoon data";

export const fixtureTopics: Topic[] = [
  { kind: "b2c", id: "fx-b2c-1001", name: "International real estate investment (hypothesis)", category: "Real Estate", synthetic: true },
  { kind: "b2c", id: "fx-b2c-1002", name: "Buying land overseas (hypothesis)", category: "Real Estate", synthetic: true },
  { kind: "b2c", id: "fx-b2c-1003", name: "Home construction costs (hypothesis)", category: "Home & Garden", synthetic: true },
  { kind: "b2c", id: "fx-b2c-1004", name: "International travel planning (hypothesis)", category: "Travel", synthetic: true },
  { kind: "b2b", id: "fx-b2b-2001", name: "Real estate development (hypothesis)", category: "Real Estate", synthetic: true },
  { kind: "b2b", id: "fx-b2b-2002", name: "Construction project management (hypothesis)", category: "Construction", synthetic: true },
  { kind: "b2b", id: "fx-b2b-2003", name: "Property investment advisory (hypothesis)", category: "Finance", synthetic: true },
];

export const fixtureFeeds: FeedSummary[] = [
  { id: "00000000-0000-4000-8000-00000000f001", description: "[SYNTHETIC] US consumers researching overseas property", output_type: "consumer", lookback_days: 14, export_row_limit: 5000, export_rows_used: 0, export_rows_remaining: 5000, created_at: "2026-11-01T00:00:00Z", synthetic: true },
  { id: "00000000-0000-4000-8000-00000000f002", description: "[SYNTHETIC] US real estate investment firms", output_type: "business", lookback_days: 14, export_row_limit: null, export_rows_used: null, export_rows_remaining: null, created_at: "2026-11-01T00:00:00Z", synthetic: true },
];
/** Feed owned by another brand — used to prove cross-brand feed injection is rejected. */
export const FOREIGN_FEED_ID = "00000000-0000-4000-8000-00000000dc01";

export const fixtureCredits: CreditStatus = { record_limit: 10000, records_used: 0, remaining: 10000, reset_period: "lifetime", synthetic: true };

const hex = (n: number) => n.toString(16).padStart(16, "0");
/** Deterministic synthetic export rows (documented default columns + ext-style fields). */
export function fixtureRows(n = 6): Record<string, string>[] {
  const states = ["ny", "tx", "ga", "md", "nj", "ca"];
  return Array.from({ length: n }, (_, i) => ({
    contact_id: `id_${hex(0xa11ce000 + i)}`,
    md5: "", sha1: "", sha2: "",
    match_confidence: i % 2 ? "probabilistic" : "deterministic",
    first_name: `Test${i + 1}`, last_name: "Synthetic",
    personal_emails: `prospect${i + 1}@example.test`,
    personal_state: states[i % states.length], contact_country: "US",
  }));
}
