import { describe, expect, it, vi } from "vitest";
import { clearProfile, fetchProfile, readProfile, writeProfile } from "./profile";

function memory() {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
    removeItem: (key: string) => {
      map.delete(key);
    },
  };
}

describe("google profile cache", () => {
  it("stores the name, email and picture and clears them", () => {
    const store = memory();
    expect(readProfile(store)).toBeNull();
    writeProfile({ name: "Christian", email: "c@example.com", picture: "https://example.com/a.jpg" }, store);
    expect(readProfile(store)?.email).toBe("c@example.com");
    clearProfile(store);
    expect(readProfile(store)).toBeNull();
  });

  it("keeps the previous cache when userinfo rejects the token", async () => {
    const store = memory();
    writeProfile({ name: "Christian", email: "c@example.com", picture: "https://example.com/a.jpg" }, store);
    vi.stubGlobal("fetch", vi.fn(async () => new Response("no", { status: 403 })));
    await expect(fetchProfile("sheets-only")).resolves.toBeNull();
    expect(readProfile(store)?.name).toBe("Christian");
    vi.unstubAllGlobals();
  });
});
