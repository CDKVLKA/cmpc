import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import ExcelJS from "exceljs";
import { SPREADSHEET_ID } from "../src/config";
import { parseGames, parseTranslations, stripPrivate } from "../src/lib/parse";

const file = process.argv[2];
if (!file) {
  console.error("Aufruf: npm run snapshot -- pfad/zur/datei.xlsx");
  process.exit(1);
}

function linkOf(cell: ExcelJS.Cell): string | null {
  const link = cell.hyperlink as unknown;
  if (!link) return null;
  if (typeof link === "string") return link;
  if (typeof link === "object" && link && "hyperlink" in link) {
    const href = (link as { hyperlink?: unknown }).hyperlink;
    return typeof href === "string" ? href : null;
  }
  return null;
}

function asCell(value: ExcelJS.CellValue, hyperlink: string | null): unknown {
  if (value == null) return hyperlink ? { text: "", hyperlink } : null;
  if (value instanceof Date) return value.getFullYear();
  if (typeof value === "object") {
    if ("richText" in value && Array.isArray(value.richText)) {
      const text = value.richText.map((part) => part.text).join("");
      return hyperlink ? { text, hyperlink } : text;
    }
    if ("formula" in value) {
      const formula = String(value.formula ?? "");
      const result = value.result;
      if (result != null && result !== "") return result;
      return formula.startsWith("=") ? formula : `=${formula}`;
    }
    if ("text" in value) {
      const href = "hyperlink" in value && typeof value.hyperlink === "string" ? value.hyperlink : hyperlink;
      return href ? { text: value.text, hyperlink: href } : value.text;
    }
  }
  if (hyperlink) return { text: value, hyperlink };
  return value;
}

function readSheet(sheet: ExcelJS.Worksheet): unknown[][] {
  const maxCol = Math.max(sheet.columnCount, 4);
  const rows: unknown[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const values: unknown[] = [];
    for (let column = 1; column <= maxCol; column++) {
      const cell = row.getCell(column);
      values.push(asCell(cell.value, linkOf(cell)));
    }
    rows.push(values);
  });
  return rows;
}

const workbook = new ExcelJS.Workbook();
await workbook.xlsx.readFile(resolve(file));
const list = workbook.getWorksheet("Gesamtliste");
const translations = workbook.getWorksheet("Übersetzungen (EN)");
if (!list || !translations) {
  console.error("Gesamtliste oder Übersetzungen (EN) fehlt in der Arbeitsmappe.");
  process.exit(1);
}

const parsed = parseGames(readSheet(list));
const games = parsed.games.map(stripPrivate);
const payload = {
  generatedAt: new Date().toISOString(),
  spreadsheetId: SPREADSHEET_ID,
  gameCount: games.length,
  headers: parsed.headers,
  games,
  translations: parseTranslations(readSheet(translations)),
};
const raw = JSON.stringify(payload);
if (games.some((game) => game.notes)) {
  console.error("Eigene Notizen sind noch im Snapshot.");
  process.exit(1);
}
if (raw.includes("andere Version: MSX2") || raw.includes("schwacher Lizenz-Filler")) {
  console.error("Privater Notiztext ist im Snapshot gelandet.");
  process.exit(1);
}
const target = resolve("public/snapshot.json");
writeFileSync(target, raw);
console.log(`Snapshot geschrieben: ${games.length} Titel → ${target}`);
