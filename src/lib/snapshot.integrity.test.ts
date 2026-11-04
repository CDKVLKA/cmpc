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
    expect(land).toHaveProperty("releaseDate", "");
    expect(land).toHaveProperty("summary", "");
    expect(snapshot).not.toHaveProperty("mixtapes");
    expect(snapshot.translations.Status?.Offen).toBe("Open");
    expect(snapshot.translations["Spielbarkeit RG477V"]?.["🟢 Sehr gut"]).toBe("🟢 Very good");
  });
});
