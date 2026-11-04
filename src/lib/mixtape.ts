import type { MixtapeEntry } from "./parse";

export type MixOp =
  | { key: string; kind: "add"; mixtape: string; gameId: string; title: string; system: string; order: number; added: string }
  | { key: string; kind: "remove"; mixtape: string; gameId: string; base: string }
  | { key: string; kind: "order"; mixtape: string; gameId: string; order: number; base: string }
  | { key: string; kind: "rename"; from: string; to: string }
  | { key: string; kind: "drop"; mixtape: string }
  | { key: string; kind: "create"; mixtape: string };

export function fingerprint(entry: Pick<MixtapeEntry, "mixtape" | "gameId" | "order" | "added">): string {
  return `${entry.mixtape}|${entry.gameId}|${entry.order}|${entry.added}`;
}

export type MixDecision = "append" | "update" | "remove" | "noop" | "conflict";

export function decideRowChange(existing: MixtapeEntry | null, base: string, desired: string | null): MixDecision {
  if (!existing) {
    if (desired == null) return "noop";
    if (!base) return "append";
    return "conflict";
  }
  const current = fingerprint(existing);
  if (desired == null) return base && current !== base ? "conflict" : "remove";
  if (current === desired) return "noop";
  if (base && current !== base) return "conflict";
  return "update";
}

export function applyOps(entries: readonly MixtapeEntry[], ops: readonly MixOp[]): MixtapeEntry[] {
  let list = entries.map((entry) => ({ ...entry }));
  for (const op of ops) {
    if (op.kind === "rename") list = list.map((entry) => (entry.mixtape === op.from ? { ...entry, mixtape: op.to } : entry));
    else if (op.kind === "drop") list = list.filter((entry) => entry.mixtape !== op.mixtape);
    else if (op.kind === "remove") list = list.filter((entry) => !(entry.mixtape === op.mixtape && entry.gameId === op.gameId));
    else if (op.kind === "add") {
      list = list.filter((entry) => !(entry.mixtape === op.mixtape && entry.gameId === op.gameId));
      list.push({ mixtape: op.mixtape, gameId: op.gameId, title: op.title, system: op.system, order: op.order, added: op.added, row: 0 });
    } else if (op.kind === "order") {
      list = list.map((entry) => (entry.mixtape === op.mixtape && entry.gameId === op.gameId ? { ...entry, order: op.order } : entry));
    }
  }
  return list;
}

export function mixtapeNames(entries: readonly MixtapeEntry[], ops: readonly MixOp[]): string[] {
  const names = new Set(entries.map((entry) => entry.mixtape));
  for (const op of ops) {
    if (op.kind === "add" || op.kind === "create") names.add(op.mixtape);
    if (op.kind === "rename") {
      names.delete(op.from);
      names.add(op.to);
    }
    if (op.kind === "drop") names.delete(op.mixtape);
  }
  return [...names].sort((a, b) => a.localeCompare(b, "de"));
}
