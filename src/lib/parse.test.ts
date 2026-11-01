import { describe, expect, it } from "vitest";
import { H } from "../config";
import { columnToLetter } from "./text";
import { findRowById } from "./conflict";
import { parseGameRow, parseGames, parseTranslations, headerIndex, stripPrivate } from "./parse";

const headers = [
  H.title,
  H.notes,
  H.id,
  H.cover,
  H.coverUrl,
  H.system,
  H.year,
  H.status,
  H.rating,
  H.tier,
  H.playability,
  H.playtime,
  H.tags,
  H.genre,
  H.source,
  H.sourceUrl,
];

function row(values: Record<string, unknown>): unknown[] {
  const index = headerIndex(headers);
  const cells: unknown[] = headers.map(() => null);
  for (const [name, value] of Object.entries(values)) {
    const at = index.get(name);
    if (at == null) throw new Error(name);
    cells[at] = value;
  }
  return cells;
}

describe("parse by header name", () => {
  it("reads fields after columns are reordered and ignores the column letter", () => {
    const headersMap = headerIndex(headers);
    expect(headersMap.get(H.id)).toBe(2);
    const game = parseGameRow(
      row({
        [H.id]: "ARC-0001",
        [H.title]: "Street Fighter III",
        [H.system]: "Arcade",
        [H.year]: 1999,
        [H.cover]: '=IFERROR(IMAGE("https://example.test/sf3.png"),"")',
        [H.notes]: "geheime notiz",
        [H.status]: "Installiert",
        [H.rating]: "8.0",
        [H.tier]: "S (Einschätzung)",
        [H.playability]: "🟢 Sehr gut",
        [H.playtime]: "▰▱▱ Kurz (1,2 h)",
        [H.tags]: "Kult-Klassiker, Multiplayer",
        [H.genre]: "Fighting",
        [H.source]: { text: "Quelle öffnen", hyperlink: "https://example.test/sf" },
      }),
      headersMap,
    );
    expect(game).toMatchObject({
      id: "ARC-0001",
      title: "Street Fighter III",
      system: "Arcade",
      year: 1999,
      coverUrl: "https://example.test/sf3.png",
      notes: "geheime notiz",
      status: "Installiert",
      rating: 8,
      tier: "S (Einschätzung)",
      playtimeBucket: "Kurz",
      tags: ["Kult-Klassiker", "Multiplayer"],
      genre: "Fighting",
      sourceLabel: "Quelle öffnen",
      sourceUrl: "https://example.test/sf",
    });
  });

  it("prefers Cover-URL over the IMAGE formula and drops private notes for the snapshot", () => {
    const game = parseGameRow(
      row({
        [H.id]: "SMS-0001",
        [H.title]: "Land of Illusion",
        [H.cover]: '=IMAGE("https://example.test/low.png")',
        [H.coverUrl]: "https://example.test/cover.png",
        [H.notes]: "nicht veröffentlichen",
      }),
      headerIndex(headers),
    );
    expect(game?.coverUrl).toBe("https://example.test/cover.png");
    expect(stripPrivate(game!).notes).toBe("");
  });

  it("finds the data row by ID even when the ID column is not column A", () => {
    const parsed = parseGames([
      headers,
      row({ [H.id]: "NES-0001", [H.title]: "Mega Man", [H.year]: "1987" }),
      row({ [H.id]: "", [H.title]: "leer" }),
      row({ [H.id]: "NES-0002", [H.title]: "Zelda" }),
    ]);
    expect(parsed.games.map((game) => game.id)).toEqual(["NES-0001", "NES-0002"]);
    expect(parsed.rowById["NES-0002"]).toBe(4);
    expect(parsed.games[0]?.year).toBe(1987);
    const idColumn = headerIndex(headers).get(H.id)!;
    expect(columnToLetter(idColumn)).toBe("C");
    expect(columnToLetter(0)).toBe("A");
    expect(columnToLetter(26)).toBe("AA");
    expect(findRowById(parsed.games.map((game) => [game.title, game.id]), 1, "NES-0002")).toBe(1);
  });

  it("throws when the ID header is missing", () => {
    expect(() => parseGames([["Titel", "System"], ["Mega Man", "NES"]])).toThrow(/ID/);
  });
});

describe("translations sheet", () => {
  it("starts at the Bereich header and keeps unchanged values identical", () => {
    const dict = parseTranslations([
      ["Übersetzungen (EN)"],
      ["Grundlage für später"],
      ["Bereich", "Deutsch", "English", "Anmerkung"],
      ["Status", "Offen", "Open"],
      ["Tags", "Multiplayer", "unverändert"],
      ["Quelle", "Video- und Artikeltitel", "unverändert"],
    ]);
    expect(dict.Status?.Offen).toBe("Open");
    expect(dict.Tags?.Multiplayer).toBe("Multiplayer");
    expect(dict.Quelle?.["Video- und Artikeltitel"]).toBe("Video- und Artikeltitel");
  });
});
