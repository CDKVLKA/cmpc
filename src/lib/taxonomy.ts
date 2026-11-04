import { tierKey } from "./text";

export const STATUS_ORDER = [
  "Offen",
  "Ausgewählt",
  "Installiert",
  "Gespielt",
  "Abgeschlossen",
  "Nicht interessant",
  "Nicht auffindbar",
] as const;

export const PLAY_ORDER = [
  "🟢 Sehr gut",
  "🟢 Gut",
  "🟡 Eingeschränkt",
  "🟠 Kaum spielbar",
  "🔴 Nicht spielbar",
  "⚪ Ungetestet",
] as const;

export const TIER_ORDER = ["S", "A", "B", "C", "D", "unbewertet"] as const;

export const PLAYTIME_ORDER = ["Kurz", "Mittel", "Lang", "Sammlung", "unbekannt"] as const;

export const CYBER_ORDER = ["Kern", "Nah", "Grenzfall", "kein"] as const;

export const CATEGORY_ORDER = [
  "Genre-Defining",
  "Must-Have",
  "Classic",
  "Mainstream",
  "Hidden Gem",
  "Geheimtipp",
  "Underground",
  "Nische",
  "Optional",
] as const;

/**
 * Single blue scale: S is the strongest, D the palest.
 * Red is reserved for playability ("not playable"), not for a high tier.
 */
export const TIER_BG: Record<string, string> = {
  S: "#1d4ed8",
  A: "#3b82f6",
  B: "#7dd3fc",
  C: "#bae6fd",
  D: "#e0f2fe",
  unbewertet: "#d5dbe6",
};

export const TIER_FG: Record<string, string> = {
  S: "#ffffff",
  A: "#ffffff",
  B: "#0c2340",
  C: "#0c2340",
  D: "#0c2340",
  unbewertet: "#1f2a44",
};

export const STATUS_DOT: Record<string, string> = {
  Offen: "#AEB6C4",
  Ausgewählt: "#F2C14E",
  Installiert: "#5DBB7A",
  Gespielt: "#5B9BEA",
  Abgeschlossen: "#9B7FDB",
  "Nicht interessant": "#E06C78",
  "Nicht auffindbar": "#C49A62",
};

export const STATUS_BG: Record<string, string> = {
  Offen: "#F3F3F3",
  Ausgewählt: "#FFF8E1",
  Installiert: "#EDF7EE",
  Gespielt: "#E3EEFA",
  Abgeschlossen: "#EEE8F7",
  "Nicht interessant": "#FBE9EA",
  "Nicht auffindbar": "#F6EFE4",
};

export const PLAY_BG: Record<string, string> = {
  "🟢 Sehr gut": "#9ee0b4",
  "🟢 Gut": "#d4f0dc",
  "🟡 Eingeschränkt": "#ffe7a3",
  "🟠 Kaum spielbar": "#f8c9a8",
  "🔴 Nicht spielbar": "#f3b0a4",
  "⚪ Ungetestet": "#e4e7ee",
};

export const PLAY_DOT: Record<string, string> = {
  "🟢 Sehr gut": "#34B56A",
  "🟢 Gut": "#8FD19E",
  "🟡 Eingeschränkt": "#F0C846",
  "🟠 Kaum spielbar": "#F08A4B",
  "🔴 Nicht spielbar": "#E0524A",
  "⚪ Ungetestet": "#B9C0CC",
};

export function tierRank(value: string): number {
  const key = tierKey(value);
  const index = TIER_ORDER.indexOf(key as (typeof TIER_ORDER)[number]);
  return index === -1 ? TIER_ORDER.length : index;
}

export function orderWithExtras(preferred: readonly string[], values: Iterable<string>): string[] {
  const present = new Set(values);
  const ordered = preferred.filter((item) => present.has(item));
  const extras = [...present].filter((item) => item && !preferred.includes(item)).sort((a, b) => a.localeCompare(b, "de"));
  return [...ordered, ...extras];
}
