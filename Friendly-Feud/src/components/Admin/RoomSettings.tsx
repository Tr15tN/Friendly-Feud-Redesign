import CreateNewGameButton from "@/components/Admin/CreateNewGameButton";
import GameLoader from "@/components/Admin/GameLoader";
import TeamColorPicker from "@/components/Admin/TeamColorPicker";
import ThemePicker from "@/components/Admin/ThemePicker";
import ThemeSwitcher from "@/components/Admin/ThemeSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { Section } from "@/components/ui/form";
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
  /** Highlight the game picker: there is no game loaded yet. */
  needsGame?: boolean;
}

/** Game picker (built-in sets, upload, editor) plus language and board theme. */
export default function RoomSettings({
  game,
  gameSelector,
  send,
  setGame,
  setCsvFileUpload,
  setCsvFileUploadText,
  needsGame = false,
}: RoomSettingsProps) {
  const { i18n, t } = useTranslation();

  return (
    <>
      <Section
        title={t("Choose a game")}
        description={needsGame ? t("Pick a question set to begin, or bring your own.") : undefined}
        emphasis={needsGame}
      >
        <GameLoader
          gameSelector={gameSelector}
          send={send}
          setCsvFileUpload={setCsvFileUpload}
          setCsvFileUploadText={setCsvFileUploadText}
        />
        <CreateNewGameButton />
      </Section>
      <Section title={t("Language & look")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <LanguageSwitcher
            variant="pro"
            onChange={(e) => {
              const language = normalizeLanguage(e.target.value);
              i18n.changeLanguage(language);
              send({ action: "change_lang", data: language });
            }}
          />
          <ThemeSwitcher variant="pro" game={game} setGame={setGame} send={send} />
        </div>
        <ThemePicker />
        <TeamColorPicker game={game} setGame={setGame} send={send} />
      </Section>
    </>
  );
}
