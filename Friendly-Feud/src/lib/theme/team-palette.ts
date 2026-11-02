// Team colours: a small preset palette plus optional custom `#rrggbb`.
// The chosen value travels with the game state (`Team.color`) so the TV and phones match the host.
// Only preset ids and 6-digit hex are ever accepted, so a colour can never smuggle CSS in.

export interface TeamPreset {
  id: string;
  /** English label, translated at the call site with t(). */
  label: string;
  hex: string;
}

export const TEAM_PRESETS: readonly TeamPreset[] = [
  { id: "red", label: "Red", hex: "#fb7185" },
  { id: "orange", label: "Orange", hex: "#fb923c" },
  { id: "yellow", label: "Yellow", hex: "#facc15" },
  { id: "green", label: "Green", hex: "#34d399" },
  { id: "teal", label: "Teal", hex: "#2dd4bf" },
  { id: "blue", label: "Blue", hex: "#60a5fa" },
  { id: "purple", label: "Purple", hex: "#a78bfa" },
  { id: "pink", label: "Pink", hex: "#f472b6" },
];

/** Colour a team gets while the host has not picked one. */
export const DEFAULT_TEAM_COLORS = ["red", "green"] as const;

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

export function isValidTeamColor(value: unknown): value is string {
  return typeof value === "string" && (HEX_RE.test(value) || TEAM_PRESETS.some((p) => p.id === value));
}

/** The hex for a stored colour; unset or invalid values fall back to the team's default. */
export function resolveTeamHex(color: unknown, team: number): string {
  const fallbackId = DEFAULT_TEAM_COLORS[team === 1 ? 1 : 0];
  const id = isValidTeamColor(color) ? color : fallbackId;
  if (HEX_RE.test(id)) return id.toLowerCase();
  return (TEAM_PRESETS.find((p) => p.id === id) ?? TEAM_PRESETS[0]).hex;
}

export type Rgb = [number, number, number];

export function hexToRgb(hex: string): Rgb {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex([r, g, b]: Rgb): string {
  return `#${[r, g, b].map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
}

function channel(v: number): number {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

export function luminance([r, g, b]: Rgb): number {
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1..21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

export function mix(a: Rgb, b: Rgb, amount: number): Rgb {
  return [0, 1, 2].map((i) => a[i] + (b[i] - a[i]) * amount) as Rgb;
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];
/** Lightest panel colour of any UI theme: team colours used as text must read on it. */
const READABLE_AGAINST: Rgb = [17, 40, 107];

/** Black or white, whichever reads better on `bg`. */
export function onColor(bg: Rgb): Rgb {
  return contrastRatio(bg, BLACK) >= contrastRatio(bg, WHITE) ? BLACK : WHITE;
}

/** Lighten `rgb` until it reaches `ratio` against `bg` (no-op when it already does). */
function lightenUntil(rgb: Rgb, bg: Rgb, ratio: number): Rgb {
  let out = rgb;
  for (let i = 1; i <= 20 && contrastRatio(out, bg) < ratio; i++) out = mix(rgb, WHITE, i / 20);
  return out;
}

/** Darken `rgb` until white text on it reaches `ratio`. */
function darkenUntilWhiteReads(rgb: Rgb, ratio: number): Rgb {
  let out = rgb;
  for (let i = 1; i <= 20 && contrastRatio(out, WHITE) < ratio; i++) out = mix(rgb, BLACK, i / 20);
  return out;
}

export interface TeamShades {
  /** Bright tone for text, dots and filled buttons on the host/phone UI. */
  base: Rgb;
  /** Text colour for content sitting on `base`. */
  on: Rgb;
  /** TV board scale. 700 carries white text, 200 carries 900-coloured text. */
  s900: Rgb;
  s700: Rgb;
  s500: Rgb;
  s200: Rgb;
}

export function teamShades(color: unknown, team: number): TeamShades {
  const raw = hexToRgb(resolveTeamHex(color, team));
  const base = lightenUntil(raw, READABLE_AGAINST, 4.5);
  const s700 = darkenUntilWhiteReads(raw, 4.5);
  return {
    base,
    on: onColor(base),
    s900: mix(s700, BLACK, 0.55),
    s700,
    s500: raw,
    s200: mix(raw, WHITE, 0.82),
  };
}

const triplet = ([r, g, b]: Rgb) => `${Math.round(r)} ${Math.round(g)} ${Math.round(b)}`;

/** CSS custom properties (space-separated RGB, usable with `rgb(var(--x) / alpha)`) for one team. */
export function teamCssVars(color: unknown, team: number): Record<string, string> {
  const t = team === 1 ? 1 : 0;
  const s = teamShades(color, t);
  return {
    [`--pro-team${t}`]: triplet(s.base),
    [`--pro-team${t}-on`]: triplet(s.on),
    [`--team${t + 1}-900`]: triplet(s.s900),
    [`--team${t + 1}-700`]: triplet(s.s700),
    [`--team${t + 1}-500`]: triplet(s.s500),
    [`--team${t + 1}-200`]: triplet(s.s200),
  };
}
