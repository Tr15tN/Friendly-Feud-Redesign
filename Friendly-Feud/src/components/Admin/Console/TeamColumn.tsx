import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { Button } from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { teamColumnState } from "@/lib/host/console";
import { Game } from "@/types/game";
import { Check, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import StrikePips from "./StrikePips";
import { teamUi } from "./team-ui";
import { useTeamActions } from "./useTeamActions";

interface TeamColumnProps {
  game: Game;
  team: number;
  scoring: ScoringApi;
}

/** One team's score, strikes and the two actions that affect it: strike and bank the pot. */
export default function TeamColumn({ game, team, scoring }: TeamColumnProps) {
  const { t } = useTranslation();
  const state = teamColumnState(game, team);
  const ui = teamUi(team);
  const actions = useTeamActions(game, scoring);
  const name = actions.name(team);

  return (
    <aside aria-label={name} className={`flex flex-col gap-3 rounded-[14px] border bg-pro-panel p-4 ${ui.border}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`size-2.5 shrink-0 rounded-full ${ui.dot}`} aria-hidden />
        <h2 className={`min-w-0 truncate text-sm font-semibold uppercase tracking-wider ${ui.text}`}>{name}</h2>
        {state.banked && <Chip tone="ok">{t("banked")}</Chip>}
        {state.inControl && <Chip tone="gold">{t("buzzed first")}</Chip>}
      </div>
      <p id={`adminTeam${team}Points`} className="text-5xl font-bold tabular-nums tracking-tight">
        {t("number", { count: state.points })}
      </p>
      <StrikePips team={team} count={state.strikes} max={state.maxStrikes} />
      <Button id={`team${team}MistakeButton`} variant={ui.outline} onClick={() => actions.strike(team)}>
        <X size={16} strokeWidth={3} aria-hidden />
        {t("Strike")}
      </Button>
      <Button
        id={`team${team}GivePointsButton`}
        variant={ui.solid}
        disabled={!state.canBank && !state.banked}
        aria-pressed={state.banked}
        onClick={() => actions.bank(team)}
      >
        {state.banked ? (
          <>
            <Check size={16} strokeWidth={3} aria-hidden />
            {t("Banked {{points}}", { points: state.bankedPoints })}
          </>
        ) : (
          t("Bank {{points}}", { points: state.pot })
        )}
      </Button>
    </aside>
  );
}
