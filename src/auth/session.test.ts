import { describe, expect, it } from "vitest";
import {
  AUTH_STORAGE_KEY,
  forgetSignedIn,
  readSignedInPreference,
  rememberSignedIn,
  type KeyValueStore,
} from "./session";

function memory(): KeyValueStore & { dump(): Record<string, string> } {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => {
      map.set(key, value);
    },
    removeItem: (key) => {
      map.delete(key);
    },
    dump: () => Object.fromEntries(map),
  };
}

describe("signed-in preference", () => {
  it("is absent until a sign-in is remembered", () => {
    const local = memory();
    const session = memory();
    expect(readSignedInPreference(local, session)).toBe(false);
    rememberSignedIn(local, session);
    expect(local.dump()).toEqual({ [AUTH_STORAGE_KEY]: "1" });
    expect(readSignedInPreference(local, session)).toBe(true);
  });

  it("copies a legacy session marker into local storage", () => {
    const local = memory();
    const session = memory();
    session.setItem(AUTH_STORAGE_KEY, "1");
    expect(readSignedInPreference(local, session)).toBe(true);
    expect(local.getItem(AUTH_STORAGE_KEY)).toBe("1");
    expect(session.getItem(AUTH_STORAGE_KEY)).toBeNull();
  });

  it("keeps the session marker when it cannot be copied", () => {
    const local = memory();
    const session = memory();
    session.setItem(AUTH_STORAGE_KEY, "1");
    local.setItem = () => {
      throw new Error("quota");
    };
    expect(readSignedInPreference(local, session)).toBe(true);
    expect(session.getItem(AUTH_STORAGE_KEY)).toBe("1");
  });

  it("clears both stores on sign-out", () => {
    const local = memory();
    const session = memory();
    rememberSignedIn(local, session);
    session.setItem(AUTH_STORAGE_KEY, "1");
    forgetSignedIn(local, session);
    expect(readSignedInPreference(local, session)).toBe(false);
    expect(local.dump()).toEqual({});
    expect(session.dump()).toEqual({});
  });

  it("ignores stores that throw on read", () => {
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error("private");
      },
      setItem: () => {
        throw new Error("private");
      },
      removeItem: () => {
        throw new Error("private");
      },
    };
    expect(readSignedInPreference(broken, broken)).toBe(false);
    expect(() => forgetSignedIn(broken, broken)).not.toThrow();
    expect(() => rememberSignedIn(broken, broken)).not.toThrow();
  });
});
