import type { Game } from "../types";

/** ID prefixes already used in the Gesamtliste. */
const ID_CODE: Record<string, string> = {
  "3DO": "3DO",
  Arcade: "ARC",
  Dreamcast: "DC",
  "Game Boy": "GB",
  "Game Boy Advance": "GBA",
  "Game Boy Color": "GBC",
  "Game Gear": "GG",
  GameCube: "GCN",
  MSX2: "MSX2",
  "Master System": "SMS",
  "Mega Drive / Genesis": "MD",
  "Mega-CD / Sega CD": "MCD",
  Mobile: "MOB",
  N64: "N64",
  NES: "NES",
  "Neo Geo": "NEO",
  "Neo Geo Pocket Color": "NGPC",
  "Nintendo 3DS": "3DS",
  "Nintendo DS": "NDS",
  "Nintendo Switch": "NSW",
  "Original Xbox": "XBOX",
  PC: "PC",
  "PC-FX": "PCFX",
  "PS Vita": "VITA",
  PSP: "PSP",
  "PlayStation 1": "PS1",
  "PlayStation 2": "PS2",
  "PlayStation 3": "PS3",
  "PlayStation 4": "PS4",
  "PlayStation 5": "PS5",
  SNES: "SNES",
  "Sega 32X": "32X",
  "Sega Saturn": "SAT",
  "Sharp X68000": "X68K",
  "TurboGrafx-16": "TG16",
  "TurboGrafx-CD": "TGCD",
  Wii: "WII",
  "Wii U": "WIIU",
  WonderSwan: "WS",
  "Xbox 360": "X360",
};

export function idPrefix(system: string): string {
  return ID_CODE[system] ?? (system.replace(/[^A-Za-z0-9]/g, "").slice(0, 6).toUpperCase() || "NEW");
}

export function nextGameId(games: readonly Pick<Game, "id" | "system">[], system: string): string {
  const prefix = idPrefix(system);
  let max = 0;
  const pattern = new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}-(\\d+)$`);
  for (const game of games) {
    const match = pattern.exec(game.id);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return `${prefix}-${String(max + 1).padStart(4, "0")}`;
}

export function sameTitleAndSystem(games: readonly Pick<Game, "id" | "title" | "system">[], title: string, system: string): Pick<Game, "id" | "title" | "system"> | undefined {
  const needle = title.trim().toLocaleLowerCase("de");
  return games.find((game) => game.system === system && game.title.trim().toLocaleLowerCase("de") === needle);
}
