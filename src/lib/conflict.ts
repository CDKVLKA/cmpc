import { normalizeCell } from "./text";

/** True when the sheet cell changed after this session loaded it. */
export function detectConflict(loaded: unknown, current: unknown): boolean {
  return normalizeCell(loaded) !== normalizeCell(current);
}

export type SyncDecision =
  | { type: "noop" }
  | { type: "write" }
  | { type: "conflict"; sheetValue: string; appValue: string };

/**
 * Decide a write from the value we loaded (`base`), the value now in the
 * sheet (`current`) and the value the app wants (`desired`).
 */
export function decideSync(base: unknown, current: unknown, desired: unknown): SyncDecision {
  const sheetValue = normalizeCell(current);
  const appValue = normalizeCell(desired);
  if (sheetValue === appValue) return { type: "noop" };
  if (detectConflict(base, current)) return { type: "conflict", sheetValue, appValue };
  return { type: "write" };
}

/** Index of the row whose ID cell matches, or null. Row 0 may be the header. */
export function findRowById(
  rows: readonly (readonly unknown[])[],
  idColumn: number,
  id: string,
): number | null {
  const target = id.trim();
  if (!target) return null;
  for (let i = 0; i < rows.length; i++) {
    const cell = rows[i]?.[idColumn];
    if (cell != null && String(cell).trim() === target) return i;
  }
  return null;
}
