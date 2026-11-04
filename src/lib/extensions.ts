/**
 * Extension points left open for a later version. Nothing here is wired up in v1.
 * - SimilarGamesProvider: e.g. a Hugging Face model for "ähnliche Spiele"
 * - NaturalLanguageSearch: a question over the collection, beside the keyword search
 * - HandheldModel: a rotatable 3D model of the RG477V
 */
export interface SimilarGamesProvider {
  readonly id: string;
  similarTo(gameId: string): Promise<string[]>;
}

export interface NaturalLanguageSearch {
  readonly id: string;
  search(query: string): Promise<string[]>;
}

export interface HandheldModel {
  readonly id: string;
  assetUrl: string;
}
