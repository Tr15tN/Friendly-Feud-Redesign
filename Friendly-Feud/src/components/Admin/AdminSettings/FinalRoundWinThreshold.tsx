import { DEFAULT_FINAL_ROUND_WIN_THRESHOLD, finalRoundWinThreshold } from "@/lib/scoring";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import ToolTipIcon from "../../ui/tooltip";

interface FinalRoundWinThresholdProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
}

/** Fast money total needed for the win celebration (default 200). */
export default function FinalRoundWinThreshold({ game, setGame, send }: FinalRoundWinThresholdProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-row items-center space-x-2">
      <ToolTipIcon message={t("Fast money total needed to show the win celebration")} />
      <label htmlFor="finalRoundWinThresholdInput" className="text-xl text-foreground">
        {t("Fast money target")}:
      </label>
      <input
        id="finalRoundWinThresholdInput"
        type="number"
        min="1"
        className="w-24 rounded border-4 bg-secondary-500 p-1 text-xl tabular-nums text-foreground"
        value={finalRoundWinThreshold(game)}
        onChange={(e) => {
          const parsed = parseInt(e.target.value, 10);
          const value = Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_FINAL_ROUND_WIN_THRESHOLD;
          setGame((prevGame) => {
            if (prevGame === null) return prevGame;
            const updatedGame = {
              ...prevGame,
              settings: { ...prevGame.settings, final_round_win_threshold: value },
            };
            send({ action: "data", data: updatedGame });
            return updatedGame;
          });
        }}
      />
    </div>
  );
}
