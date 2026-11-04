import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import type { Snapshot } from "../types";

describe("public snapshot", () => {
  const snapshot = JSON.parse(readFileSync("public/snapshot.json", "utf8")) as Snapshot;

  it("contains the full list, read by header, without private notes", () => {
    expect(snapshot.gameCount).toBeGreaterThan(1600);
    expect(snapshot.games).toHaveLength(snapshot.gameCount);
    expect(snapshot.headers).toContain("ID");
    expect(snapshot.headers).toContain("Titel");
    expect(snapshot.games.every((game) => game.notes === "")).toBe(true);
    const raw = JSON.stringify(snapshot);
    expect(raw).not.toContain("andere Version: MSX2");
    expect(raw).not.toContain("schwacher Lizenz-Filler");
    const land = snapshot.games.find((game) => game.id === "SMS-0001");
    expect(land?.title).toMatch(/Land of Illusion/);
    expect(land?.coverUrl).toMatch(/^https:\/\//);
    expect(land?.system).toBe("Master System");
    expect(land?.releaseDate).toBe("");
    expect(land?.summary).toMatch(/Micky/);
    expect(land?.summaryEn).toMatch(/Mickey/);
    expect(land?.world).toMatch(/Clinton/);
    expect(land?.worldEn.length).toBeGreaterThan(20);
    const dated = snapshot.games.filter((game) => game.releaseDate);
    expect(dated).toHaveLength(1224);
    expect(dated.every((game) => /^\d{4}-\d{2}-\d{2}$/.test(game.releaseDate))).toBe(true);
    expect(snapshot.games.every((game) => game.summary && game.summaryEn && game.special && game.specialEn && game.history && game.historyEn && game.world && game.worldEn)).toBe(true);
    expect(snapshot).not.toHaveProperty("mixtapes");
    expect(snapshot.translations.Status?.Offen).toBe("Open");
    expect(snapshot.translations["Spielbarkeit RG477V"]?.["🟢 Sehr gut"]).toBe("🟢 Very good");
  });
});
