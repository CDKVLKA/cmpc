import { describe, expect, it } from "vitest";
import type { Game } from "../types";
import { gameOrigin, originForNumeric, originNumeric } from "./origin";

function game(partial: Partial<Game>): Game {
  return {
    id: "1", title: "Test", coverUrl: null, system: "PS1", year: 1998, releaseDate: "", region: "JP · US · EU",
    genre: "", category: "", tier: "B", tierSource: "", playability: "", playtime: "", playtimeBucket: "unbekannt",
    rating: null, series: "", tags: [], cyberpunk: "", preservation: "", why: "", summary: "", special: "", history: "",
    world: "", emulator: "", notes: "", sourceLabel: "", sourceUrl: null, origin: "Grundauswahl", status: "Offen",
    tierSourceEn: "", whyEn: "", summaryEn: "", specialEn: "", historyEn: "", worldEn: "", emulatorEn: "",
    regionDetailsEn: "", regionDetails: "", art: "", favorite: false, developer: "", country: "", ...partial,
  };
}

describe("game origin", () => {
  it("ignores curation notes in Herkunft and uses a real country, developer, series, or a single market", () => {
    expect(gameOrigin(game({ origin: "Grundauswahl", title: "Alien Soldier" }))).toBe("Unknown");
    expect(gameOrigin(game({ country: "Japan", title: "Anything" }))).toBe("Japan");
    expect(gameOrigin(game({ developer: "Atlus", title: "Anything" }))).toBe("Japan");
    expect(gameOrigin(game({ origin: "Frankreich", title: "Anything" }))).toBe("France");
    expect(gameOrigin(game({ series: "Metal Gear", title: "Metal Gear Solid" }))).toBe("Japan");
    expect(gameOrigin(game({ region: "US", title: "Odd Title" }))).toBe("USA");
    expect(gameOrigin(game({ region: "JP · US · EU", title: "Odd Title" }))).toBe("Unknown");
  });

  it("maps German country names onto ISO numeric ids used by the globe", () => {
    expect(gameOrigin(game({ country: "Deutschland" }))).toBe("Germany");
    expect(gameOrigin(game({ country: "Großbritannien" }))).toBe("UK");
    expect(gameOrigin(game({ country: "Südkorea" }))).toBe("Korea");
    expect(gameOrigin(game({ country: "Polen" }))).toBe("Poland");
    expect(gameOrigin(game({ country: "Österreich" }))).toBe("Austria");
    expect(originNumeric("Japan")).toBe("392");
    expect(originNumeric("Germany")).toBe("276");
    expect(originNumeric("Europe")).toBeNull();
    expect(originNumeric("Unknown")).toBeNull();
    expect(originForNumeric("392")).toBe("Japan");
    expect(originForNumeric("036")).toBe("Australia");
  });
});
