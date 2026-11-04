import Dexie, { type EntityTable } from "dexie";
import type { Dictionary, Game, PendingEdit } from "./types";

export interface LibraryRecord {
  source: "snapshot" | "live";
  generatedAt: string;
  fetchedAt: string;
  games: Game[];
  translations: Dictionary;
  headers: string[];
  rowById: Record<string, number>;
}

interface KvRow {
  key: string;
  payload: unknown;
}

class CmpcDB extends Dexie {
  kv!: EntityTable<KvRow, "key">;

  constructor() {
    super("cmpc");
    this.version(1).stores({ kv: "key" });
  }
}

export const db = new CmpcDB();

export async function readLibrary(): Promise<LibraryRecord | null> {
  const row = await db.kv.get("library");
  if (!row) return null;
  return row.payload as LibraryRecord;
}

export async function writeLibrary(payload: LibraryRecord): Promise<void> {
  await db.kv.put({ key: "library", payload });
}

export async function readEdits(): Promise<PendingEdit[]> {
  const row = await db.kv.get("edits");
  if (!row) return [];
  return row.payload as PendingEdit[];
}

export async function writeEdits(edits: PendingEdit[]): Promise<void> {
  await db.kv.put({ key: "edits", payload: edits });
}

export async function readKv<T>(key: string): Promise<T | null> {
  const row = await db.kv.get(key);
  return row ? (row.payload as T) : null;
}

export async function writeKv(key: string, payload: unknown): Promise<void> {
  await db.kv.put({ key, payload });
}
