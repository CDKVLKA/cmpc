import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SHEETS_SCOPE } from "../config";
import {
  allowsSilentPopup,
  authFailureKind,
  requestRememberedToken,
  SIGN_IN_SCOPE,
  requestToken,
  resetRememberedTokenAttempt,
  SILENT_TOKEN_TIMEOUT_MS,
} from "./google";

interface ClientControls {
  succeed: (token?: string, expires?: number) => void;
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
                succeed: (token = "tok", expires = 3600) =>
                  config.callback({ access_token: token, expires_in: expires, state }),
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
  resetRememberedTokenAttempt();
  Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  resetRememberedTokenAttempt();
  delete (globalThis as { google?: unknown }).google;
});

describe("requestToken", () => {
  it("resolves a silent token without asking for consent", async () => {
    const { prompts } = installGoogle((_prompt, _state, client) => client.succeed("access", 1800));
    await expect(requestToken("")).resolves.toEqual({ token: "access", expiresIn: 1800 });
    expect(prompts).toEqual([""]);
  });

  it("rejects when Google closes or blocks the popup", async () => {
    installGoogle((_prompt, _state, client) => client.fail("popup_failed_to_open"));
    const error = await requestToken("").catch((caught: unknown) => caught);
    expect(authFailureKind(error)).toBe("blocked");

    installGoogle((_prompt, _state, client) => client.fail("popup_closed"));
    const closed = await requestToken("consent").catch((caught: unknown) => caught);
    expect(authFailureKind(closed)).toBe("cancelled");
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
});

describe("requestRememberedToken", () => {
  it("does not start while offline, then tries exactly once", async () => {
    Object.defineProperty(globalThis, "navigator", { value: { onLine: false }, configurable: true });
    let calls = 0;
    installGoogle((_prompt, _state, client) => {
      calls += 1;
      client.fail("popup_failed_to_open");
    });
    expect(requestRememberedToken()).toBeNull();
    expect(calls).toBe(0);

    Object.defineProperty(globalThis, "navigator", { value: { onLine: true }, configurable: true });
    const first = requestRememberedToken();
    const second = requestRememberedToken();
    expect(second).toBe(first);
    await expect(first).rejects.toThrow("popup_failed_to_open");
    expect(requestRememberedToken()).toBeNull();
    expect(calls).toBe(1);
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
