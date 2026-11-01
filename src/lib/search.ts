import MiniSearch from "minisearch";
import type { Dictionary, Game } from "../types";
import { fold } from "./text";

interface SearchDoc {
  id: string;
  title: string;
  series: string;
  tags: string;
  tagsEn: string;
  genre: string;
  system: string;
  why: string;
  whyEn: string;
  category: string;
  cyberpunk: string;
  notes: string;
  code: string;
}

function toDoc(game: Game, dict: Dictionary): SearchDoc {
  const tagTable = dict.Tags ?? {};
  return {
    id: game.id,
    title: game.title,
    series: game.series,
    tags: game.tags.join(" "),
    tagsEn: game.tags.map((tag) => tagTable[tag] || tag).join(" "),
    genre: game.genre,
    system: game.system,
    why: game.why,
    whyEn: game.whyEn,
    category: game.category,
    cyberpunk: game.cyberpunk,
    notes: game.notes,
    code: game.id,
  };
}

export function createSearchIndex(games: readonly Game[], dict: Dictionary): MiniSearch<SearchDoc> {
  const index = new MiniSearch<SearchDoc>({
    idField: "id",
    fields: ["title", "series", "tags", "tagsEn", "genre", "system", "why", "whyEn", "category", "cyberpunk", "notes", "code"],
    storeFields: ["id"],
    tokenize: (text) => text.split(/[^\p{L}\p{N}]+/u).filter((part) => part.length > 0),
    processTerm: (term) => {
      const folded = fold(term);
      return folded.length ? folded : null;
    },
  });
  index.addAll(games.map((game) => toDoc(game, dict)));
  return index;
}

export function searchIds(index: MiniSearch<SearchDoc>, query: string): Map<string, number> | null {
  const trimmed = query.trim();
  if (!trimmed) return null;
  const hits = index.search(trimmed, {
    combineWith: "AND",
    prefix: true,
    fuzzy: trimmed.length >= 4 ? 0.2 : false,
    boost: { title: 3, code: 3, series: 2, tags: 1.4, tagsEn: 1.4 },
  });
  return new Map(hits.map((hit) => [String(hit.id), hit.score]));
}
