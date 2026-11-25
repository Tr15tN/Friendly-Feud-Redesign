import { describe, expect, it } from "vitest";
import { normalizeDisplayScale, tvLayout } from "./layout";

describe("tvLayout", () => {
  it("lays 1080p out at its own size", () => {
    const l = tvLayout(1920, 1080);
    expect(l.base).toBe(1);
    expect([l.width, l.height]).toEqual([1920, 1080]);
  });

  it("gives a 4K TV the same canvas as 1080p, drawn twice as large", () => {
    const l = tvLayout(3840, 2160);
    expect(l.base).toBe(2);
    expect([l.width, l.height]).toEqual([1920, 1080]);
  });

  it("keeps an ultrawide screen's extra width", () => {
    const l = tvLayout(2560, 1080);
    expect(l.base).toBe(1);
    expect(l.width).toBe(2560);
  });

  it("shrinks a small laptop window instead of changing the layout", () => {
    const l = tvLayout(1366, 768);
    expect(l.base).toBeCloseTo(768 / 1080);
    expect(l.height).toBeCloseTo(1080);
    expect(Math.round(l.width)).toBe(1921);
  });

  it("sizes a portrait screen by its width and never gets tiny", () => {
    expect(tvLayout(540, 1080).base).toBeCloseTo(0.5);
    expect(tvLayout(100, 800).base).toBe(0.4);
  });

  it("always fills the screen once scaled", () => {
    for (const [w, h] of [
      [1920, 1080],
      [3840, 2160],
      [1280, 720],
      [1024, 768],
      [2560, 1440],
      [800, 1280],
    ]) {
      const l = tvLayout(w, h, 90);
      expect(l.width * l.base).toBeCloseTo(w);
      expect(l.height * l.base).toBeCloseTo(h);
    }
  });

  it("turns the host's percentage into an equal margin on every side", () => {
    expect(tvLayout(1920, 1080, 90).insetPercent).toBe(5);
    expect(tvLayout(1920, 1080, 100).insetPercent).toBe(0);
  });
});

describe("normalizeDisplayScale", () => {
  it("treats missing and invalid values as full size", () => {
    for (const v of [undefined, null, 0, -5, NaN]) expect(normalizeDisplayScale(v)).toBe(100);
  });
  it("keeps the value inside the slider range", () => {
    expect(normalizeDisplayScale(10)).toBe(50);
    expect(normalizeDisplayScale(250)).toBe(100);
    expect(normalizeDisplayScale(87.4)).toBe(87);
  });
});
