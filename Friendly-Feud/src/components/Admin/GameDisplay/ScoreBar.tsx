import { firstBuzzTeam, isAwarded, MAX_STRIKES, roundPot, sanitizeMultiplier, setMultiplier } from "@/lib/scoring";
import { getTeamDisplayName } from "@/src/lib/utils";
import { teamColors } from "@/src/lib/utils/team-colors";
import { Game } from "@/src/types/game";
import { useTranslation } from "react-i18next";
import { ScoringApi } from "./useScoring";

const MULTIPLIER_PRESETS = [1, 2, 3];

function StrikePips({ count, team }: { count: number; team: number }) {
  const { t } = useTranslation();
  return (
    <div
      id={`adminTeam${team}Strikes`}
      className="flex gap-1"
      role="img"
      aria-label={t("Strikes {{count}} of {{max}}", { count, max: MAX_STRIKES })}
    >
      {Array.from({ length: MAX_STRIKES }, (_, i) => (
        <span
          key={i}
          className={`grid size-7 place-items-center rounded border-2 text-sm font-bold ${
            i < count ? "border-failure-900 bg-failure-700 text-white" : "border-secondary-700"
          }`}
        >
          {i < count ? "✕" : ""}
        </span>
      ))}
    </div>
  );
}

function TeamSummary({ game, team }: { game: Game; team: number }) {
  const { t } = useTranslation();
  const colors = teamColors(team);
  const round = game.rounds[game.round];
  const banked = round?.awarded_to === team;
  const inControl = !isAwarded(round) && firstBuzzTeam(game) === team;
  const alignRight = team === 1;
  return (
    <div className={`flex items-center gap-4 ${alignRight ? "flex-row-reverse text-right" : ""}`}>
      <div className={`h-14 w-2 shrink-0 rounded ${colors.solid}`} aria-hidden />
      <div className="min-w-0">
        <div className="truncate text-sm uppercase tracking-wide text-secondary-900">
          {getTeamDisplayName(game.teams[team].name, team, t)}
          {banked && <span className={`ml-2 font-semibold ${colors.text}`}>· {t("banked")}</span>}
          {inControl && <span className="ml-2 font-semibold text-warning-700">· {t("buzzed first")}</span>}
        </div>
        <div id={`adminTeam${team}Points`} className="text-4xl font-bold tabular-nums text-foreground">
          {t("number", { count: game.teams[team].points })}
        </div>
      </div>
      <StrikePips count={game.teams[team].mistakes} team={team} />
    </div>
  );
}

interface ScoreBarProps {
  game: Game;
  scoring: ScoringApi;
  children?: React.ReactNode;
}

export default function ScoreBar({ game, scoring, children }: ScoreBarProps) {
  const { t } = useTranslation();
  const round = game.rounds[game.round];
  const multiplier = sanitizeMultiplier(round?.multiply);
  const awardedTo = round?.awarded_to;

  const changeMultiplier = (value: unknown) => {
    const next = setMultiplier(game, value);
    scoring.commit(next, t("Multiplier set to x{{count}}", { count: sanitizeMultiplier(value) }));
  };

  return (
    <div className="sticky top-0 z-30 border-b-2 border-secondary-500 bg-background/95 shadow-md backdrop-blur">
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-6 px-5 py-3">
        <TeamSummary game={game} team={0} />
        <div className="text-center">
          <div id="pointsText" className="text-sm uppercase tracking-wide text-secondary-900">
            {t("round")} {t("number", { count: game.round + 1 })} / {t("number", { count: game.rounds.length })} ·{" "}
            {awardedTo === 0 || awardedTo === 1
              ? t("Banked by {{team}}", { team: getTeamDisplayName(game.teams[awardedTo].name, awardedTo, t) })
              : t("Pot")}
          </div>
          <div id="pointsNumberText" className="text-5xl font-extrabold tabular-nums text-foreground">
            {t("number", { count: roundPot(round) })}
          </div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span id="multiplierText" className="sr-only">
              {t("multiplier")}
            </span>
            <div className="inline-flex overflow-hidden rounded-lg border-2 border-secondary-700" role="group">
              {MULTIPLIER_PRESETS.map((m) => (
                <button
                  key={m}
                  type="button"
                  id={`multiplierPreset${m}Button`}
                  aria-pressed={multiplier === m}
                  disabled={isAwarded(round)}
                  className={`px-3 py-1 text-sm font-semibold text-foreground disabled:opacity-50 ${
                    multiplier === m ? "bg-warning-500 text-black" : "bg-secondary-300 hover:bg-secondary-500"
                  }`}
                  onClick={() => changeMultiplier(m)}
                >
                  ×{m}
                </button>
              ))}
            </div>
            <button
              type="button"
              id="undoButton"
              disabled={!scoring.canUndo}
              title={scoring.undoLabel ? t("Undo: {{action}}", { action: scoring.undoLabel }) : t("Nothing to undo")}
              aria-keyshortcuts="Control+Z"
              className="ml-2 rounded-lg border-2 border-secondary-700 bg-secondary-300 px-3 py-1 text-sm font-semibold text-foreground hover:bg-secondary-500 disabled:opacity-40"
              onClick={scoring.undo}
            >
              ↶ {t("Undo")}
            </button>
            <label className="order-first mr-2 flex items-center gap-1 text-sm text-secondary-900">
              ×
              <input
                type="number"
                id="multiplierInput"
                min="1"
                aria-label={t("multiplier")}
                disabled={isAwarded(round)}
                className="w-14 rounded border-2 border-secondary-700 bg-secondary-200 px-1 text-foreground disabled:opacity-50"
                value={multiplier}
                onChange={(e) => changeMultiplier(e.target.value)}
              />
            </label>
          </div>
        </div>
        <TeamSummary game={game} team={1} />
      </div>
      {children}
    </div>
  );
}
