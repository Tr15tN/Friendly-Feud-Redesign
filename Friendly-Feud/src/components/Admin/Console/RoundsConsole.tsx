import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { Button } from "@/components/ui/Button";
import { useMediaQuery } from "@/lib/hooks/useMediaQuery";
import { Game, WSEvent } from "@/types/game";
import { ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import ActionBar from "./ActionBar";
import AnswerBoard from "./AnswerBoard";
import RoundHeader from "./RoundHeader";
import ScoreStrip from "./ScoreStrip";
import StealHint from "./StealHint";
import TeamColumn from "./TeamColumn";
import { FlowActions } from "./useFlowActions";

interface RoundsConsoleProps {
  game: Game;
  scoring: ScoringApi;
  flow: FlowActions;
  send: (data: WSEvent) => void;
}

/**
 * Desktop (>= 1024px): team columns flank the answers, mirroring the TV board.
 * Touch: score strip on top and a fixed bottom action bar.
 * Only one layout is mounted at a time so element ids stay unique.
 */
export default function RoundsConsole({ game, scoring, flow, send }: RoundsConsoleProps) {
  const { t } = useTranslation();
  const desktop = useMediaQuery("(min-width: 1024px)");
  if (!game.rounds[game.round]) return null;

  if (desktop) {
    return (
      <div className="mx-auto grid max-w-[1400px] grid-cols-[230px_minmax(0,1fr)_230px] items-start gap-4 px-5 py-4">
        <TeamColumn game={game} team={0} scoring={scoring} />
        <div className="flex min-w-0 flex-col gap-3">
          <StealHint game={game} />
          <RoundHeader game={game} scoring={scoring} flow={flow} send={send} showTools showUndo />
          <AnswerBoard game={game} scoring={scoring} />
          <div className="flex justify-end">
            <Button
              id="nextRoundButton"
              variant="primary"
              title={t("Clear strikes and move to the next round")}
              onClick={flow.nextRound}
            >
              {t("Next Round")}
              <ArrowRight size={16} aria-hidden />
            </Button>
          </div>
        </div>
        <TeamColumn game={game} team={1} scoring={scoring} />
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-3 px-3 pb-44 pt-3">
      <ScoreStrip game={game} />
      <StealHint game={game} />
      <RoundHeader game={game} scoring={scoring} flow={flow} send={send} showTools={false} showUndo={false} />
      <AnswerBoard game={game} scoring={scoring} />
      <ActionBar game={game} scoring={scoring} flow={flow} send={send} />
    </div>
  );
}
