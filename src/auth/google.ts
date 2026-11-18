import { SHEETS_SCOPE } from "../config";

/** Extra scopes so the avatar can read the Google profile. Sheet access stays the original scope. */
export const PROFILE_SCOPE = "openid profile email";
export const ACCOUNT_SCOPE = `${SHEETS_SCOPE} ${PROFILE_SCOPE}`;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
  state?: string;
}

interface TokenClient {
  requestAccessToken: (override?: { prompt?: string; state?: string }) => void;
}

interface GoogleIdentity {
  accounts: {
    oauth2: {
      initTokenClient: (config: {
        client_id: string;
        scope: string;
        callback: (response: TokenResponse) => void;
        error_callback?: (error: { type: string; message?: string }) => void;
      }) => TokenClient;
      revoke: (token: string, done?: () => void) => void;
    };
  };
}

declare global {
  interface Window {
    google?: GoogleIdentity;
  }
}

export interface TokenResult {
  token: string;
  expiresIn: number;
}

/**
 * A silent GIS token request opens a short-lived popup. Safari and an installed
 * iOS PWA block that popup when it is not tied to a tap, and a blocked popup
 * sometimes never calls back. Give up so the UI can show Anmelden again.
 */
export const SILENT_TOKEN_TIMEOUT_MS = 10_000;

export function clientId(): string {
  return (import.meta.env.VITE_GOOGLE_CLIENT_ID ?? "").trim();
}

let loading: Promise<void> | null = null;

export function loadGis(): Promise<void> {
  if (window.google?.accounts?.oauth2) return Promise.resolve();
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://accounts.google.com/gsi/client";
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        loading = null;
        reject(new Error("Google Identity Services"));
      };
      document.head.appendChild(script);
    });
  }
  return loading;
}

let requestSeq = 0;

export type TokenPrompt = "" | "consent";

/**
 * `prompt: ""` asks Google for a token without an account chooser or consent
 * screen. `consent` is the explicit Anmelden path and may show that UI.
 * No timeout on the explicit path: the user may sit on Google's window.
 */
export function requestToken(prompt: TokenPrompt, options?: { timeoutMs?: number; scope?: string }): Promise<TokenResult> {
  const id = clientId();
  if (!id) return Promise.reject(new Error("no-client"));
  const scope = options?.scope ?? SHEETS_SCOPE;
  if (window.google?.accounts?.oauth2) return requestLoadedToken(id, prompt, options?.timeoutMs, scope);
  return loadGis().then(() => requestLoadedToken(id, prompt, options?.timeoutMs, scope));
}

function requestLoadedToken(id: string, prompt: TokenPrompt, timeoutMs: number | undefined, scope: string): Promise<TokenResult> {
  return new Promise((resolve, reject) => {
    const google = window.google;
    if (!google) {
      reject(new Error("gis"));
      return;
    }
    const state = `cmpc-${++requestSeq}`;
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    if (timeoutMs != null) {
      timer = setTimeout(() => finish(() => reject(new Error("timeout"))), timeoutMs);
    }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: id,
      scope,
      callback: (response) => {
        if (response.state && response.state !== state) return;
        const accessToken = response.access_token;
        if (!accessToken || response.error) {
          finish(() => reject(new Error(response.error || response.error_description || "auth")));
          return;
        }
        finish(() => resolve({ token: accessToken, expiresIn: response.expires_in ?? 3600 }));
      },
      error_callback: (error) => finish(() => reject(new Error(error.type || error.message || "auth"))),
    });
    try {
      client.requestAccessToken({ prompt, state });
    } catch (error) {
      finish(() => reject(error instanceof Error ? error : new Error("auth")));
    }
  });
}

export type AuthFailureKind = "cancelled" | "blocked" | "timeout" | "other";

export function authFailureKind(error: unknown): AuthFailureKind {
  const message = error instanceof Error ? error.message : "";
  if (message === "popup_closed" || message === "popup_closed_by_user") return "cancelled";
  if (message === "popup_failed_to_open") return "blocked";
  if (message === "timeout") return "timeout";
  return "other";
}

let rememberedAttempt: Promise<SessionToken> | "done" | null = null;

function browserOnline(): boolean {
  return typeof navigator === "undefined" || navigator.onLine !== false;
}

/**
 * At most one silent token request per page load. Offline skips the attempt
 * so a later `online` event can still try once. Further calls return the
 * in-flight promise, then null — never a retry loop.
 */
export interface SessionToken extends TokenResult {
  /** True when the token includes openid/profile/email, not only Sheets. */
  profile: boolean;
}

/**
 * One silent attempt per page load. Asks for the profile scopes first.
 * If Google still only granted Sheets, fall back to that scope once so the
 * sheet session still restores. A second failure stops; nothing retries.
 */
export function requestRememberedToken(): Promise<SessionToken> | null {
  if (rememberedAttempt === "done") return null;
  if (rememberedAttempt) return rememberedAttempt;
  if (!browserOnline()) return null;
  const flight = (async (): Promise<SessionToken> => {
    try {
      const result = await requestToken("", { timeoutMs: SILENT_TOKEN_TIMEOUT_MS, scope: ACCOUNT_SCOPE });
      return { ...result, profile: true };
    } catch {
      const result = await requestToken("", { timeoutMs: SILENT_TOKEN_TIMEOUT_MS, scope: SHEETS_SCOPE });
      return { ...result, profile: false };
    }
  })().then(
    (result) => {
      rememberedAttempt = "done";
      return result;
    },
    (error: unknown) => {
      rememberedAttempt = "done";
      throw error;
    },
  );
  rememberedAttempt = flight;
  return flight;
}

export function resetRememberedTokenAttempt(): void {
  rememberedAttempt = null;
}

export function revokeToken(token: string): void {
  window.google?.accounts.oauth2.revoke(token);
}
