import FastMoneyConsole from "@/components/Admin/Console/FastMoneyConsole";
import RoundsConsole from "@/components/Admin/Console/RoundsConsole";
import { FlowActions } from "@/components/Admin/Console/useFlowActions";
import Lobby from "@/components/Admin/GameDisplay/Lobby";
import TitleMusic from "@/components/Admin/GameDisplay/TitleMusic";
import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { buttonClass } from "@/components/ui/Button";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { currentPhase } from "@/lib/host/console";
import { toggleAnswer } from "@/lib/scoring";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, ReactNode, SetStateAction, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface GameDisplayProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  room: string;
  send: (data: WSEvent) => void;
  scoring: ScoringApi;
  flow: FlowActions;
  timerStarted: boolean;
  timerCompleted: boolean;
  setTimerStarted: (timerStarted: boolean) => void;
  setTimerCompleted: (timerCompleted: boolean) => void;
  titleMusicPlaying: boolean;
  setTitleMusicPlaying: (titleMusicPlaying: boolean) => void;
  /** Setup controls; rendered inline in the lobby and when no game is loaded. */
  settingsPanel: ReactNode;
}

/** Chooses what the host sees for the current phase: Lobby, Rounds or Fast Money. */
export default function GameDisplay({
  game,
  setGame,
  room,
  send,
  scoring,
  flow,
  timerStarted,
  timerCompleted,
  setTimerStarted,
  setTimerCompleted,
  titleMusicPlaying,
  setTitleMusicPlaying,
  settingsPanel,
}: GameDisplayProps) {
  const { t } = useTranslation();

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, 1-8 = toggle answer. Ignored while typing or while a drawer is open.
  const shortcutState = useRef({ game, scoring, t });
  shortcutState.current = { game, scoring, t };
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      const { game: g, scoring: sc, t: tr } = shortcutState.current;
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === "z") {
        e.preventDefault();
        sc.undo();
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey || g.title || g.is_final_round || !g.rounds) return;
      const index = parseInt(e.key, 10) - 1;
      const answer = g.rounds[g.round]?.answers[index];
      if (index < 0 || index > 7 || !answer) return;
      e.preventDefault();
      const { game: next, revealed } = toggleAnswer(g, index);
      sc.commit(
        next,
        revealed ? tr("Revealed {{answer}}", { answer: answer.ans }) : tr("Hid {{answer}}", { answer: answer.ans }),
        revealed ? [{ action: "reveal" }] : []
      );
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  if (game.rounds == null) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 px-5 py-8">
        <p className="text-center text-xl text-pro-mute">[{t("Please load a game")}]</p>
        <section className="rounded-[14px] border border-pro-line bg-pro-panel p-4">{settingsPanel}</section>
      </div>
    );
  }

  const phase = currentPhase(game);

  if (phase === "lobby") {
    return (
      <div className="mx-auto max-w-[1400px] space-y-4 px-3 py-4 sm:px-5">
        <div className="flex flex-wrap items-center gap-3">
          <ConfirmButton
            id="startRoundOneButton"
            className={buttonClass("primary", "min-h-12 px-6 text-base")}
            armedClassName={buttonClass(
              "secondary",
              "min-h-12 px-6 text-base border-pro-gold text-pro-gold ring-2 ring-pro-gold"
            )}
            title={t("Put the board live and start scoring round 1")}
            needsConfirm={flow.startNeedsConfirm}
            confirmLabel={t("Click again to confirm")}
            onConfirm={flow.startRoundOne}
          >
            ▶ {t("Start Round 1")}
          </ConfirmButton>
          {(game.title || titleMusicPlaying) && (
            <div className="text-foreground">
              <TitleMusic
                send={send}
                room={room}
                game={game}
                setGame={setGame}
                isPlaying={titleMusicPlaying}
                setIsPlaying={setTitleMusicPlaying}
              />
            </div>
          )}
        </div>
        <p className="text-sm text-pro-mute">{t("Players join with the code below, then press Start Round 1.")}</p>
        <Lobby game={game} room={room} />
        <section className="rounded-[14px] border border-pro-line bg-pro-panel p-4">
          <h2 className="mb-4 text-base font-semibold">{t("Titles, teams & settings")}</h2>
          {settingsPanel}
        </section>
      </div>
    );
  }

  // Title music can still be playing after leaving the lobby; keep its controls reachable until it is paused.
  const musicControls = titleMusicPlaying ? (
    <div className="mx-auto max-w-[1400px] px-3 pt-3 text-foreground sm:px-5">
      <TitleMusic
        send={send}
        room={room}
        game={game}
        setGame={setGame}
        isPlaying={titleMusicPlaying}
        setIsPlaying={setTitleMusicPlaying}
      />
    </div>
  ) : null;

  if (phase === "fastmoney") {
    return (
      <>
        {musicControls}
        <FastMoneyConsole
          game={game}
          setGame={setGame}
          send={send}
          timerStarted={timerStarted}
          timerCompleted={timerCompleted}
          setTimerStarted={setTimerStarted}
          setTimerCompleted={setTimerCompleted}
        />
      </>
    );
  }

  return (
    <>
      {musicControls}
      <RoundsConsole game={game} scoring={scoring} flow={flow} send={send} />
    </>
  );
}
