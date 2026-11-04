import { describe, expect, it } from "vitest";
import { aggregateHeatmaps } from "./heatmap";

describe("heatmap aggregation", () => {
  it("counts system by playability and tier, folding estimated tiers into S–D", () => {
    const rows = aggregateHeatmaps([
      { system: "SNES", playability: "🟢 Sehr gut", tier: "S" },
      { system: "SNES", playability: "🟢 Sehr gut", tier: "S (Einschätzung)" },
      { system: "SNES", playability: "🟡 Eingeschränkt", tier: "" },
      { system: "PC", playability: "🟡 Eingeschränkt", tier: "B" },
      { system: "PC", playability: "", tier: "unbewertet" },
    ]);
    expect(rows.map((row) => row.system)).toEqual(["SNES", "PC"]);
    expect(rows[0]).toMatchObject({
      total: 3,
      play: { "🟢 Sehr gut": 2, "🟡 Eingeschränkt": 1 },
      tier: { S: 2, unbewertet: 1 },
    });
    expect(rows[1]?.play).toEqual({ "🟡 Eingeschränkt": 1 });
    expect(rows[1]?.tier).toEqual({ B: 1, unbewertet: 1 });
    expect(rows[1]?.play[""]).toBeUndefined();
  });

  it("sorts by size and then by name", () => {
    const rows = aggregateHeatmaps([
      { system: "NES", playability: "🟢 Sehr gut", tier: "A" },
      { system: "Arcade", playability: "🟢 Sehr gut", tier: "A" },
    ]);
    expect(rows.map((row) => row.system)).toEqual(["Arcade", "NES"]);
  });
});
