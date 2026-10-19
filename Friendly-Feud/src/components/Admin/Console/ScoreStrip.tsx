import Chip from "@/components/ui/Chip";
import { teamColumnState } from "@/lib/host/console";
import { getTeamDisplayName } from "@/lib/utils";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";
import StrikePips from "./StrikePips";
import { teamUi } from "./team-ui";

/** Compact two-team score readout for narrow screens (replaces the team columns). */
export default function ScoreStrip({ game }: { game: Game }) {
  const { t } = useTranslation();
  return (
    <div className="grid grid-cols-2 gap-2">
      {[0, 1].map((team) => {
        const state = teamColumnState(game, team);
        const ui = teamUi(team);
        const align = team === 1 ? "end" : "start";
        return (
          <div
            key={team}
            className={`flex min-w-0 flex-col gap-1 rounded-[12px] border bg-pro-panel p-3 ${ui.border} ${
              team === 1 ? "items-end text-right" : ""
            }`}
          >
            <div className="flex max-w-full items-center gap-2">
              <span className={`size-2 shrink-0 rounded-full ${ui.dot}`} aria-hidden />
              <span className={`truncate text-xs font-semibold uppercase tracking-wider ${ui.text}`}>
                {getTeamDisplayName(state.name, team, t)}
              </span>
            </div>
            <p id={`adminTeam${team}Points`} className="text-3xl font-bold tabular-nums">
              {t("number", { count: state.points })}
            </p>
            <StrikePips team={team} count={state.strikes} max={state.maxStrikes} align={align} />
            <div className="flex flex-wrap gap-1">
              {state.banked && <Chip tone="ok">{t("banked")}</Chip>}
              {state.inControl && <Chip tone="gold">{t("buzzed first")}</Chip>}
            </div>
          </div>
        );
      })}
    </div>
  );
}
