export interface GoogleProfile {
  name: string;
  email: string;
  picture: string;
}

const KEY = "cmpc-profile";

export function readProfile(storage: Pick<Storage, "getItem"> | null = typeof localStorage === "undefined" ? null : localStorage): GoogleProfile | null {
  if (!storage) return null;
  try {
    const parsed = JSON.parse(storage.getItem(KEY) ?? "null") as Partial<GoogleProfile> | null;
    if (!parsed || typeof parsed !== "object") return null;
    const profile = {
      name: typeof parsed.name === "string" ? parsed.name : "",
      email: typeof parsed.email === "string" ? parsed.email : "",
      picture: typeof parsed.picture === "string" ? parsed.picture : "",
    };
    return profile.name || profile.email || profile.picture ? profile : null;
  } catch {
    return null;
  }
}

export function writeProfile(profile: GoogleProfile, storage: Pick<Storage, "setItem"> | null = typeof localStorage === "undefined" ? null : localStorage): void {
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(profile));
  } catch {
    /* private mode */
  }
}

export function clearProfile(storage: Pick<Storage, "removeItem"> | null = typeof localStorage === "undefined" ? null : localStorage): void {
  if (!storage) return;
  try {
    storage.removeItem(KEY);
  } catch {
    /* private mode */
  }
}

export async function fetchProfile(token: string): Promise<GoogleProfile | null> {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return null;
    const json = (await response.json()) as { name?: string; email?: string; picture?: string };
    const profile = {
      name: json.name ?? "",
      email: json.email ?? "",
      picture: json.picture ?? "",
    };
    if (!profile.name && !profile.email && !profile.picture) return null;
    writeProfile(profile);
    return profile;
  } catch {
    return null;
  }
}

export function profileHue(seed: string): number {
  let hash = 0;
  for (const char of seed) hash = (hash * 33 + char.charCodeAt(0)) % 360;
  return hash;
}
