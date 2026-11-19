import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SHEETS_SCOPE } from "../config";
import {
  allowsSilentPopup,
  authFailureKind,
  requestRememberedToken,
  SIGN_IN_SCOPE,
  requestToken,
  SILENT_TOKEN_TIMEOUT_MS,
} from "./google";

interface ClientControls {
  succeed: (token?: string, expires?: number, responseState?: string) => void;
  fail: (type: string) => void;
  callbackError: (error: string) => void;
}

function installGoogle(onRequest: (prompt: string, state: string, client: ClientControls) => void): { prompts: string[] } {
  const prompts: string[] = [];
  window.google = {
    accounts: {
      oauth2: {
        initTokenClient: (config) => {
          expect(config.client_id).toBe("test-client.apps.googleusercontent.com");
          expect(config.scope).toBe(SHEETS_SCOPE);
          return {
            requestAccessToken: (override) => {
              const prompt = override?.prompt ?? "";
              const state = override?.state ?? "";
              prompts.push(prompt);
              onRequest(prompt, state, {
                succeed: (token = "tok", expires = 3600, responseState = state) =>
                  config.callback({ access_token: token, expires_in: expires, state: responseState }),
                fail: (type) => config.error_callback?.({ type }),
                callbackError: (error) => config.callback({ error, state }),
              });
            },
          };
        },
        revoke: () => undefined,
      },
    },
  };
  return { prompts };
}

beforeEach(() => {
  vi.stubGlobal("window", globalThis);
  vi.stubEnv("VITE_GOOGLE_CLIENT_ID", "test-client.apps.googleusercontent.com");
  Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  delete (globalThis as { google?: unknown }).google;
});

describe("requestToken", () => {
  it("resolves a silent token without asking for consent", async () => {
    const { prompts } = installGoogle((_prompt, _state, client) => client.succeed("access", 1800));
    await expect(requestToken("")).resolves.toEqual({ token: "access", expiresIn: 1800 });
    expect(prompts).toEqual([""]);
  });

  it("rejects when the popup cannot open", async () => {
    installGoogle((_prompt, _state, client) => client.fail("popup_failed_to_open"));
    const error = await requestToken("").catch((caught: unknown) => caught);
    expect(authFailureKind(error)).toBe("blocked");
  });

  it("keeps the token when GIS reports popup_closed before the real response", async () => {
    installGoogle((_prompt, state, client) => {
      expect(state).toBe("");
      client.fail("popup_closed");
      client.succeed("after-coop", 3600);
    });
    await expect(requestToken("consent")).resolves.toEqual({ token: "after-coop", expiresIn: 3600 });
  });

  it("accepts a token whose state does not match the request", async () => {
    installGoogle((_prompt, _state, client) => {
      client.succeed("kept", 1200, "not-ours");
    });
    await expect(requestToken("")).resolves.toEqual({ token: "kept", expiresIn: 1200 });
  });

  it("rejects a silent request that never calls back", async () => {
    vi.useFakeTimers();
    installGoogle(() => undefined);
    const pending = requestToken("", { timeoutMs: SILENT_TOKEN_TIMEOUT_MS });
    const assertion = expect(pending).rejects.toThrow("timeout");
    await vi.advanceTimersByTimeAsync(SILENT_TOKEN_TIMEOUT_MS);
    await assertion;
  });

  it("does not time out an explicit consent prompt", async () => {
    vi.useFakeTimers();
    const harness: { succeed: (() => void) | null } = { succeed: null };
    installGoogle((_prompt, _state, client) => {
      harness.succeed = () => client.succeed("clicked", 4000);
    });
    const pending = requestToken("consent");
    await vi.advanceTimersByTimeAsync(SILENT_TOKEN_TIMEOUT_MS * 3);
    harness.succeed?.();
    await expect(pending).resolves.toEqual({ token: "clicked", expiresIn: 4000 });
  });

  it("settles only once when the callback and the error both fire", async () => {
    installGoogle((_prompt, _state, client) => {
      client.succeed("once", 10);
      client.fail("popup_closed");
    });
    await expect(requestToken("")).resolves.toEqual({ token: "once", expiresIn: 10 });
  });

  it("keeps a click token when an earlier silent popup was already reported closed", async () => {
    const clients: Partial<Record<string, ClientControls>> = {};
    installGoogle((prompt, _state, client) => {
      clients[prompt] = client;
    });
    const silent = requestToken("", { timeoutMs: SILENT_TOKEN_TIMEOUT_MS });
    clients[""]?.fail("popup_closed");
    const clicked = requestToken("consent");
    clients.consent?.fail("popup_closed");
    clients.consent?.succeed("from-click", 3600);
    await expect(clicked).resolves.toEqual({ token: "from-click", expiresIn: 3600 });
    clients[""]?.succeed("from-load", 3600);
    await expect(silent).resolves.toEqual({ token: "from-load", expiresIn: 3600 });
  });
});

describe("requestRememberedToken", () => {
  it("does not open a popup on load, including desktop Chrome", () => {
    let calls = 0;
    installGoogle(() => {
      calls += 1;
    });
    expect(allowsSilentPopup({ ua: "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0", standalone: false })).toBe(true);
    expect(requestRememberedToken()).toBeNull();
    expect(requestRememberedToken()).toBeNull();
    expect(calls).toBe(0);
  });

  it("does not open a silent popup on iPhone, and sign-in stays on the Sheets scope", async () => {
    expect(SIGN_IN_SCOPE).toBe(SHEETS_SCOPE);
    expect(SIGN_IN_SCOPE.includes("openid")).toBe(false);
    let calls = 0;
    installGoogle(() => {
      calls += 1;
    });
    expect(allowsSilentPopup({ ua: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", standalone: true })).toBe(false);
    Object.defineProperty(globalThis, "navigator", {
      value: { onLine: true, userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)", platform: "iPhone", maxTouchPoints: 5 },
      configurable: true,
    });
    expect(requestRememberedToken()).toBeNull();
    expect(calls).toBe(0);
    expect(allowsSilentPopup({ ua: "Mozilla/5.0 (Windows NT 10.0) Chrome/120.0", standalone: false })).toBe(true);
  });
});
