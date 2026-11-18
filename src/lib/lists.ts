/**
 * Personal lists live on the device. A later sync can implement ListRepository
 * against one sheet column (for example "Listen") without adding a tab.
 * This build only uses localStorage.
 */
export interface UserList {
  id: string;
  name: string;
  gameIds: string[];
}

export interface StoredLists {
  version: 1;
  favorites: string[];
  custom: UserList[];
}

export interface ListRepository {
  load(): StoredLists;
  save(data: StoredLists): void;
}

export const LISTS_STORAGE_KEY = "cmpc-lists-v1";

export function emptyLists(): StoredLists {
  return { version: 1, favorites: [], custom: [] };
}

export function normalizeLists(raw: unknown): StoredLists {
  if (!raw || typeof raw !== "object") return emptyLists();
  const record = raw as Partial<StoredLists>;
  const favorites = Array.isArray(record.favorites) ? record.favorites.filter((id) => typeof id === "string" && id) : [];
  const custom = Array.isArray(record.custom)
    ? record.custom.flatMap((list) => {
        if (!list || typeof list !== "object") return [];
        const item = list as Partial<UserList>;
        if (!item.id || !item.name) return [];
        const gameIds = Array.isArray(item.gameIds) ? item.gameIds.filter((id) => typeof id === "string" && id) : [];
        return [{ id: item.id, name: item.name, gameIds }];
      })
    : [];
  return { version: 1, favorites: [...new Set(favorites)], custom };
}

export function localListRepository(storage: Pick<Storage, "getItem" | "setItem"> | null = typeof localStorage === "undefined" ? null : localStorage): ListRepository {
  return {
    load() {
      if (!storage) return emptyLists();
      try {
        return normalizeLists(JSON.parse(storage.getItem(LISTS_STORAGE_KEY) ?? "null"));
      } catch {
        return emptyLists();
      }
    },
    save(data) {
      if (!storage) return;
      try {
        storage.setItem(LISTS_STORAGE_KEY, JSON.stringify(data));
      } catch {
        /* private mode */
      }
    },
  };
}

export function toggleId(ids: readonly string[], id: string): string[] {
  return ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id];
}

export function nextListId(): string {
  return `list-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}
