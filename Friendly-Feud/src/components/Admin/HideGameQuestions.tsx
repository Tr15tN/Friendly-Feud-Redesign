import { Button } from "@/components/ui/Button";
import { Game, WSEvent } from "@/types/game";
import { Eye, EyeOff } from "lucide-react";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface HideGameQuestionsProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
}

export default function HideGameQuestions({ game, setGame, send }: HideGameQuestionsProps) {
  const { t } = useTranslation();
  const hidden = game.settings.hide_questions;

  return (
    <Button
      id="hideQuestionsInput"
      aria-pressed={hidden}
      disabled={game.is_final_round}
      className="w-full justify-start"
      onClick={() => {
        setGame((prevGame) => {
          if (prevGame === null) {
            return prevGame;
          }

          const hideGame = !game.settings.hide_questions;

          const updatedGame = {
            ...prevGame,
            settings: {
              ...prevGame.settings,
              hide_questions: hideGame,
            },
          };

          send({ action: "data", data: updatedGame });

          return updatedGame;
        });
      }}
    >
      {hidden ? <Eye size={16} aria-hidden /> : <EyeOff size={16} aria-hidden />}
      {hidden ? t("Show questions") : t("Hide questions")}
    </Button>
  );
}
