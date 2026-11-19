import { SHEETS_SCOPE } from "../config";

/**
 * Profile scopes are optional. The Cloud consent screen in Testing mode often
 * does not list them, and requesting them together with Sheets makes Google
 * reject the whole token. Sign-in therefore uses only the Sheets scope.
 * Add openid, userinfo.email and userinfo.profile under Data Access before
 * asking for them again.
 */
export const PROFILE_SCOPE = "openid profile email";
export const ACCOUNT_SCOPE = `${SHEETS_SCOPE} ${PROFILE_SCOPE}`;
export const SIGN_IN_SCOPE = SHEETS_SCOPE;

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
    let settled = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      fn();
    };
    const arm = (ms: number, message: string) => {
      clearTimeout(timer);
      timer = setTimeout(() => finish(() => reject(new Error(message))), ms);
    };
    if (timeoutMs != null) arm(timeoutMs, "timeout");
    const client = google.accounts.oauth2.initTokenClient({
      client_id: id,
      scope,
      callback: (response) => {
        // Do not compare response.state. GIS often omits it or returns a
        // different value, and dropping the callback leaves sign-in hanging.
        const accessToken = response.access_token;
        if (!accessToken || response.error) {
          finish(() => reject(new Error(response.error || response.error_description || "auth")));
          return;
        }
        finish(() => resolve({ token: accessToken, expiresIn: response.expires_in ?? 3600 }));
      },
      error_callback: (error) => {
        const type = error.type || error.message || "auth";
        // Desktop Chrome and Safari hit COOP on accounts.google.com. GIS then
        // cannot read popup.closed and reports popup_closed within about
        // 500ms, while the window is still open and the token still arrives
        // via postMessage. iOS Safari usually does not take that path.
        // Rejecting here drops the token and, on an explicit click, leaves
        // the button looking dead. Keep waiting for the real response.
        if (type === "popup_closed" || type === "popup_closed_by_user") return;
        finish(() => reject(new Error(type)));
      },
    });
    try {
      client.requestAccessToken({ prompt });
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

/**
 * iOS Safari, including the home-screen app, can kill the web process if GIS
 * opens a popup without a tap.
 */
export function allowsSilentPopup(env?: { ua?: string; platform?: string; maxTouchPoints?: number; standalone?: boolean }): boolean {
  const ua = env?.ua ?? (typeof navigator !== "undefined" && typeof navigator.userAgent === "string" ? navigator.userAgent : "");
  const platform = env?.platform ?? (typeof navigator !== "undefined" && typeof navigator.platform === "string" ? navigator.platform : "");
  const maxTouch = env?.maxTouchPoints ?? (typeof navigator !== "undefined" && typeof navigator.maxTouchPoints === "number" ? navigator.maxTouchPoints : 0);
  const iOS = /iPhone|iPad|iPod/.test(ua) || (platform === "MacIntel" && maxTouch > 1);
  if (iOS) return false;
  const standalone = env?.standalone ?? (typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia("(display-mode: standalone)").matches);
  if (standalone && /Safari/i.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/i.test(ua)) return false;
  return true;
}

export interface SessionToken extends TokenResult {
  /** True when the token includes openid/profile/email, not only Sheets. */
  profile: boolean;
}

/**
 * Does not open a GIS popup. A page-load `prompt: ""` runs outside a click.
 * Desktop Chrome and Safari either block that window or, once it opens,
 * reuse the single GIS name `g_auth_token_window` for the later Anmelden
 * click — whose callback then never runs. iPhone already skipped this
 * popup, which is why sign-in works there. Restoration happens on the click.
 */
export function requestRememberedToken(): Promise<SessionToken> | null {
  return null;
}

export function revokeToken(token: string): void {
  window.google?.accounts.oauth2.revoke(token);
}
