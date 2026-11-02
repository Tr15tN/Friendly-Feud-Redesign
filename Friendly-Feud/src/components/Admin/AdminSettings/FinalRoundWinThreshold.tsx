import { DEFAULT_FINAL_ROUND_WIN_THRESHOLD, finalRoundWinThreshold } from "@/lib/scoring";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { Field, inputClass } from "../../ui/form";

interface FinalRoundWinThresholdProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
}

/** Fast money total needed for the win celebration (default 200). */
export default function FinalRoundWinThreshold({ game, setGame, send }: FinalRoundWinThresholdProps) {
  const { t } = useTranslation();

  return (
    <Field
      label={t("Fast money target")}
      htmlFor="finalRoundWinThresholdInput"
      hint={t("Fast money total needed to show the win celebration")}
    >
      <input
        id="finalRoundWinThresholdInput"
        type="number"
        min="1"
        className={`${inputClass} tabular-nums`}
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
    </Field>
  );
}
