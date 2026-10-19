import CreateNewGameButton from "@/components/Admin/CreateNewGameButton";
import GameLoader from "@/components/Admin/GameLoader";
import ThemeSwitcher from "@/components/Admin/ThemeSwitcher";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { normalizeLanguage } from "@/i18n/languages";
import { Game, WSEvent } from "@/src/types";
import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import HelpButton from "../HelpButton";

interface RoomSettingsProps {
  room: string;
  game: Game;
  gameSelector: string[];
  send: (data: WSEvent) => void;
  setGame: Dispatch<SetStateAction<Game | null>>;
  setCsvFileUpload: Dispatch<SetStateAction<File | null>>;
  setCsvFileUploadText: Dispatch<SetStateAction<string>>;
  quitGame: (host: boolean) => void;
  /** full = classic layout; header = one compact row (used during play); setup = language/theme/game loader only. */
  variant?: "full" | "header" | "setup";
}

export default function RoomSettings({
  room,
  game,
  gameSelector,
  send,
  setGame,
  setCsvFileUpload,
  setCsvFileUploadText,
  quitGame,
  variant = "full",
}: RoomSettingsProps) {
  const { i18n, t } = useTranslation();

  const setup = (
    <div className="m-5 flex flex-col items-center justify-center gap-5 md:flex-row md:justify-evenly">
      <div className="flex flex-col items-center gap-5 sm:flex-row">
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

  if (variant === "setup") return setup;

  if (variant === "header") {
    return (
      <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-3 text-foreground">
        <p className="text-lg">
          {t("room code")}:{" "}
          <span id="roomCodeText" className="text-3xl font-semibold uppercase tracking-widest">
            {room}
          </span>
        </p>
        <div className="flex items-center gap-3">
          <Link
            href="/game"
            target="_blank"
            id="openGameWindowButton"
            className="rounded-lg bg-success-300 px-4 py-2 text-foreground hover:shadow-md"
          >
            {t("Open Game Window")}
          </Link>
          <HelpButton doc="/guide" />
          <button
            id="quitButton"
            className="rounded-lg bg-failure-200 px-4 py-2 text-foreground hover:shadow-md"
            onClick={() => quitGame(true)}
          >
            {t("Quit")}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full">
      {/* ROOM CODE TEXT */}
      <p id="roomCodeText" className="p-4 text-center text-8xl font-semibold uppercase text-foreground">
        {room}
      </p>
      <hr />
      <div className="flex flex-row items-center justify-evenly p-5">
        {/* ADMIN BUTTONS */}
        <Link href="/game" target="_blank" id="openGameWindowButton">
          <button className="text-2xl">
            <div className="flex justify-center rounded bg-success-300 p-5 text-foreground hover:shadow-md">
              {t("Open Game Window")}
            </div>
          </button>
        </Link>
        <CreateNewGameButton />
        <HelpButton doc="/guide" />
        <button id="quitButton" className="text-2xl" onClick={() => quitGame(true)}>
          <div className="flex w-32 justify-center rounded bg-failure-200 p-2 text-foreground hover:shadow-md">
            {t("Quit")}
          </div>
        </button>
      </div>
      {setup}
    </div>
  );
}
