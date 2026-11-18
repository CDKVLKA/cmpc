import { SHEETS_SCOPE } from "../config";

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  error?: string;
  error_description?: string;
}

interface TokenClient {
  requestAccessToken: (override?: { prompt?: string }) => void;
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

export function requestToken(prompt: "" | "consent"): Promise<{ token: string; expiresIn: number }> {
  const id = clientId();
  if (!id) return Promise.reject(new Error("no-client"));
  return loadGis().then(
    () =>
      new Promise((resolve, reject) => {
        const google = window.google;
        if (!google) {
          reject(new Error("gis"));
          return;
        }
        const client = google.accounts.oauth2.initTokenClient({
          client_id: id,
          scope: SHEETS_SCOPE,
          callback: (response) => {
            if (!response.access_token || response.error) {
              reject(new Error(response.error_description || response.error || "auth"));
              return;
            }
            resolve({ token: response.access_token, expiresIn: response.expires_in ?? 3600 });
          },
          error_callback: (error) => reject(new Error(error.message || error.type)),
        });
        client.requestAccessToken(prompt ? { prompt } : { prompt: "" });
      }),
  );
}

export function revokeToken(token: string): void {
  window.google?.accounts.oauth2.revoke(token);
}
