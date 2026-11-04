export interface SysMeta {
  abbr: string;
  full: string;
  maker: string;
  from: string;
  to: string;
  logo: string;
}

const FULL_NAME: Record<string, string> = {
  "PlayStation 1": "Sony PlayStation",
  "PlayStation 2": "PlayStation 2",
  "PlayStation 3": "PlayStation 3",
  "PlayStation 4": "PlayStation 4",
  "PlayStation 5": "PlayStation 5",
  PSP: "PlayStation Portable",
  "PS Vita": "PlayStation Vita",
  PC: "Personal Computer",
  "Mega Drive / Genesis": "Sega Mega Drive",
  "Mega-CD / Sega CD": "Sega Mega-CD",
  "Sega Saturn": "Sega Saturn",
  Dreamcast: "Sega Dreamcast",
  "Master System": "Sega Master System",
  "Game Gear": "Sega Game Gear",
  "Sega 32X": "Sega 32X",
  SNES: "Super Nintendo Entertainment System",
  NES: "Nintendo Entertainment System",
  "Game Boy": "Nintendo Game Boy",
  "Game Boy Color": "Nintendo Game Boy Color",
  "Game Boy Advance": "Nintendo Game Boy Advance",
  "Nintendo DS": "Nintendo DS",
  "Nintendo 3DS": "Nintendo 3DS",
  GameCube: "Nintendo GameCube",
  Wii: "Nintendo Wii",
  "Wii U": "Nintendo Wii U",
  "Nintendo Switch": "Nintendo Switch",
  N64: "Nintendo 64",
  "TurboGrafx-16": "NEC TurboGrafx-16",
  "TurboGrafx-CD": "NEC TurboGrafx-CD",
  "PC-FX": "NEC PC-FX",
  "Neo Geo": "SNK Neo Geo",
  "Neo Geo Pocket Color": "SNK Neo Geo Pocket Color",
  Arcade: "Arcade",
  "Original Xbox": "Microsoft Xbox",
  "Xbox 360": "Xbox 360",
  WonderSwan: "Bandai WonderSwan",
  MSX2: "MSX2",
  "Sharp X68000": "Sharp X68000",
  "3DO": "3DO Interactive Multiplayer",
  Mobile: "Mobile",
};

export const SYSMETA: Record<string, Omit<SysMeta, "full" | "logo">> = {
  "PlayStation 1": { abbr: "PS1", maker: "Sony", from: "#3a4150", to: "#8a95ab" },
  "PlayStation 2": { abbr: "PS2", maker: "Sony", from: "#12235e", to: "#2f55c8" },
  "PlayStation 3": { abbr: "PS3", maker: "Sony", from: "#16181f", to: "#5a6070" },
  "PlayStation 4": { abbr: "PS4", maker: "Sony", from: "#003791", to: "#1a5fc4" },
  "PlayStation 5": { abbr: "PS5", maker: "Sony", from: "#1a1a1a", to: "#5c5c66" },
  PSP: { abbr: "PSP", maker: "Sony", from: "#2c2c32", to: "#7a7a88" },
  "PS Vita": { abbr: "VITA", maker: "Sony", from: "#0b3d91", to: "#2f86e0" },
  PC: { abbr: "PC", maker: "Computer", from: "#283445", to: "#5b7896" },
  "Mega Drive / Genesis": { abbr: "MD", maker: "Sega", from: "#1c1c24", to: "#c8202f" },
  "Mega-CD / Sega CD": { abbr: "MCD", maker: "Sega", from: "#1d2a5a", to: "#3d63c0" },
  "Sega Saturn": { abbr: "SAT", maker: "Sega", from: "#1f2f6b", to: "#5a7fd8" },
  Dreamcast: { abbr: "DC", maker: "Sega", from: "#d0561c", to: "#f3a04a" },
  "Master System": { abbr: "SMS", maker: "Sega", from: "#1a3a6b", to: "#3d7ec4" },
  "Game Gear": { abbr: "GG", maker: "Sega", from: "#1a2744", to: "#3a6ea5" },
  "Sega 32X": { abbr: "32X", maker: "Sega", from: "#3a2a44", to: "#8a4a6a" },
  SNES: { abbr: "SNES", maker: "Nintendo", from: "#5b4bb7", to: "#8f7fe0" },
  NES: { abbr: "NES", maker: "Nintendo", from: "#b8323a", to: "#e06058" },
  "Game Boy": { abbr: "GB", maker: "Nintendo", from: "#6b7a3a", to: "#a5b85a" },
  "Game Boy Color": { abbr: "GBC", maker: "Nintendo", from: "#7a3fb0", to: "#c06ad8" },
  "Game Boy Advance": { abbr: "GBA", maker: "Nintendo", from: "#3b3fa8", to: "#6f6ee0" },
  "Nintendo DS": { abbr: "DS", maker: "Nintendo", from: "#2a4a6a", to: "#6aa0c8" },
  "Nintendo 3DS": { abbr: "3DS", maker: "Nintendo", from: "#8a2a3a", to: "#e07070" },
  GameCube: { abbr: "GCN", maker: "Nintendo", from: "#4a3f9a", to: "#7a6fd0" },
  Wii: { abbr: "Wii", maker: "Nintendo", from: "#1a6a8a", to: "#7ec8e0" },
  "Wii U": { abbr: "Wii U", maker: "Nintendo", from: "#1489b8", to: "#4cc2e8" },
  "Nintendo Switch": { abbr: "NSW", maker: "Nintendo", from: "#e60012", to: "#ff5a5a" },
  N64: { abbr: "N64", maker: "Nintendo", from: "#1a6b32", to: "#3dae58" },
  "TurboGrafx-16": { abbr: "TG16", maker: "NEC", from: "#8a2a12", to: "#e07040" },
  "TurboGrafx-CD": { abbr: "TG-CD", maker: "NEC", from: "#8a2a12", to: "#e0643a" },
  "PC-FX": { abbr: "PC-FX", maker: "NEC", from: "#4a2060", to: "#a050c0" },
  "Neo Geo": { abbr: "NEO", maker: "SNK", from: "#6b5410", to: "#d4a72c" },
  "Neo Geo Pocket Color": { abbr: "NGPC", maker: "SNK", from: "#5a3010", to: "#e09030" },
  Arcade: { abbr: "ARC", maker: "Arcade", from: "#5a1a6b", to: "#c0369a" },
  "Original Xbox": { abbr: "XBOX", maker: "Microsoft", from: "#1d5a1d", to: "#5ab43a" },
  "Xbox 360": { abbr: "360", maker: "Microsoft", from: "#1a3a1a", to: "#7dca4a" },
  WonderSwan: { abbr: "WS", maker: "Bandai", from: "#2a3a55", to: "#6a88b0" },
  MSX2: { abbr: "MSX2", maker: "MSX", from: "#1e3a4a", to: "#3e8aaa" },
  "Sharp X68000": { abbr: "X68K", maker: "Sharp", from: "#2a2a32", to: "#6a6a78" },
  "3DO": { abbr: "3DO", maker: "3DO", from: "#6a1a28", to: "#d04050" },
  Mobile: { abbr: "MOB", maker: "Mobile", from: "#243044", to: "#5a7090" },
};

export function sysMeta(name: string): SysMeta {
  const known = SYSMETA[name];
  const abbr = known?.abbr ?? (name.replace(/[^A-Za-z0-9]/g, "").slice(0, 4).toUpperCase() || "SYS");
  return {
    abbr,
    full: FULL_NAME[name] ?? name,
    maker: known?.maker ?? "",
    from: known?.from ?? "#2a3656",
    to: known?.to ?? "#4f6aa8",
    logo: `${abbr.toLowerCase().replace(/[^a-z0-9]+/g, "")}.svg`,
  };
}
