import { resolveTeamHex, TEAM_PRESETS } from "@/lib/theme/team-palette";
import { getTeamDisplayName } from "@/lib/utils/team-display";
import { Game, WSEvent } from "@/types/game";
import { Check } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface TeamColorPickerProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
}

const swatch =
  "relative grid size-11 place-items-center rounded-full border-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold focus-visible:ring-offset-2 focus-visible:ring-offset-pro-panel";

/** Team colours are part of the game state, so the TV and every phone show the same colours. */
export default function TeamColorPicker({ game, setGame, send }: TeamColorPickerProps) {
  const { t } = useTranslation();

  const setColor = (team: number, color: string) => {
    const next: Game = JSON.parse(JSON.stringify(game));
    const other = 1 - team;
    const previous = resolveTeamHex(next.teams[team].color, team);
    // Never leave both teams with the same colour: hand the other team this team's old one.
    if (resolveTeamHex(next.teams[other].color, other) === resolveTeamHex(color, team)) {
      next.teams[other].color = next.teams[team].color ?? previous;
    }
    next.teams[team].color = color;
    setGame(next);
    send({ action: "data", data: next });
  };

  return (
    <div className="space-y-4" id="teamColorPicker">
      {[0, 1].map((team) => {
        const name = getTeamDisplayName(game.teams[team]?.name ?? "", team, t);
        const currentHex = resolveTeamHex(game.teams[team]?.color, team);
        const isCustom = !TEAM_PRESETS.some((p) => p.hex === currentHex);
        return (
          <fieldset key={team} className="min-w-0 space-y-2">
            <legend className="text-sm font-medium text-pro-text">{t("{{team}} colour", { team: name })}</legend>
            <div className="flex flex-wrap items-center gap-2">
              {TEAM_PRESETS.map((preset) => {
                const selected = preset.hex === currentHex;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    id={`teamColor-${team}-${preset.id}`}
                    aria-label={t(preset.label)}
                    title={t(preset.label)}
                    aria-pressed={selected}
                    onClick={() => setColor(team, preset.id)}
                    className={`${swatch} ${selected ? "border-pro-text" : "border-transparent"}`}
                    style={{ backgroundColor: preset.hex }}
                  >
                    {selected && <Check size={18} aria-hidden className="text-black" />}
                  </button>
                );
              })}
              <label
                className={`${swatch} cursor-pointer overflow-hidden focus-within:ring-2 focus-within:ring-pro-gold ${
                  isCustom ? "border-pro-text" : "border-pro-line"
                }`}
                style={isCustom ? { backgroundColor: currentHex } : undefined}
                title={t("Custom colour")}
              >
                <span className="sr-only">{t("Custom colour")}</span>
                <input
                  id={`teamColorCustom-${team}`}
                  type="color"
                  value={currentHex}
                  onChange={(e) => setColor(team, e.target.value.toLowerCase())}
                  className="absolute inset-0 size-full cursor-pointer opacity-0"
                />
                {!isCustom && (
                  <span aria-hidden className="text-lg font-bold text-pro-mute">
                    +
                  </span>
                )}
                {isCustom && <Check size={18} aria-hidden className="relative text-white mix-blend-difference" />}
              </label>
            </div>
          </fieldset>
        );
      })}
    </div>
  );
}
