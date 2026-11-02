import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { contrastRatio, hexToRgb, Rgb, TEAM_PRESETS, teamCssVars } from "./team-palette";
import { isUiTheme, THEME_INIT_SCRIPT, UI_THEMES } from "./themes";

const css = readFileSync(join(__dirname, "../../global.css"), "utf8");

function block(selector: string): Record<string, Rgb> {
  const m = css.match(new RegExp(`${selector.replace(/[[\]"]/g, "\\$&")}\\s*\\{([^}]*)\\}`));
  if (!m) throw new Error(`no CSS block for ${selector}`);
  const out: Record<string, Rgb> = {};
  for (const [, name, v] of m[1]
    .matchAll(/--pro-([a-z0-9-]+):\s*(\d+) (\d+) (\d+);/g)
    .map((x) => [x[0], x[1], x.slice(2, 5)] as const)) {
    out[name] = v.map(Number) as Rgb;
  }
  return out;
}

const WHITE: Rgb = [255, 255, 255];
const BLACK: Rgb = [0, 0, 0];

describe("ui themes", () => {
  it("lists dark first and validates ids", () => {
    expect(UI_THEMES[0].id).toBe("dark");
    expect(isUiTheme("neon")).toBe(true);
    expect(isUiTheme('evil"</script>')).toBe(false);
    expect(THEME_INIT_SCRIPT).toContain("data-theme");
  });

  it.each(UI_THEMES.map((t) => t.id))("%s defines every variable and meets WCAG AA", (id) => {
    const c = block(id === "dark" ? ':root, [data-theme="dark"]' : `[data-theme="${id}"]`);
    for (const key of [
      "bg",
      "panel",
      "raised",
      "line",
      "text",
      "mute",
      "accent",
      "accent-hover",
      "link",
      "gold",
      "ok",
      "danger",
      "danger-text",
    ]) {
      expect(c[key], `${id} --pro-${key}`).toBeDefined();
    }
    const AA = 4.5;
    for (const surface of ["bg", "panel", "raised"]) {
      expect(contrastRatio(c.text, c[surface]), `text on ${surface}`).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(c.mute, c[surface]), `mute on ${surface}`).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(c.link, c[surface]), `link on ${surface}`).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(c.gold, c[surface]), `gold on ${surface}`).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(c["danger-text"], c[surface]), `danger-text on ${surface}`).toBeGreaterThanOrEqual(AA);
      expect(contrastRatio(c.ok, c[surface]), `ok on ${surface}`).toBeGreaterThanOrEqual(AA);
      for (const p of TEAM_PRESETS) {
        expect(contrastRatio(hexToRgb(p.hex), c[surface]), `${p.id} on ${surface}`).toBeGreaterThanOrEqual(AA);
      }
    }
    expect(contrastRatio(WHITE, c.accent), "white on accent").toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(WHITE, c["accent-hover"]), "white on accent-hover").toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(BLACK, c.gold), "black on gold").toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(BLACK, c.ok), "black on ok").toBeGreaterThanOrEqual(AA);
    expect(contrastRatio(WHITE, c.danger), "white on danger").toBeGreaterThanOrEqual(AA);
  });

  it("pre-hydration team defaults in global.css match the generated ones", () => {
    const root = css.match(/:root\s*\{([^}]*)\}/)![1];
    const vars = { ...teamCssVars(undefined, 0), ...teamCssVars(undefined, 1) };
    for (const [name, value] of Object.entries(vars)) {
      expect(root, name).toContain(`${name}: ${value};`);
    }
  });
});
