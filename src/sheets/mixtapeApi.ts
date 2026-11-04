import { SHEET_MIXTAPES } from "../config";
import { headerIndex, parseMixtapes, requireHeader, type MixtapeEntry } from "../lib/parse";
import { columnToLetter } from "../lib/text";
import { appendRow, batchGet, deleteSheetRows, writeCell } from "./api";

export async function readMixtapeSheet(token: string): Promise<MixtapeEntry[]> {
  const [rows] = await batchGet(token, [`'${SHEET_MIXTAPES}'!A1:F`]);
  return parseMixtapes(rows);
}

async function headersOf(token: string) {
  const [rows] = await batchGet(token, [`'${SHEET_MIXTAPES}'!3:3`]);
  return headerIndex(rows[0] ?? []);
}

export async function appendMixtape(token: string, entry: Omit<MixtapeEntry, "row">): Promise<void> {
  const headers = await headersOf(token);
  const width = Math.max(1, ...[...headers.values()].map((index) => index + 1));
  const row: Array<string | number> = Array.from({ length: width }, () => "");
  const put = (name: string, value: string | number) => {
    const index = headers.get(name);
    if (index != null) row[index] = value;
  };
  put("Mixtape", entry.mixtape);
  put("Spiel-ID", entry.gameId);
  put("Titel", entry.title);
  put("System", entry.system);
  put("Reihenfolge", entry.order);
  put("Hinzugefügt", entry.added);
  await appendRow(token, `'${SHEET_MIXTAPES}'!A3:F`, row);
}

export async function writeMixtapeField(token: string, row: number, header: string, value: string | number): Promise<void> {
  const headers = await headersOf(token);
  await writeCell(token, `'${SHEET_MIXTAPES}'!${columnToLetter(requireHeader(headers, header))}${row}`, value);
}

export async function deleteMixtapeRows(token: string, rows: number[]): Promise<void> {
  await deleteSheetRows(token, SHEET_MIXTAPES, rows);
}
