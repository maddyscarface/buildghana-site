import { describe, expect, it } from "vitest";
import { estimateConfig } from "@/config/estimate";
import { budgetRanges, startTimelines } from "@/lib/lead/options";

describe("qualifier ids align with the lead options", () => {
  it("budget band ids are budget_range values and start ids are start_timeline values", () => {
    const b = budgetRanges.map((o) => o.value);
    const s = startTimelines.map((o) => o.value);
    for (const band of estimateConfig.budgetBands) expect(b).toContain(band.id);
    for (const o of estimateConfig.startOptions) expect(s).toContain(o.id);
  });
  it("price guide link points at the rendered price-guide section", () => {
    expect(estimateConfig.priceGuidePath).toBe("/build-in-ghana#price-guide");
  });
});
