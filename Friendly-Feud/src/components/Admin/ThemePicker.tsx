import { useUiTheme } from "@/lib/hooks/useUiTheme";
import { UI_THEMES } from "@/lib/theme/themes";
import { Check } from "lucide-react";
import { useTranslation } from "react-i18next";

/** Per-device colour theme for the host console and phones (saved in this browser only). */
export default function ThemePicker() {
  const { t } = useTranslation();
  const [current, choose] = useUiTheme();

  return (
    <fieldset className="min-w-0 space-y-2">
      <legend className="text-sm font-medium text-pro-text">{t("Colour theme")}</legend>
      <div className="flex flex-wrap gap-2" id="uiThemePicker">
        {UI_THEMES.map((theme) => {
          const selected = theme.id === current;
          return (
            <button
              key={theme.id}
              type="button"
              id={`uiTheme-${theme.id}`}
              aria-pressed={selected}
              onClick={() => choose(theme.id)}
              className={`flex min-h-11 items-center gap-2 rounded-[10px] border-2 bg-pro-raised px-2 py-1.5 text-sm font-medium text-pro-text hover:bg-pro-line focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold ${
                selected ? "border-pro-text" : "border-pro-line"
              }`}
            >
              {/* Preview scoped to this theme's own variables. */}
              <span
                data-theme={theme.id}
                aria-hidden
                className="flex h-7 w-12 shrink-0 items-center justify-center gap-1 rounded-md border border-pro-line bg-pro-bg"
              >
                <span className="size-3 rounded-full bg-pro-accent" />
                <span className="size-3 rounded-full bg-pro-gold" />
                <span className="size-3 rounded-full bg-pro-panel ring-1 ring-pro-line" />
              </span>
              {t(theme.label)}
              {selected && <Check size={14} aria-hidden />}
            </button>
          );
        })}
      </div>
      <p className="text-xs text-pro-mute">{t("Applies to this device only.")}</p>
    </fieldset>
  );
}
