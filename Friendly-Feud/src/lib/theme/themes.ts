// Host/phone UI themes. The colours themselves live in src/global.css as
// `[data-theme="<id>"]` blocks of `--pro-*` CSS variables; this file only lists the ids.

export interface UiTheme {
  id: string;
  /** English label, translated at the call site with t(). */
  label: string;
}

export const UI_THEMES: readonly UiTheme[] = [
  { id: "dark", label: "Dark" },
  { id: "classic", label: "Classic" },
  { id: "sunset", label: "Sunset" },
  { id: "forest", label: "Forest" },
  { id: "neon", label: "Neon" },
  { id: "candy", label: "Candy" },
];

export const DEFAULT_UI_THEME = "dark";
export const UI_THEME_STORAGE_KEY = "ui-theme";

export function isUiTheme(value: unknown): value is string {
  return typeof value === "string" && UI_THEMES.some((t) => t.id === value);
}

/** Runs in <head> before first paint so the page never flashes the wrong theme. */
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem(${JSON.stringify(UI_THEME_STORAGE_KEY)});var ids=${JSON.stringify(UI_THEMES.map((x) => x.id))};document.documentElement.setAttribute("data-theme",ids.indexOf(t)>-1?t:${JSON.stringify(DEFAULT_UI_THEME)})}catch(e){}`;

export function getStoredUiTheme(): string {
  try {
    const stored = window.localStorage.getItem(UI_THEME_STORAGE_KEY);
    return isUiTheme(stored) ? stored : DEFAULT_UI_THEME;
  } catch {
    return DEFAULT_UI_THEME;
  }
}

export function applyUiTheme(id: string): string {
  const theme = isUiTheme(id) ? id : DEFAULT_UI_THEME;
  document.documentElement.setAttribute("data-theme", theme);
  try {
    window.localStorage.setItem(UI_THEME_STORAGE_KEY, theme);
  } catch {
    // Private mode / storage disabled: the theme still applies for this page view.
  }
  return theme;
}
