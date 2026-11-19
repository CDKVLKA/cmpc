import type { Game } from "../types";
import { str } from "./text";

/**
 * Countries the globe can paint. `numeric` is the ISO 3166-1 code used by
 * world-atlas 110m. `Europe` stays a label with no polygon.
 */
const COUNTRY_ROWS = [
  { id: "Japan", numeric: "392", names: ["japan", "jp", "jpn", "nippon"] },
  { id: "USA", numeric: "840", names: ["usa", "us", "united states", "united states of america", "america", "vereinigte staaten", "vereinigte staaten von amerika"] },
  { id: "Canada", numeric: "124", names: ["canada", "kanada"] },
  { id: "UK", numeric: "826", names: ["uk", "gb", "united kingdom", "britain", "england", "scotland", "wales", "great britain", "großbritannien", "vereinigtes königreich"] },
  { id: "France", numeric: "250", names: ["france", "frankreich"] },
  { id: "Germany", numeric: "276", names: ["germany", "deutschland"] },
  { id: "Italy", numeric: "380", names: ["italy", "italien"] },
  { id: "Spain", numeric: "724", names: ["spain", "spanien"] },
  { id: "Netherlands", numeric: "528", names: ["netherlands", "niederlande", "holland"] },
  { id: "Sweden", numeric: "752", names: ["sweden", "schweden"] },
  { id: "Russia", numeric: "643", names: ["russia", "russland"] },
  { id: "China", numeric: "156", names: ["china"] },
  { id: "Korea", numeric: "410", names: ["korea", "south korea", "republic of korea", "südkorea", "republik korea"] },
  { id: "Australia", numeric: "36", names: ["australia", "australien"] },
  { id: "Brazil", numeric: "76", names: ["brazil", "brasilien"] },
  { id: "Poland", numeric: "616", names: ["poland", "polen"] },
  { id: "Finland", numeric: "246", names: ["finland", "finnland"] },
  { id: "Norway", numeric: "578", names: ["norway", "norwegen"] },
  { id: "Denmark", numeric: "208", names: ["denmark", "dänemark"] },
  { id: "Austria", numeric: "40", names: ["austria", "österreich"] },
  { id: "Switzerland", numeric: "756", names: ["switzerland", "schweiz"] },
  { id: "Belgium", numeric: "56", names: ["belgium", "belgien"] },
  { id: "Czechia", numeric: "203", names: ["czechia", "czech republic", "tschechien", "tschechische republik"] },
  { id: "Hungary", numeric: "348", names: ["hungary", "ungarn"] },
  { id: "Ukraine", numeric: "804", names: ["ukraine"] },
  { id: "Taiwan", numeric: "158", names: ["taiwan"] },
  { id: "Ireland", numeric: "372", names: ["ireland", "irland"] },
  { id: "Portugal", numeric: "620", names: ["portugal"] },
  { id: "Mexico", numeric: "484", names: ["mexico", "mexiko"] },
  { id: "Argentina", numeric: "32", names: ["argentina", "argentinien"] },
  { id: "New Zealand", numeric: "554", names: ["new zealand", "neuseeland"] },
  { id: "Israel", numeric: "376", names: ["israel"] },
  { id: "India", numeric: "356", names: ["india", "indien"] },
  { id: "Singapore", numeric: "702", names: ["singapore", "singapur"] },
  { id: "South Africa", numeric: "710", names: ["south africa", "südafrika"] },
  { id: "Iceland", numeric: "352", names: ["iceland", "island"] },
  { id: "Romania", numeric: "642", names: ["romania", "rumänien"] },
  { id: "Greece", numeric: "300", names: ["greece", "griechenland"] },
  { id: "Turkey", numeric: "792", names: ["turkey", "türkei", "turkiye"] },
] as const;

export const ORIGIN_REGIONS = COUNTRY_ROWS.map((row) => row.id);

export type OriginRegion = (typeof COUNTRY_ROWS)[number]["id"] | "Europe";

const COUNTRY_ALIASES: Record<string, OriginRegion> = {
  europe: "Europe",
  europa: "Europe",
  eu: "Europe",
};

const NUMERIC_BY_ID = new Map<string, string>();
const ID_BY_NUMERIC = new Map<string, OriginRegion>();

function fold(value: string): string {
  return value.trim().toLocaleLowerCase("de").replace(/ß/g, "ss").normalize("NFD").replace(/\p{M}/gu, "");
}

for (const row of COUNTRY_ROWS) {
  NUMERIC_BY_ID.set(row.id, row.numeric);
  ID_BY_NUMERIC.set(row.numeric, row.id);
  for (const name of row.names) COUNTRY_ALIASES[fold(name)] = row.id;
}

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

function alias(value: unknown): OriginRegion | null {
  const key = fold(str(value));
  if (!key) return null;
  return COUNTRY_ALIASES[key] ?? null;
}

/** ISO numeric id for a globe polygon, or null for Europe and Unknown. */
export function originNumeric(id: string): string | null {
  return NUMERIC_BY_ID.get(id) ?? null;
}

export function originForNumeric(numeric: string): OriginRegion | null {
  return ID_BY_NUMERIC.get(String(Number(numeric))) ?? null;
}

function seriesCountry(game: Game): OriginRegion | null {
  const haystack = `${str(game.series)} ${str(game.title)}`.toLocaleLowerCase("en");
  const keys = Object.keys(SERIES_COUNTRY).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (haystack.includes(key)) return SERIES_COUNTRY[key] ?? null;
  }
  return null;
}

function singleMarket(region: unknown): OriginRegion | null {
  const cleaned = str(region).replace(/\s*\+.*$/, "").trim();
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
  const fromDeveloper = DEVELOPERS[fold(str(game.developer))];
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
