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

/** Sheets omits trailing empty cells, so a row can be shorter than the header. */
export function normalizeRow(row: readonly unknown[] | undefined, width: number): unknown[] {
  const source = row ?? [];
  const next: unknown[] = [];
  const size = Math.max(0, width);
  for (let index = 0; index < size; index++) {
    const value = source[index];
    next.push(value == null ? "" : value);
  }
  return next;
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
    favorite: ["ja", "yes", "1", "x", "true", "wahr"].includes(str(cell(row, headers, H.favorite)).toLocaleLowerCase("en")),
    developer: str(cell(row, headers, H.developer)) || str(cell(row, headers, "Developer")) || str(cell(row, headers, "Studio")),
    country: str(cell(row, headers, H.country)) || str(cell(row, headers, "Country")),
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
  const headerRow = normalizeRow(rows[0], (rows[0] ?? []).length);
  const headers = headerIndex(headerRow);
  requireHeader(headers, H.id);
  requireHeader(headers, H.title);
  const width = headerRow.length;
  const games: Game[] = [];
  const rowById: Record<string, number> = {};
  for (let i = 1; i < rows.length; i++) {
    const game = parseGameRow(normalizeRow(rows[i], width), headers);
    if (!game) continue;
    games.push(ensureGame(game));
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
  const headerRow = normalizeRow(rows[headerAt], (rows[headerAt] ?? []).length);
  const headers = headerIndex(headerRow);
  const width = headerRow.length;
  const entries: MixtapeEntry[] = [];
  for (let index = headerAt + 1; index < rows.length; index++) {
    const row = normalizeRow(rows[index], width);
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
export function ensureGame(input: Partial<Game> | Game): Game {
  const game = input as Game;
  return {
    ...game,
    id: str(game?.id),
    title: str(game?.title),
    system: str(game?.system),
    region: str(game?.region),
    genre: str(game?.genre),
    category: str(game?.category),
    tier: str(game?.tier),
    playability: str(game?.playability),
    series: str(game?.series),
    origin: str(game?.origin),
    status: str(game?.status) || "Offen",
    notes: str(game?.notes),
    developer: str(game?.developer),
    country: str(game?.country),
    favorite: Boolean(game?.favorite),
    tags: Array.isArray(game?.tags) ? game.tags.map((tag) => str(tag)) : [],
    coverUrl: game?.coverUrl ?? null,
    year: typeof game?.year === "number" && Number.isFinite(game.year) ? game.year : null,
    rating: typeof game?.rating === "number" && Number.isFinite(game.rating) ? game.rating : null,
  };
}

export function stripPrivate(game: Game): Game {
  const next = ensureGame(game);
  if (!next.notes) return next;
  return { ...next, notes: "" };
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
