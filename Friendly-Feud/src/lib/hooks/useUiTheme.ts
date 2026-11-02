import { applyUiTheme, DEFAULT_UI_THEME, getStoredUiTheme } from "@/lib/theme/themes";
import { useCallback, useEffect, useState } from "react";

/** The per-device UI theme (stored in localStorage, applied as `html[data-theme]`). */
export function useUiTheme(): [string, (id: string) => void] {
  const [theme, setTheme] = useState(DEFAULT_UI_THEME);
  useEffect(() => {
    setTheme(getStoredUiTheme());
  }, []);
  const choose = useCallback((id: string) => setTheme(applyUiTheme(id)), []);
  return [theme, choose];
}
