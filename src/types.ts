import type { WritableField } from "./config";

export interface Game {
  id: string;
  title: string;
  coverUrl: string | null;
  system: string;
  year: number | null;
  region: string;
  genre: string;
  category: string;
  tier: string;
  tierSource: string;
  playability: string;
  playtime: string;
  playtimeBucket: string;
  rating: number | null;
  series: string;
  tags: string[];
  cyberpunk: string;
  preservation: string;
  why: string;
  emulator: string;
  /** Empty in the public snapshot. Present only in a signed-in live copy. */
  notes: string;
  sourceLabel: string;
  sourceUrl: string | null;
  origin: string;
  status: string;
  tierSourceEn: string;
  whyEn: string;
  emulatorEn: string;
  regionDetailsEn: string;
  regionDetails: string;
  art: string;
}

/** area → German value → English value */
export type Dictionary = Record<string, Record<string, string>>;

export interface Snapshot {
  generatedAt: string;
  spreadsheetId: string;
  gameCount: number;
  headers: string[];
  games: Game[];
  translations: Dictionary;
}

export type Lang = "de" | "en";

export type SortKey = "title" | "year" | "tier" | "system" | "rating";

export type FilterKey =
  | "system"
  | "tier"
  | "play"
  | "status"
  | "genre"
  | "category"
  | "playtime"
  | "series"
  | "tags"
  | "cyber";

export type Filters = Record<FilterKey, string[]>;

export interface PendingEdit {
  key: string;
  gameId: string;
  field: WritableField;
  /** Normalized value the app wants to write. */
  value: string;
  /** Normalized sheet value at the time the edit started. */
  baseValue: string;
  updatedAt: number;
}
