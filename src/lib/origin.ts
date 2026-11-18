import type { Game } from "../types";

/** Canonical region ids used by the map. */
export const ORIGIN_REGIONS = [
  "Japan",
  "USA",
  "Canada",
  "UK",
  "France",
  "Germany",
  "Italy",
  "Spain",
  "Netherlands",
  "Sweden",
  "Europe",
  "Russia",
  "China",
  "Korea",
  "Australia",
  "Brazil",
] as const;

export type OriginRegion = (typeof ORIGIN_REGIONS)[number];

const COUNTRY_ALIASES: Record<string, OriginRegion> = {
  japan: "Japan",
  jp: "Japan",
  nippon: "Japan",
  usa: "USA",
  us: "USA",
  "united states": "USA",
  america: "USA",
  kanada: "Canada",
  canada: "Canada",
  uk: "UK",
  "united kingdom": "UK",
  britain: "UK",
  england: "UK",
  großbritannien: "UK",
  france: "France",
  frankreich: "France",
  germany: "Germany",
  deutschland: "Germany",
  italy: "Italy",
  italien: "Italy",
  spain: "Spain",
  spanien: "Spain",
  netherlands: "Netherlands",
  niederlande: "Netherlands",
  holland: "Netherlands",
  sweden: "Sweden",
  schweden: "Sweden",
  europe: "Europe",
  europa: "Europe",
  eu: "Europe",
  russia: "Russia",
  russland: "Russia",
  china: "China",
  korea: "Korea",
  "south korea": "Korea",
  südkorea: "Korea",
  australia: "Australia",
  australien: "Australia",
  brazil: "Brazil",
  brasilien: "Brazil",
};

const DEVELOPERS: Record<string, OriginRegion> = {
  nintendo: "Japan",
  sega: "Japan",
  capcom: "Japan",
  konami: "Japan",
  "square enix": "Japan",
  squaresoft: "Japan",
  atlus: "Japan",
  namco: "Japan",
  bandai: "Japan",
  snk: "Japan",
  koei: "Japan",
  fromsoftware: "Japan",
  "from software": "Japan",
  platinumgames: "Japan",
  falcom: "Japan",
  compile: "Japan",
  irem: "Japan",
  treasure: "Japan",
  technosoft: "Japan",
  hudson: "Japan",
  enix: "Japan",
  ubisoft: "France",
  "rare": "UK",
  "rareware": "UK",
  "rockstar north": "UK",
  "dma design": "UK",
  psychegnosis: "UK",
  psygnosis: "UK",
  "core design": "UK",
  "team 17": "UK",
  codemasters: "UK",
  "id software": "USA",
  blizzard: "USA",
  nintendooft: "USA",
  valve: "USA",
  bethesda: "USA",
  bioware: "Canada",
  "silicon knights": "Canada",
};

const SERIES_COUNTRY: Record<string, OriginRegion> = {
  mario: "Japan",
  zelda: "Japan",
  metroid: "Japan",
  kirby: "Japan",
  pokémon: "Japan",
  pokemon: "Japan",
  "donkey kong": "Japan",
  "fire emblem": "Japan",
  sonic: "Japan",
  "streets of rage": "Japan",
  "shin megami tensei": "Japan",
  persona: "Japan",
  "metal gear": "Japan",
  "castlevania": "Japan",
  "mega man": "Japan",
  "street fighter": "Japan",
  "resident evil": "Japan",
  "final fantasy": "Japan",
  "dragon quest": "Japan",
  "monster hunter": "Japan",
  yakuza: "Japan",
  "like a dragon": "Japan",
  "silent hill": "Japan",
  suikoden: "Japan",
  "devil may cry": "Japan",
  "ace attorney": "Japan",
  "kingdom hearts": "Japan",
  nier: "Japan",
  "dark souls": "Japan",
  "elden ring": "Japan",
  bloodborne: "Japan",
  tekken: "Japan",
  "pac-man": "Japan",
  "gran turismo": "Japan",
  "ghost in the shell": "Japan",
  "grand theft auto": "UK",
  gta: "UK",
  "tomb raider": "UK",
  wipeout: "UK",
  lemmings: "UK",
  "goldeneye": "UK",
  "perfect dark": "UK",
  banjo: "UK",
  doom: "USA",
  quake: "USA",
  "half-life": "USA",
  portal: "USA",
  halo: "USA",
  "the elder scrolls": "USA",
  fallout: "USA",
  diablo: "USA",
  warcraft: "USA",
  starcraft: "USA",
  "mass effect": "Canada",
  "dragon age": "Canada",
  "assassin's creed": "Canada",
  "rayman": "France",
  "prince of persia": "France",
};

function alias(value: string): OriginRegion | null {
  const key = value.trim().toLocaleLowerCase("en");
  if (!key) return null;
  return COUNTRY_ALIASES[key] ?? null;
}

function seriesCountry(game: Game): OriginRegion | null {
  const haystack = `${game.series} ${game.title}`.toLocaleLowerCase("en");
  const keys = Object.keys(SERIES_COUNTRY).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (haystack.includes(key)) return SERIES_COUNTRY[key] ?? null;
  }
  return null;
}

function singleMarket(region: string): OriginRegion | null {
  const cleaned = region.replace(/\s*\+.*$/, "").trim();
  if (cleaned.includes("·")) return null;
  return alias(cleaned);
}

/**
 * Developer country for the map.
 * `Herkunft` on the current sheet is a curation note, so it counts only when
 * the cell is actually a country name. `Land` and `Entwickler` win when present.
 * A single release market (just "JP", not "JP · US · EU") is the last resort.
 */
export function gameOrigin(game: Game): OriginRegion | "Unknown" {
  const fromCountry = alias(game.country);
  if (fromCountry) return fromCountry;
  const fromDeveloper = DEVELOPERS[game.developer.trim().toLocaleLowerCase("en")];
  if (fromDeveloper) return fromDeveloper;
  const fromHerkunft = alias(game.origin);
  if (fromHerkunft) return fromHerkunft;
  const fromSeries = seriesCountry(game);
  if (fromSeries) return fromSeries;
  return singleMarket(game.region) ?? "Unknown";
}

export function countOrigins(games: readonly Game[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const game of games) {
    const key = gameOrigin(game);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
