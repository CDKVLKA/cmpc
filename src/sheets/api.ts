import { SHEET_I18N, SHEET_LIST, SPREADSHEET_ID } from "../config";
import { findRowById } from "../lib/conflict";
import { headerIndex, requireHeader } from "../lib/parse";
import { columnToLetter, str } from "../lib/text";

const ROOT = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}`;

export class SheetsError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function api(token: string, url: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new SheetsError(detail || response.statusText, response.status);
  }
  return response.json();
}

export async function batchGet(token: string, ranges: string[]): Promise<unknown[][][]> {
  const params = new URLSearchParams();
  for (const range of ranges) params.append("ranges", range);
  params.set("valueRenderOption", "UNFORMATTED_VALUE");
  const json = (await api(token, `${ROOT}/values:batchGet?${params}`)) as {
    valueRanges?: { values?: unknown[][] }[];
  };
  return (json.valueRanges ?? []).map((range) => range.values ?? []);
}

export async function loadLive(token: string): Promise<{ list: unknown[][]; translations: unknown[][] }> {
  const [list, translations] = await batchGet(token, [
    `${SHEET_LIST}!A1:AZ`,
    `'${SHEET_I18N}'!A1:D`,
  ]);
  return { list, translations };
}

export async function writeCell(token: string, range: string, value: string | number): Promise<void> {
  await api(token, `${ROOT}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: [{ range, values: [[value]] }],
    }),
  });
}

export interface LocatedCell {
  range: string;
  current: unknown;
  row: number;
}

/** Re-read the header, confirm the row by ID, then read the target cell. */
export async function locateCell(
  token: string,
  gameId: string,
  headerName: string,
  hintRow: number | null,
): Promise<LocatedCell> {
  const [headerRows] = await batchGet(token, [`${SHEET_LIST}!1:1`]);
  const headers = headerIndex(headerRows[0] ?? []);
  const idColumn = requireHeader(headers, "ID");
  const fieldColumn = requireHeader(headers, headerName);
  const idLetter = columnToLetter(idColumn);
  const fieldLetter = columnToLetter(fieldColumn);

  const readAt = async (row: number): Promise<{ id: string; current: unknown }> => {
    const [idValues, fieldValues] = await batchGet(token, [
      `${SHEET_LIST}!${idLetter}${row}`,
      `${SHEET_LIST}!${fieldLetter}${row}`,
    ]);
    return { id: str(idValues[0]?.[0]), current: fieldValues[0]?.[0] ?? "" };
  };

  if (hintRow && hintRow > 1) {
    const hit = await readAt(hintRow);
    if (hit.id === gameId) {
      return { range: `${SHEET_LIST}!${fieldLetter}${hintRow}`, current: hit.current, row: hintRow };
    }
  }

  const [idColumnValues] = await batchGet(token, [`${SHEET_LIST}!${idLetter}:${idLetter}`]);
  const index = findRowById(
    idColumnValues.map((row) => [row[0]]),
    0,
    gameId,
  );
  if (index == null) throw new SheetsError(`ID ${gameId} steht nicht in der Gesamtliste`, 404);
  const row = index + 1;
  const hit = await readAt(row);
  if (hit.id !== gameId) throw new SheetsError(`ID ${gameId} steht nicht in der Gesamtliste`, 404);
  return { range: `${SHEET_LIST}!${fieldLetter}${row}`, current: hit.current, row };
}
