import { describe, expect, it } from "vitest";
import { H } from "../config";
import type { Game } from "../types";
import { curatedById } from "./curated";
import { berlinDate, gameOfTheDay } from "./daily";
import { decideRowChange, fingerprint } from "./mixtape";
import { headerIndex, parseGameRow, parseMixtapes } from "./parse";
import { emptyFilters } from "./query";
import { buildHash, parseHash } from "./route";
import { sysMeta } from "./systems";
import { parseReleaseDate } from "./text";

function game(partial: Partial<Game> & Pick<Game, "id" | "title" | "status">): Game {
  return {
    coverUrl: null, system: "SNES", year: 1994, releaseDate: "", region: "", genre: "JRPG", category: "Classic",
    tier: "B", tierSource: "", playability: "", playtime: "", playtimeBucket: "unbekannt", rating: null, series: "",
    tags: [], cyberpunk: "", preservation: "", why: "", summary: "", special: "", history: "", world: "", emulator: "",
    notes: "", sourceLabel: "", sourceUrl: null, origin: "", tierSourceEn: "", whyEn: "", summaryEn: "", specialEn: "",
    historyEn: "", worldEn: "", emulatorEn: "", regionDetailsEn: "", regionDetails: "", art: "", ...partial,
  };
}

describe("schema by header name", () => {
  it("reads Release-Datum and Kurzbeschreibung after the columns move", () => {
    const headers = ["Titel", "Release-Datum", "ID", "Kurzbeschreibung"];
    expect(headers.indexOf(H.releaseDate)).not.toBe(6);
    const parsed = parseGameRow(["Chrono Trigger", "1995-03-11", "SNES-0003", "Zeitreise"], headerIndex(headers));
    expect(parsed?.id).toBe("SNES-0003");
    expect(parsed?.releaseDate).toBe("1995-03-11");
    expect(parsed?.summary).toBe("Zeitreise");
  });

  it("parses dates and the Mixtapes header on row 3", () => {
    expect(parseReleaseDate("1995-03-11")).toBe("1995-03-11");
    expect(parseReleaseDate(null)).toBe("");
    expect(parseReleaseDate(34739)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const entries = parseMixtapes([
      ["Mixtapes – eigene Listen"],
      ["Beschreibung"],
      ["Mixtape", "Spiel-ID", "Titel", "System", "Reihenfolge", "Hinzugefügt"],
      ["Favoriten", "PC-0095", "Deus Ex", "PC", 2, "2026-11-01"],
    ]);
    expect(entries[0]).toMatchObject({ mixtape: "Favoriten", gameId: "PC-0095", order: 2, row: 4 });
  });
});

describe("game of the day and URLs", () => {
  const games = [
    game({ id: "B", title: "Beta", status: "Offen" }),
    game({ id: "A", title: "Alpha", status: "Nicht auffindbar" }),
    game({ id: "C", title: "Gamma", status: "Installiert" }),
  ];

  it("stays on Offen or Installiert and is stable for a Berlin day", () => {
    expect(berlinDate(new Date("2026-11-01T22:30:00Z"))).toBe("2026-11-01");
    expect(berlinDate(new Date("2026-11-01T23:30:00Z"))).toBe("2026-11-02");
    const first = gameOfTheDay(games, "2026-11-01", 0);
    expect(gameOfTheDay(games, "2026-11-01", 0)?.id).toBe(first?.id);
    expect(first?.status === "Offen" || first?.status === "Installiert").toBe(true);
    const rerolls = [1, 2, 3, 4, 5].map((salt) => gameOfTheDay(games, "2026-11-01", salt)?.id);
    expect(rerolls.some((id) => id !== first?.id)).toBe(true);
  });

  it("keeps search, sort and filters in the hash", () => {
    const filters = emptyFilters();
    filters.status = ["Offen", "Installiert"];
    filters.system = ["PlayStation 1"];
    const parsed = parseHash(buildHash({ view: "browse", id: "PS1-0002", q: "symphny", sort: "status", filters }));
    expect(parsed).toMatchObject({ view: "browse", id: "PS1-0002", q: "symphny", sort: "status" });
    expect(parsed.filters.status).toEqual(["Offen", "Installiert"]);
    expect(parsed.filters.system).toEqual(["PlayStation 1"]);
  });
});

describe("curated lists, names and mixtape conflicts", () => {
  it("keeps hidden gems to high tiers that are still open", () => {
    const list = curatedById("hidden-gems")!.games([
      game({ id: "1", title: "Gem", status: "Offen", tier: "S" }),
      game({ id: "2", title: "Played", status: "Gespielt", tier: "S" }),
      game({ id: "3", title: "Low", status: "Offen", tier: "C" }),
    ]);
    expect(list.map((entry) => entry.id)).toEqual(["1"]);
  });

  it("uses the full system name under the abbreviation", () => {
    expect(sysMeta("PlayStation 1")).toMatchObject({ abbr: "PS1", full: "Sony PlayStation" });
    expect(sysMeta("PS Vita").full).toBe("PlayStation Vita");
    expect(sysMeta("NES").full).toBe("Nintendo Entertainment System");
  });

  it("detects a mixtape row that changed in the sheet", () => {
    const row = { mixtape: "Favoriten", gameId: "PC-0095", title: "Deus Ex", system: "PC", order: 1, added: "2026-11-01", row: 4 };
    expect(decideRowChange(null, "", fingerprint(row))).toBe("append");
    expect(decideRowChange(row, fingerprint(row), null)).toBe("remove");
    expect(decideRowChange({ ...row, order: 3 }, fingerprint(row), fingerprint({ ...row, order: 2 }))).toBe("conflict");
    expect(decideRowChange(row, fingerprint(row), fingerprint(row))).toBe("noop");
  });
});
