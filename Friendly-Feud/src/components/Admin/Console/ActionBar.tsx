import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { Button } from "@/components/ui/Button";
import { teamColumnState } from "@/lib/host/console";
import { Game, WSEvent } from "@/types/game";
import { ArrowRight, X } from "lucide-react";
import { useTranslation } from "react-i18next";
import RoundToolsMenu from "./RoundToolsMenu";
import { teamUi } from "./team-ui";
import { FlowActions } from "./useFlowActions";
import { useTeamActions } from "./useTeamActions";

interface ActionBarProps {
  game: Game;
  scoring: ScoringApi;
  flow: FlowActions;
  send: (data: WSEvent) => void;
}

/** Fixed bottom bar for narrow screens: every scoring action within thumb reach. */
export default function ActionBar({ game, scoring, flow, send }: ActionBarProps) {
  const { t } = useTranslation();
  const actions = useTeamActions(game, scoring);

  return (
    <div className="fixed inset-x-0 bottom-0 z-30 border-t border-pro-line bg-pro-bg/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
      <div className="mx-auto grid max-w-3xl grid-cols-3 gap-2">
        {[0, 1].map((team) => (
          <Button
            key={`strike-${team}`}
            id={`team${team}MistakeButton`}
            variant={teamUi(team).outline}
            aria-label={`${t("Strike")}: ${actions.name(team)}`}
            className="min-w-0"
            onClick={() => actions.strike(team)}
          >
            <X size={16} strokeWidth={3} aria-hidden />
            <span className="truncate">{actions.name(team)}</span>
          </Button>
        ))}
        <RoundToolsMenu game={game} scoring={scoring} send={send} direction="up" buttonClassName="w-full" />
        {[0, 1].map((team) => {
          const state = teamColumnState(game, team);
          return (
            <Button
              key={`bank-${team}`}
              id={`team${team}GivePointsButton`}
              variant={teamUi(team).solid}
              disabled={!state.canBank && !state.banked}
              aria-pressed={state.banked}
              className="min-w-0 flex-col gap-0 py-1 leading-tight"
              onClick={() => actions.bank(team)}
            >
              <span className="max-w-full truncate text-[11px] font-medium opacity-80">{actions.name(team)}</span>
              <span>
                {state.banked
                  ? t("Banked {{points}}", { points: state.bankedPoints })
                  : t("Bank {{points}}", { points: state.pot })}
              </span>
            </Button>
          );
        })}
        <Button id="nextRoundButton" variant="primary" onClick={flow.nextRound}>
          {t("Next Round")}
          <ArrowRight size={16} aria-hidden />
        </Button>
      </div>
    </div>
  );
}
