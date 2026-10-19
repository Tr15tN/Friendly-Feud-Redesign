import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { gotoFinal, gotoRound, gotoTitle } from "@/lib/host/console";
import { hasProgress } from "@/lib/scoring";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";

/** Round and phase transitions, all routed through `scoring.commit` so they can be undone. */
export function useFlowActions(game: Game, scoring: ScoringApi) {
  const { t } = useTranslation();
  const inProgress = hasProgress(game);

  return {
    inProgress,
    /** Restarting at round 1 asks for confirmation unless we are already on round 1 of a live game. */
    startNeedsConfirm: inProgress && !(game.round === 0 && !game.title && !game.is_final_round),
    goToRound: (roundIndex: number) => scoring.commit(gotoRound(game, roundIndex), `${t("round")} ${roundIndex + 1}`),
    startRoundOne: () => scoring.commit(gotoRound(game, 0), t("Start Round 1")),
    nextRound: () => scoring.commit(gotoRound(game, game.round + 1), t("Next Round")),
    showTitle: () => scoring.commit(gotoTitle(game), t("Title Card")),
    goFinal: () =>
      scoring.commit(gotoFinal(game), t("Final Round"), [{ action: "set_timer", data: game.final_round_timers[0] }]),
  };
}

export type FlowActions = ReturnType<typeof useFlowActions>;
