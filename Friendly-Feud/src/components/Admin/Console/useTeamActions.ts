import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { addStrike, awardRound, roundPot } from "@/lib/scoring";
import { getTeamDisplayName } from "@/lib/utils";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";

/** Strike and bank handlers shared by the desktop team columns and the touch action bar. */
export function useTeamActions(game: Game, scoring: ScoringApi) {
  const { t } = useTranslation();
  const name = (team: number) => getTeamDisplayName(game.teams[team].name, team, t);

  return {
    name,
    strike: (team: number) => {
      const next = addStrike(game, team);
      scoring.commit(next, t("Strike for {{team}}", { team: name(team) }), [
        { action: "mistake", data: next.teams[team].mistakes },
      ]);
    },
    bank: (team: number) => {
      const pot = roundPot(game.rounds[game.round]);
      scoring.commit(awardRound(game, team), t("Awarded {{points}} to {{team}}", { points: pot, team: name(team) }));
    },
  };
}
