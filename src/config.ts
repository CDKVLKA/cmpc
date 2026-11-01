/** Native Google Sheet „Retro Game Mega Pint Collection“. Not publicly shared. */
export const SPREADSHEET_ID = "1dwGsLWIPNuxCU40ecwyxcAmd-CTEpY75Ec9hYmNae5s";

export const SHEET_LIST = "Gesamtliste";
export const SHEET_I18N = "Übersetzungen (EN)";

export const SHEETS_SCOPE = "https://www.googleapis.com/auth/spreadsheets";

/** Columns read and written only by these header names, never by letter. */
export const H = {
  id: "ID",
  title: "Titel",
  cover: "Cover",
  system: "System",
  year: "Jahr",
  region: "Region",
  genre: "Genre",
  category: "Kategorie",
  tier: "Tier",
  tierSource: "Tier-Quelle",
  playability: "Spielbarkeit RG477V",
  playtime: "Spielzeit",
  rating: "Eigene Bewertung",
  series: "Serie",
  tags: "Tags",
  cyberpunk: "Cyberpunk-Bezug",
  preservation: "Preservation-Status",
  why: "Warum interessant",
  emulator: "Emulator-Hinweis",
  notes: "Eigene Notizen",
  source: "Quelle",
  origin: "Herkunft",
  status: "Status",
  tierSourceEn: "Tier-Quelle (EN)",
  whyEn: "Warum interessant (EN)",
  emulatorEn: "Emulator-Hinweis (EN)",
  regionDetailsEn: "Region Details (EN)",
  regionDetails: "Region Details",
  sourceUrl: "Quelle-URL",
  coverUrl: "Cover-URL",
  art: "Art",
} as const;

/** The only cells the app may write. */
export const WRITABLE = {
  status: H.status,
  rating: H.rating,
  notes: H.notes,
} as const;

export type WritableField = keyof typeof WRITABLE;

/** Omitted from the public snapshot. Kept in the live signed-in copy. */
export const PRIVATE_FIELDS = [H.notes] as const;
