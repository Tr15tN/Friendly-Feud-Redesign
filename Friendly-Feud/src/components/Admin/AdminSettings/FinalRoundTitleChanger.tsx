import { Field, inputClass } from "@/components/ui/form";
import { debounce } from "@/lib/utils";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface FinalRoundTitleChangerProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
}

export default function FinalRoundTitleChanger({ game, setGame, send }: FinalRoundTitleChangerProps) {
  const { t } = useTranslation();

  const finalRoundTitle = game.settings.final_round_title ?? t("Final Round");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setGame((prevGame) => {
      const finalRoundTitle = e.target.value;

      if (prevGame === null) {
        return prevGame;
      }

      const updatedGame = {
        ...prevGame,
        settings: {
          ...prevGame.settings,
          final_round_title: finalRoundTitle,
        },
      };

      send({ action: "data", data: updatedGame });

      return updatedGame;
    });
  };

  return (
    <Field label={t("Final Round Title")} htmlFor="finalRoundTitleChangerInput">
      <input
        id="finalRoundTitleChangerInput"
        className={inputClass}
        onChange={debounce(handleChange)}
        defaultValue={finalRoundTitle}
      />
    </Field>
  );
}
