/**
 * The TV picture is drawn on a "canvas" that is laid out as if the screen were 1080 CSS pixels tall (the size the
 * board was designed for) and then scaled up or down to the real screen. A 4K TV therefore shows exactly the same
 * picture as a 1080p one, just sharper, and a small laptop window shows the same layout, just smaller.
 */
export const REFERENCE_HEIGHT = 1080;
export const MIN_DISPLAY_SCALE = 50;
export const MAX_DISPLAY_SCALE = 100;
export const DEFAULT_DISPLAY_SCALE = 100;

const MIN_BASE = 0.4;
const MAX_BASE = 4;

export interface TvLayout {
  /** Factor from canvas pixels to screen pixels (2 on a 4K TV, 1 on 1080p). */
  base: number;
  /** Canvas size in its own pixels: always exactly fills the screen once scaled by `base`. */
  width: number;
  height: number;
  /** How much of the canvas the content may use, in percent (the host's "TV size" setting). */
  percent: number;
  /** Space left empty on each side of the canvas, in percent of its width/height. */
  insetPercent: number;
}

/** Clamp the host's setting; anything missing or invalid (old games have 0) means "full size". */
export function normalizeDisplayScale(value: number | null | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return DEFAULT_DISPLAY_SCALE;
  return Math.min(MAX_DISPLAY_SCALE, Math.max(MIN_DISPLAY_SCALE, Math.round(value)));
}

export function tvLayout(screenWidth: number, screenHeight: number, displayScale?: number | null): TvLayout {
  const width = Math.max(1, screenWidth);
  const height = Math.max(1, screenHeight);
  // A portrait screen (a phone used as a second display) is sized by its width instead.
  const reference = width < height ? width : height;
  const base = Math.min(MAX_BASE, Math.max(MIN_BASE, reference / REFERENCE_HEIGHT));
  const percent = normalizeDisplayScale(displayScale);
  return {
    base,
    width: width / base,
    height: height / base,
    percent,
    insetPercent: (100 - percent) / 2,
  };
}
