import {
  addStrike,
  adjustTeamPoints,
  awardRound,
  isAwarded,
  MAX_STRIKES,
  removeStrike,
  resetStrikes,
  roundPot,
  stealTeam,
} from "@/lib/scoring";
import { getTeamDisplayName } from "@/src/lib/utils";
import { teamColors } from "@/src/lib/utils/team-colors";
import { Game, WSEvent } from "@/src/types/game";
import Image from "next/image";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ScoringApi } from "./useScoring";

interface TeamControlsProps {
  game: Game;
  scoring: ScoringApi;
  send: (data: WSEvent) => void;
}

const PANEL = "space-y-3 rounded-xl border-2 border-secondary-500 p-4";
const PANEL_TITLE = "text-sm font-semibold uppercase tracking-wide text-secondary-900";

/** Strikes + "bank the pot" controls for both teams. */
export default function TeamControls({ game, scoring, send }: TeamControlsProps) {
  const { t } = useTranslation();
  const round = game.rounds[game.round];
  const pot = roundPot(round);
  const awarded = isAwarded(round);
  const steal = stealTeam(game);
  const name = (team: number) => getTeamDisplayName(game.teams[team].name, team, t);
  const [adjustAmount, setAdjustAmount] = useState("10");
  const adjust = (team: number, sign: 1 | -1) => {
    const amount = Math.abs(parseInt(adjustAmount, 10)) * sign;
    if (!Number.isFinite(amount) || amount === 0) return;
    scoring.commit(
      adjustTeamPoints(game, team, amount),
      t("Adjusted {{team}} by {{amount}}", { team: name(team), amount: amount > 0 ? `+${amount}` : `${amount}` })
    );
  };

  return (
    <aside className="space-y-4">
      <div className={PANEL}>
        <h3 className={PANEL_TITLE}>{t("Strikes")}</h3>
        <div className="grid grid-cols-2 gap-3">
          {[0, 1].map((team) => {
            const colors = teamColors(team);
            const maxed = game.teams[team].mistakes >= MAX_STRIKES;
            return (
              <button
                key={team}
                type="button"
                id={`team${team}MistakeButton`}
                className={`rounded-lg border-2 py-4 text-lg font-semibold ${colors.border} ${colors.soft} hover:brightness-95`}
                onClick={() => {
                  const next = addStrike(game, team);
                  scoring.commit(next, t("Strike for {{team}}", { team: name(team) }), [
                    { action: "mistake", data: next.teams[team].mistakes },
                  ]);
                }}
              >
                ✕ {name(team)}
                <span className="block text-xs font-normal">
                  {t("Strikes {{count}} of {{max}}", { count: game.teams[team].mistakes, max: MAX_STRIKES })}
                  {maxed ? " · max" : ""}
                </span>
              </button>
            );
          })}
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[0, 1].map((team) => (
            <button
              key={team}
              type="button"
              id={`team${team}RemoveStrikeButton`}
              disabled={game.teams[team].mistakes === 0}
              className="rounded border-2 border-secondary-700 bg-secondary-300 px-2 py-1 text-foreground hover:bg-secondary-500 disabled:opacity-40"
              onClick={() =>
                scoring.commit(removeStrike(game, team), t("Removed a strike from {{team}}", { team: name(team) }))
              }
            >
              − {t("strike")} ({name(team)})
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-sm">
          <button
            type="button"
            id="resetMistakesButton"
            className="rounded border-2 border-secondary-700 bg-secondary-300 px-3 py-1 text-foreground hover:bg-secondary-500"
            onClick={() => scoring.commit(resetStrikes(game), t("Reset Mistakes"))}
          >
            {t("Reset Mistakes")}
          </button>
          <button
            type="button"
            id="showMistakeButton"
            title={t("Shows the big X on screen without adding a strike")}
            className="flex items-center gap-2 rounded border-2 border-secondary-700 bg-secondary-300 px-3 py-1 text-foreground hover:bg-secondary-500"
            onClick={() => send({ action: "show_mistake" })}
          >
            <Image width={20} height={20} src="/x.svg" alt="" />
            {t("Buzz-in X (no strike)")}
          </button>
        </div>
      </div>

      {steal !== null && (
        <div
          id="stealHint"
          className="rounded-xl border-2 border-warning-500 bg-warning-200 p-4 text-sm text-black"
          role="status"
        >
          <b>{t("{{team}} has 3 strikes.", { team: name(steal === 0 ? 1 : 0) })}</b>{" "}
          {t("{{team}} can steal: award the pot to whoever wins it.", { team: name(steal) })}
        </div>
      )}

      <div className={PANEL}>
        <h3 className={PANEL_TITLE}>
          {awarded ? t("Pot banked") : t("Bank the pot")} ({t("number", { count: pot })})
        </h3>
        {[0, 1].map((team) => {
          const colors = teamColors(team);
          const isWinner = round?.awarded_to === team;
          return (
            <button
              key={team}
              type="button"
              id={`team${team}GivePointsButton`}
              disabled={awarded}
              aria-pressed={isWinner}
              className={`w-full rounded-lg py-4 text-xl font-bold ${
                isWinner
                  ? `${colors.solid} ring-4 ${colors.ring}`
                  : awarded
                    ? "bg-secondary-300 text-secondary-900 opacity-60"
                    : `${colors.solid} ${colors.solidHover}`
              }`}
              onClick={() => {
                const next = awardRound(game, team);
                scoring.commit(next, t("Awarded {{points}} to {{team}}", { points: pot, team: name(team) }));
              }}
            >
              {isWinner
                ? `✓ ${t("{{team}} banked {{points}}", { team: name(team), points: round.awarded_points ?? pot })}`
                : t("Award {{points}} to {{team}}", { points: pot, team: name(team) })}
            </button>
          );
        })}
        <p className="text-xs text-secondary-900">
          {awarded
            ? t("Next Round starts a fresh pot.")
            : t("Awarding locks the pot; leftover reveals won't change it.")}
        </p>
      </div>

      <details className="rounded-xl border-2 border-secondary-500 p-4 text-sm text-foreground">
        <summary className="cursor-pointer font-semibold">{t("Manual adjust")}</summary>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            id="manualAdjustInput"
            type="number"
            min="1"
            aria-label={t("points")}
            value={adjustAmount}
            onChange={(e) => setAdjustAmount(e.target.value)}
            className="w-20 rounded border-2 border-secondary-700 bg-secondary-200 px-2 py-1 text-foreground"
          />
          {[0, 1].map((team) => (
            <span key={team} className="inline-flex overflow-hidden rounded border-2 border-secondary-700">
              <button
                type="button"
                id={`team${team}AdjustMinusButton`}
                className="bg-secondary-300 px-2 py-1 hover:bg-secondary-500"
                onClick={() => adjust(team, -1)}
              >
                −
              </button>
              <span className={`px-2 py-1 ${teamColors(team).soft}`}>{name(team)}</span>
              <button
                type="button"
                id={`team${team}AdjustPlusButton`}
                className="bg-secondary-300 px-2 py-1 hover:bg-secondary-500"
                onClick={() => adjust(team, 1)}
              >
                +
              </button>
            </span>
          ))}
        </div>
      </details>
    </aside>
  );
}
