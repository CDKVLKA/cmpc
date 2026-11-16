/** Same key as the old tab-scoped marker, now kept across app restarts. */
export const AUTH_STORAGE_KEY = "cmpc-auth";

export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

function readItem(store: KeyValueStore, key: string): string | null {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function writeItem(store: KeyValueStore, key: string, value: string): boolean {
  try {
    store.setItem(key, value);
    return store.getItem(key) === value;
  } catch {
    return false;
  }
}

function removeItem(store: KeyValueStore, key: string): void {
  try {
    store.removeItem(key);
  } catch {
    /* private mode */
  }
}

function guard(store: Storage): KeyValueStore {
  return {
    getItem: (key) => readItem(store, key),
    setItem: (key, value) => {
      writeItem(store, key, value);
    },
    removeItem: (key) => removeItem(store, key),
  };
}

function browserLocal(): KeyValueStore {
  return guard(localStorage);
}

function browserSession(): KeyValueStore {
  return guard(sessionStorage);
}

/**
 * True after a successful sign-in until the user signs out.
 * A marker left in sessionStorage by an older build is copied over so an
 * already open tab does not have to sign in again after this update.
 */
export function readSignedInPreference(
  local: KeyValueStore = browserLocal(),
  session: KeyValueStore = browserSession(),
): boolean {
  if (readItem(local, AUTH_STORAGE_KEY) === "1") return true;
  if (readItem(session, AUTH_STORAGE_KEY) !== "1") return false;
  if (writeItem(local, AUTH_STORAGE_KEY, "1")) removeItem(session, AUTH_STORAGE_KEY);
  return true;
}

export function rememberSignedIn(local: KeyValueStore = browserLocal(), session: KeyValueStore = browserSession()): void {
  writeItem(local, AUTH_STORAGE_KEY, "1");
  removeItem(session, AUTH_STORAGE_KEY);
}

export function forgetSignedIn(local: KeyValueStore = browserLocal(), session: KeyValueStore = browserSession()): void {
  removeItem(local, AUTH_STORAGE_KEY);
  removeItem(session, AUTH_STORAGE_KEY);
}
