import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  hexToRgb,
  isValidTeamColor,
  resolveTeamHex,
  TEAM_PRESETS,
  teamCssVars,
  teamShades,
} from "./team-palette";

describe("isValidTeamColor", () => {
  it("accepts preset ids and #rrggbb", () => {
    for (const p of TEAM_PRESETS) expect(isValidTeamColor(p.id)).toBe(true);
    expect(isValidTeamColor("#00ff7f")).toBe(true);
    expect(isValidTeamColor("#ABCDEF")).toBe(true);
  });
  it("rejects anything that could carry CSS", () => {
    for (const bad of [
      "",
      "#fff",
      "#12345g",
      "red;background:url(x)",
      "rgb(0,0,0)",
      "#1234567",
      "url(x)",
      5,
      null,
      undefined,
    ]) {
      expect(isValidTeamColor(bad)).toBe(false);
    }
  });
});

describe("resolveTeamHex", () => {
  it("falls back to red / green when unset or invalid", () => {
    expect(resolveTeamHex(undefined, 0)).toBe(TEAM_PRESETS.find((p) => p.id === "red")!.hex);
    expect(resolveTeamHex("nope", 1)).toBe(TEAM_PRESETS.find((p) => p.id === "green")!.hex);
  });
  it("maps presets and lowercases custom hex", () => {
    expect(resolveTeamHex("blue", 0)).toBe(TEAM_PRESETS.find((p) => p.id === "blue")!.hex);
    expect(resolveTeamHex("#AA00FF", 1)).toBe("#aa00ff");
  });
});

describe("teamShades readability", () => {
  const WHITE = hexToRgb("#ffffff");
  const lightestPanel = hexToRgb("#11286b");
  const samples = [...TEAM_PRESETS.map((p) => p.id), "#000000", "#ffffff", "#0000ff", "#ffff00", "#123456"];
  it.each(samples)("%s: text, white-on-700 and on-colour all reach AA", (color) => {
    const s = teamShades(color, 0);
    expect(contrastRatio(s.base, lightestPanel)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(s.s700, WHITE)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(s.on, s.base)).toBeGreaterThanOrEqual(4.5);
    expect(contrastRatio(s.s900, s.s200)).toBeGreaterThanOrEqual(4.5);
  });
  it("leaves bright presets untouched", () => {
    expect(teamShades("red", 0).base).toEqual(hexToRgb("#fb7185"));
  });
});

describe("teamCssVars", () => {
  it("emits only digits and spaces for values", () => {
    const vars = teamCssVars("#123abc", 1);
    expect(Object.keys(vars).every((k) => k.startsWith("--"))).toBe(true);
    expect(Object.values(vars).every((v) => /^\d{1,3} \d{1,3} \d{1,3}$/.test(v))).toBe(true);
    expect(vars["--pro-team1"]).toBeDefined();
    expect(vars["--team2-700"]).toBeDefined();
  });
});
