import { H } from "../config";
import type { Dictionary, Game } from "../types";
import {
  extractUrl,
  parseRating,
  parseReleaseDate,
  parseYear,
  playtimeBucket,
  splitTags,
  str,
  strKeepLines,
} from "./text";

export function headerIndex(headerRow: readonly unknown[]): Map<string, number> {
  const map = new Map<string, number>();
  headerRow.forEach((cell, index) => {
    const name = str(cell);
    if (name && !map.has(name)) map.set(name, index);
  });
  return map;
}

export function requireHeader(headers: Map<string, number>, name: string): number {
  const index = headers.get(name);
  if (index == null) {
    throw new Error(`Spalte „${name}“ fehlt in der Kopfzeile`);
  }
  return index;
}

function cell(row: readonly unknown[], headers: Map<string, number>, name: string): unknown {
  const index = headers.get(name);
  if (index == null) return null;
  return row[index] ?? null;
}

export function parseGameRow(row: readonly unknown[], headers: Map<string, number>): Game | null {
  const id = str(cell(row, headers, H.id));
  if (!id || id === H.id) return null;
  const playtime = str(cell(row, headers, H.playtime));
  const sourceRaw = cell(row, headers, H.source);
  return {
    id,
    title: str(cell(row, headers, H.title)),
    coverUrl: extractUrl(cell(row, headers, H.coverUrl)) ?? extractUrl(cell(row, headers, H.cover)),
    system: str(cell(row, headers, H.system)),
    year: parseYear(cell(row, headers, H.year)),
    releaseDate: parseReleaseDate(cell(row, headers, H.releaseDate)),
    region: str(cell(row, headers, H.region)),
    genre: str(cell(row, headers, H.genre)),
    category: str(cell(row, headers, H.category)),
    tier: str(cell(row, headers, H.tier)),
    tierSource: str(cell(row, headers, H.tierSource)),
    playability: str(cell(row, headers, H.playability)),
    playtime,
    playtimeBucket: playtime ? playtimeBucket(playtime) : "unbekannt",
    rating: parseRating(cell(row, headers, H.rating)),
    series: str(cell(row, headers, H.series)),
    tags: splitTags(str(cell(row, headers, H.tags))),
    cyberpunk: str(cell(row, headers, H.cyberpunk)),
    preservation: str(cell(row, headers, H.preservation)),
    why: strKeepLines(cell(row, headers, H.why)),
    summary: strKeepLines(cell(row, headers, H.summary)),
    special: strKeepLines(cell(row, headers, H.special)),
    history: strKeepLines(cell(row, headers, H.history)),
    world: strKeepLines(cell(row, headers, H.world)),
    emulator: str(cell(row, headers, H.emulator)),
    notes: strKeepLines(cell(row, headers, H.notes)),
    sourceLabel: str(typeof sourceRaw === "object" && sourceRaw && "text" in sourceRaw ? (sourceRaw as { text: unknown }).text : sourceRaw),
    sourceUrl: extractUrl(cell(row, headers, H.sourceUrl)) ?? extractUrl(sourceRaw),
    origin: str(cell(row, headers, H.origin)),
    status: str(cell(row, headers, H.status)) || "Offen",
    tierSourceEn: str(cell(row, headers, H.tierSourceEn)),
    whyEn: strKeepLines(cell(row, headers, H.whyEn)),
    summaryEn: strKeepLines(cell(row, headers, H.summaryEn)),
    specialEn: strKeepLines(cell(row, headers, H.specialEn)),
    historyEn: strKeepLines(cell(row, headers, H.historyEn)),
    worldEn: strKeepLines(cell(row, headers, H.worldEn)),
    emulatorEn: str(cell(row, headers, H.emulatorEn)),
    regionDetailsEn: str(cell(row, headers, H.regionDetailsEn)),
    regionDetails: str(cell(row, headers, H.regionDetails)),
    art: str(cell(row, headers, H.art)),
  };
}

export interface ParsedSheet {
  headers: string[];
  games: Game[];
  /** 1-based sheet row for each ID, from this read. Not a stable key. */
  rowById: Record<string, number>;
}

export function parseGames(rows: readonly (readonly unknown[])[]): ParsedSheet {
  if (!rows.length) throw new Error("Gesamtliste ist leer");
  const headerRow = rows[0] ?? [];
  const headers = headerIndex(headerRow);
  requireHeader(headers, H.id);
  requireHeader(headers, H.title);
  const games: Game[] = [];
  const rowById: Record<string, number> = {};
  for (let i = 1; i < rows.length; i++) {
    const game = parseGameRow(rows[i] ?? [], headers);
    if (!game) continue;
    games.push(game);
    rowById[game.id] = i + 1;
  }
  return {
    headers: headerRow.map((entry) => str(entry)).filter(Boolean),
    games,
    rowById,
  };
}

export interface MixtapeEntry {
  mixtape: string;
  gameId: string;
  title: string;
  system: string;
  order: number;
  added: string;
  row: number;
}

/** Header of the Mixtapes tab is the row that starts with „Mixtape“, not row 1. */
export function parseMixtapes(rows: readonly (readonly unknown[])[]): MixtapeEntry[] {
  const headerAt = rows.findIndex((row) => str(row?.[0]) === "Mixtape" && (row ?? []).some((value) => str(value) === "Spiel-ID"));
  if (headerAt < 0) return [];
  const headers = headerIndex(rows[headerAt] ?? []);
  const entries: MixtapeEntry[] = [];
  for (let index = headerAt + 1; index < rows.length; index++) {
    const row = rows[index] ?? [];
    const mixtape = str(cell(row, headers, "Mixtape"));
    const gameId = str(cell(row, headers, "Spiel-ID"));
    if (!mixtape || !gameId) continue;
    const orderRaw = cell(row, headers, "Reihenfolge");
    const order = typeof orderRaw === "number" ? orderRaw : Number(str(orderRaw));
    entries.push({
      mixtape,
      gameId,
      title: str(cell(row, headers, "Titel")),
      system: str(cell(row, headers, "System")),
      order: Number.isFinite(order) && order > 0 ? order : entries.length + 1,
      added: parseReleaseDate(cell(row, headers, "Hinzugefügt")) || str(cell(row, headers, "Hinzugefügt")),
      row: index + 1,
    });
  }
  return entries;
}

/** Public snapshot: personal notes never leave the signed-in browser. */
export function stripPrivate(game: Game): Game {
  if (!game.notes) return game;
  return { ...game, notes: "" };
}

export function parseTranslations(rows: readonly (readonly unknown[])[]): Dictionary {
  const dict: Dictionary = {};
  let started = false;
  for (const row of rows) {
    const area = str(row?.[0]);
    const german = str(row?.[1]);
    const english = str(row?.[2]);
    if (!started) {
      if (area === "Bereich" && german === "Deutsch") started = true;
      continue;
    }
    if (!area || !german) continue;
    const translated = !english || english === "unverändert" ? german : english;
    const table = dict[area] ?? {};
    table[german] = translated;
    dict[area] = table;
  }
  return dict;
}
