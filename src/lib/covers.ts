import type { Game } from "../types";

export type { HandheldModel, NaturalLanguageSearch, SimilarGamesProvider } from "./extensions";

/**
 * Cover lookup. v1 reads the sheet URL (often a small Wikipedia image).
 * A later source can be installed with setCoverSource without touching the UI.
 */
export interface CoverSource {
  readonly id: string;
  urlFor(game: Pick<Game, "id" | "title" | "system" | "coverUrl">): string | null;
}

export const sheetCoverSource: CoverSource = {
  id: "sheet",
  urlFor: (game) => game.coverUrl,
};

let active: CoverSource = sheetCoverSource;

export function setCoverSource(source: CoverSource): void {
  active = source;
}

export function coverUrlFor(game: Pick<Game, "id" | "title" | "system" | "coverUrl">): string | null {
  return active.urlFor(game);
}
