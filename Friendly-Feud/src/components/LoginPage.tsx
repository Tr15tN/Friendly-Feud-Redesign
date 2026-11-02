import LanguageSwitcher from "@/components/LanguageSwitcher";
import TitleLogo from "@/components/TitleLogo";
import { buttonClass } from "@/components/ui/button-class";
import { inputClass } from "@/components/ui/form";
import { ERROR_CODES } from "@/i18n/errorCodes";
import { defaultLanguage, normalizeLanguage } from "@/i18n/languages";
import { CircleHelp } from "lucide-react";
import Link from "next/link";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface LoginPageProps {
  hostRoom: () => void;
  roomCode: string;
  setRoomCode: (code: string) => void;
  playerName: string;
  setPlayerName: (name: string) => void;
  joinRoom: () => void;
}

export default function LoginPage({
  hostRoom,
  roomCode,
  setRoomCode,
  playerName,
  setPlayerName,
  joinRoom,
}: LoginPageProps) {
  const { t, i18n } = useTranslation();
  const language = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language ?? defaultLanguage);

  const isValidRoomCode = (code: string) => code.length === 4;
  const isValidPlayerName = (name: string) => name.length > 0 && name.length <= 12;

  const handlePlay = () => {
    if (!isValidPlayerName(playerName)) {
      toast.error(t(ERROR_CODES.MISSING_INPUT, { message: t("name") }));
      return;
    }

    if (!isValidRoomCode(roomCode)) {
      toast.error(t("room code is not correct length, should be 4 characters"));
      return;
    }

    joinRoom();
  };

  return (
    <div className="flex w-full flex-1 flex-col bg-pro-bg px-4 py-4 text-pro-text">
      <div className="mx-auto flex w-full max-w-md items-center justify-between gap-3">
        <div className="w-40">
          <LanguageSwitcher variant="bare" />
        </div>
        <Link
          href={`/docs/${language}/help`}
          id="helpDocsButton"
          target="_blank"
          className={buttonClass("ghost", "min-h-10 px-3")}
        >
          <CircleHelp size={16} aria-hidden />
          {t("Help")}
        </Link>
      </div>

      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-6">
        <div className="mx-auto w-full max-w-[320px]">
          <TitleLogo insert="" />
        </div>

        <form
          className="space-y-4 rounded-[14px] border border-pro-line bg-pro-panel p-5"
          onSubmit={(e) => {
            e.preventDefault();
            handlePlay();
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="roomCodeInput" className="block text-sm font-medium capitalize">
              {t("room code")}
            </label>
            <input
              className={`${inputClass} min-h-14 text-center text-2xl font-bold uppercase tracking-[0.4em] placeholder:text-sm placeholder:font-normal placeholder:normal-case placeholder:tracking-normal`}
              id="roomCodeInput"
              autoComplete="off"
              autoCapitalize="characters"
              onChange={(e) => setRoomCode(e.target.value)}
              maxLength={4}
              value={roomCode}
              placeholder={t("4 letter room code")}
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between">
              <label htmlFor="playerNameInput" className="block text-sm font-medium capitalize">
                {t("name")}
              </label>
              <span className="text-xs tabular-nums text-pro-mute">{12 - playerName.length}</span>
            </div>
            <input
              className={`${inputClass} min-h-12 text-lg uppercase`}
              id="playerNameInput"
              autoComplete="nickname"
              maxLength={12}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder={t("enter your name")}
            />
          </div>

          <button
            type="submit"
            id="joinRoomButton"
            className={buttonClass("primary", "min-h-14 w-full text-lg uppercase")}
          >
            {t("play")}
          </button>
        </form>

        <div className="space-y-2 text-center">
          <button
            id="hostRoomButton"
            className={buttonClass("secondary", "min-h-12 w-full text-base uppercase")}
            onClick={() => hostRoom()}
          >
            {t("host")}
          </button>
          <p className="text-sm text-pro-mute">{t("Run your own game. You get a code to share with players.")}</p>
        </div>
      </div>
    </div>
  );
}
