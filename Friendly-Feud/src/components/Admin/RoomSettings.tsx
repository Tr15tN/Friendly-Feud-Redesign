import GameLoader from "@/components/Admin/GameLoader";
import ThemeSwitcher from "@/components/Admin/ThemeSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { normalizeLanguage } from "@/i18n/languages";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface RoomSettingsProps {
  game: Game;
  gameSelector: string[];
  send: (data: WSEvent) => void;
  setGame: Dispatch<SetStateAction<Game | null>>;
  setCsvFileUpload: Dispatch<SetStateAction<File | null>>;
  setCsvFileUploadText: Dispatch<SetStateAction<string>>;
}

/** Language, board theme and the game loader. */
export default function RoomSettings({
  game,
  gameSelector,
  send,
  setGame,
  setCsvFileUpload,
  setCsvFileUploadText,
}: RoomSettingsProps) {
  const { i18n } = useTranslation();

  return (
    <div className="flex flex-col items-start gap-5 text-foreground md:flex-row md:justify-between">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <LanguageSwitcher
          onChange={(e) => {
            const language = normalizeLanguage(e.target.value);
            i18n.changeLanguage(language);
            send({ action: "change_lang", data: language });
          }}
        />
        <ThemeSwitcher game={game} setGame={setGame} send={send} />
      </div>
      <GameLoader
        gameSelector={gameSelector}
        send={send}
        setCsvFileUpload={setCsvFileUpload}
        setCsvFileUploadText={setCsvFileUploadText}
      />
    </div>
  );
}
