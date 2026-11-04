import type { Game } from "../types";

export function berlinDate(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function hashString(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index++) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function gameOfTheDay(games: readonly Game[], date: string, salt = 0): Game | null {
  if (!games.length) return null;
  const preferred = games.filter((game) => game.status === "Offen" || game.status === "Installiert");
  const pool = preferred.length ? preferred : games;
  const ordered = [...pool].sort((a, b) => a.id.localeCompare(b.id));
  return ordered[hashString(`${date}:${salt}`) % ordered.length] ?? null;
}
