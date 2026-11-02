import { useDemo } from "@/components/Demo/DemoContext";
import { Button, buttonClass } from "@/components/ui/Button";
import Menu from "@/components/ui/Menu";
import { normalizeLanguage } from "@/i18n/languages";
import { Game, WSEvent } from "@/types/game";
import { BookOpen, CircleHelp, FlaskConical, Keyboard, LogOut, Monitor, Play, ScrollText, Settings, Users } from "lucide-react";
import Link from "next/link";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import FlowMenu from "./FlowMenu";
import PhaseStepper from "./PhaseStepper";
import { FlowActions } from "./useFlowActions";

interface TopBarProps {
  game: Game;
  room: string;
  flow: FlowActions;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
  quitGame: (host: boolean) => void;
  /** Settings are shown inline (lobby / no game), so the settings drawer button is hidden. */
  settingsInline: boolean;
  onOpenPlayers: () => void;
  onOpenSettings: () => void;
  onStartTour: () => void;
}

export default function TopBar({
  game,
  room,
  flow,
  setGame,
  send,
  quitGame,
  settingsInline,
  onOpenPlayers,
  onOpenSettings,
  onStartTour,
}: TopBarProps) {
  const { t, i18n } = useTranslation();
  const demo = useDemo();
  const docsLanguage = normalizeLanguage(i18n.resolvedLanguage ?? i18n.language);
  const hasGame = game.rounds != null;
  const buzzCount = game.buzzed?.length ?? 0;

  let currentScreen = t("title");
  if (!game.title) {
    if (!game.is_final_round) currentScreen = `${t("round")} ${t("number", { count: game.round + 1 })}`;
    else if (!game.is_final_second) currentScreen = `${t("Final Round")} ${t("number", { count: 1 })}`;
    else currentScreen = `${t("Final Round")} ${t("number", { count: 2 })}`;
  }

  return (
    <header className="sticky top-0 z-40 border-b border-pro-line bg-pro-bg/95 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center gap-3 px-3 py-2 sm:px-5">
        <span
          id="roomCodeText"
          title={t("room code")}
          className="rounded-[10px] border border-pro-line bg-pro-panel px-3 py-1 text-lg font-extrabold uppercase tracking-[0.2em]"
        >
          {room}
        </span>
        {hasGame && <PhaseStepper game={game} flow={flow} />}
        {hasGame && (
          <p id="currentScreenText" className="sr-only">
            {t("Current Screen")}: {currentScreen}
          </p>
        )}
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {hasGame && <FlowMenu game={game} flow={flow} setGame={setGame} send={send} />}
          <Button
            id="playersDrawerButton"
            aria-label={t("Players & buzzers")}
            className="relative"
            onClick={onOpenPlayers}
          >
            <Users size={16} aria-hidden />
            <span className="hidden md:inline">{t("players")}</span>
            {buzzCount > 0 && (
              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-pro-gold text-[11px] font-bold text-black">
                {buzzCount}
              </span>
            )}
          </Button>
          {!settingsInline && (
            <Button id="settingsDrawerButton" aria-label={t("Settings")} onClick={onOpenSettings}>
              <Settings size={16} aria-hidden />
              <span className="hidden md:inline">{t("Settings")}</span>
            </Button>
          )}
          {demo ? (
            <Button id="openGameWindowButton" onClick={demo.onOpenGameWindow}>
              <Monitor size={16} aria-hidden />
              <span className="hidden md:inline">{t("Open Game Window")}</span>
            </Button>
          ) : (
            <Link id="openGameWindowButton" href="/game" target="_blank" className={buttonClass("secondary")}>
              <Monitor size={16} aria-hidden />
              <span className="hidden md:inline">{t("Open Game Window")}</span>
            </Link>
          )}
          {!demo && (
            <Link
              id="hostBuzzersButton"
              href={`/buzzers?room=${room}`}
              target="_blank"
              aria-label={t("Host Buzzers")}
              title={t("Host Buzzers")}
              className={buttonClass("secondary")}
            >
              <Keyboard size={16} aria-hidden />
              <span className="hidden lg:inline">{t("Host Buzzers")}</span>
            </Link>
          )}
          <Menu
            buttonId="helpMenuButton"
            ariaLabel={t("Help")}
            label={<CircleHelp size={16} aria-hidden />}
            variant="ghost"
            buttonClassName="px-3"
            panelClassName="w-60 space-y-1"
          >
            {({ close }) => (
              <>
                {!demo && (
                  <>
                    <Button
                      id="startTourButton"
                      variant="ghost"
                      className="w-full justify-start"
                      onClick={() => {
                        close();
                        onStartTour();
                      }}
                    >
                      <Play size={16} aria-hidden />
                      {t("Take the tour")}
                    </Button>
                    <Link
                      id="demoLink"
                      href="/demo"
                      target="_blank"
                      className={buttonClass("ghost", "w-full justify-start")}
                    >
                      <FlaskConical size={16} aria-hidden />
                      {t("Try the interactive demo")}
                    </Link>
                  </>
                )}
                <Link
                  id="quickstartLink"
                  href={`/docs/${docsLanguage}/quickstart`}
                  target="_blank"
                  className={buttonClass("ghost", "w-full justify-start")}
                >
                  <BookOpen size={16} aria-hidden />
                  {t("Host quickstart")}
                </Link>
                <Link
                  id="guideLink"
                  href={`/docs/${docsLanguage}/guide`}
                  target="_blank"
                  className={buttonClass("ghost", "w-full justify-start")}
                >
                  <ScrollText size={16} aria-hidden />
                  {t("Full game guide")}
                </Link>
              </>
            )}
          </Menu>
          <Button id="quitButton" variant="danger" aria-label={t("Quit")} onClick={() => quitGame(true)}>
            <LogOut size={16} aria-hidden />
            <span className="hidden md:inline">{t("Quit")}</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
