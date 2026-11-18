import { describe, expect, it } from "vitest";
import type { Game } from "../types";
import { deriveSeriesName, seriesGroups } from "./series";

function game(partial: Partial<Game> & Pick<Game, "id" | "title">): Game {
  return {
    coverUrl: null, system: "PS1", year: 1998, releaseDate: "", region: "", genre: "", category: "",
    tier: "B", tierSource: "", playability: "", playtime: "", playtimeBucket: "unbekannt", rating: null, series: "",
    tags: [], cyberpunk: "", preservation: "", why: "", summary: "", special: "", history: "", world: "", emulator: "",
    notes: "", sourceLabel: "", sourceUrl: null, origin: "", status: "Offen", tierSourceEn: "", whyEn: "", summaryEn: "",
    specialEn: "", historyEn: "", worldEn: "", emulatorEn: "", regionDetailsEn: "", regionDetails: "", art: "",
    favorite: false, developer: "", country: "", ...partial,
  };
}

describe("series grouping", () => {
  it("prefers the Serie column and only derives groups of two or more", () => {
    expect(deriveSeriesName("Metal Gear Solid 2: Sons of Liberty")).toBe("Metal Gear Solid");
    expect(deriveSeriesName("Ghost in the Shell: Stand Alone Complex")).toBe("Ghost in the Shell");
    const groups = seriesGroups([
      game({ id: "1", title: "Shin Megami Tensei", series: "Shin Megami Tensei" }),
      game({ id: "2", title: "Shin Megami Tensei If...", series: "Shin Megami Tensei", system: "SNES" }),
      game({ id: "3", title: "Metal Gear Solid", system: "PS1" }),
      game({ id: "4", title: "Metal Gear Solid 2", system: "PS2" }),
      game({ id: "5", title: "Alien Soldier" }),
    ]);
    expect(groups.map((group) => group.name)).toEqual(["Metal Gear Solid", "Shin Megami Tensei"]);
    expect(groups.find((group) => group.name === "Shin Megami Tensei")?.derived).toBe(false);
    expect(groups.find((group) => group.name === "Metal Gear Solid")?.games).toHaveLength(2);
  });
});
