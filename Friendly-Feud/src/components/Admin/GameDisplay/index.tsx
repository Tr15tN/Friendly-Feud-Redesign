import AnswerGrid from "@/components/Admin/GameDisplay/AnswerGrid";
import FinalRoundButtonControls from "@/components/Admin/GameDisplay/FinalRoundButtonControls";
import FinalRoundPointTotals from "@/components/Admin/GameDisplay/FinalRoundPointTotals";
import Lobby from "@/components/Admin/GameDisplay/Lobby";
import PhaseBar from "@/components/Admin/GameDisplay/PhaseBar";
import ScoreBar from "@/components/Admin/GameDisplay/ScoreBar";
import TeamControls from "@/components/Admin/GameDisplay/TeamControls";
import TitleMusic from "@/components/Admin/GameDisplay/TitleMusic";
import { useScoring } from "@/components/Admin/GameDisplay/useScoring";
import HideGameQuestions from "@/components/Admin/HideGameQuestions";
import Players from "@/components/Admin/Players";
import BuzzerTable from "@/components/BuzzerTable";
import ConfirmButton from "@/components/ui/ConfirmButton";
import { hasProgress, toggleAnswer } from "@/lib/scoring";
import { Game, WSEvent } from "@/src/types/game";
import { Dispatch, RefObject, SetStateAction, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

interface GameDisplayProps {
  ws: RefObject<WebSocket>;
  setGame: Dispatch<SetStateAction<Game | null>>;
  game: Game;
  room: string;
  send: (data: WSEvent) => void;
  timerStarted: boolean;
  timerCompleted: boolean;
  setTimerStarted: (timerStarted: boolean) => void;
  setTimerCompleted: (timerCompleted: boolean) => void;
  titleMusicPlaying: boolean;
  setTitleMusicPlaying: (titleMusicPlaying: boolean) => void;
}

const FLOW_BASE = "rounded-lg border-2 px-4 py-3 text-lg disabled:opacity-50";
const FLOW_BUTTON = `${FLOW_BASE} border-secondary-700 bg-secondary-300 text-foreground hover:bg-secondary-500`;
const FLOW_PRIMARY = `${FLOW_BASE} border-primary-900 bg-primary-700 font-semibold text-white hover:bg-primary-900`;

export default function GameDisplay({
  ws,
  setGame,
  game,
  room,
  send,
  timerStarted,
  timerCompleted,
  setTimerStarted,
  setTimerCompleted,
  titleMusicPlaying,
  setTitleMusicPlaying,
}: GameDisplayProps) {
  const { t } = useTranslation();
  const scoring = useScoring(game, setGame, send);

  // Keyboard shortcuts: Ctrl/Cmd+Z = undo, 1-8 = toggle answer. Ignored while typing.
  const shortcutState = useRef({ game, scoring, t });
  shortcutState.current = { game, scoring, t };
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))) return;
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
    return <p className="py-20 text-center text-2xl text-secondary-900">[{t("Please load a game")}]</p>;
  }

  let current_screen;
  if (game.title) {
    current_screen = t("title");
  } else if (!game.is_final_round) {
    current_screen = `${t("round")} ${t("number", {
      count: game.round + 1,
    })}`;
  } else if (!game.is_final_second) {
    current_screen = `${t("Final Round")} ${t("number", { count: 1 })}`;
  } else {
    current_screen = `${t("Final Round")} ${t("number", { count: 2 })}`;
  }

  const inProgress = hasProgress(game);

  /** Switch to a regular round: clears strikes; the server clears buzzers on round change. */
  const goToRound = (roundIndex: number, label: string) => {
    const next = structuredClone(game);
    next.title = false;
    next.is_final_round = false;
    next.is_final_second = false;
    next.round = Math.min(Math.max(0, roundIndex), game.rounds.length - 1);
    next.teams.forEach((team) => (team.mistakes = 0));
    scoring.commit(next, label);
  };

  const isLobby = game.title;

  const showControls = (
    <div className="flex flex-col gap-2 pb-4">
      <PhaseBar game={game} />
      <div className="flex flex-wrap items-center justify-between gap-3 px-5">
        {/* Title music matters on the title screen; keep it reachable while it is playing. */}
        {(game.title || titleMusicPlaying) && (
          <TitleMusic
            send={send}
            room={room}
            game={game}
            setGame={setGame}
            isPlaying={titleMusicPlaying}
            setIsPlaying={setTitleMusicPlaying}
          />
        )}
        <p id="currentScreenText" className="sr-only">
          {t("Current Screen")}: {current_screen}
        </p>
      </div>
      <div className="flex flex-wrap gap-3 px-5">
        <ConfirmButton
          id="titleCardButton"
          className={FLOW_BUTTON}
          title={t("Show the title screen on the TV (starts a fresh game)")}
          needsConfirm={!game.title && inProgress}
          confirmLabel={t("Click again to confirm")}
          onConfirm={() => {
            const next = structuredClone(game);
            next.title = true;
            next.round = 0;
            next.is_final_round = false;
            next.is_final_second = false;
            scoring.commit(next, t("Title Card"));
          }}
        >
          {t("Title Card")}
        </ConfirmButton>
        <ConfirmButton
          id="startRoundOneButton"
          className={`${isLobby ? FLOW_PRIMARY : FLOW_BUTTON} ${isLobby ? "grow" : ""}`}
          title={t("Put the board live and start scoring round 1")}
          needsConfirm={inProgress && !(game.round === 0 && !game.title && !game.is_final_round)}
          confirmLabel={t("Click again to confirm")}
          onConfirm={() => goToRound(0, t("Start Round 1"))}
        >
          {isLobby ? "▶ " : ""}
          {t("Start Round 1")}
        </ConfirmButton>
        <select
          className={FLOW_BUTTON}
          id="roundSelector"
          aria-label={t("round")}
          title={t("Jump to a specific round")}
          value={game.round}
          onChange={(e) => {
            const index = parseInt(e.target.value);
            goToRound(index, `${t("round")} ${index + 1}`);
          }}
        >
          {game.rounds.map((_, index) => (
            <option value={index} key={`round-select-${index}`}>
              {t("round")} {t("number", { count: index + 1 })}
            </option>
          ))}
        </select>
        <button
          type="button"
          className={`${isLobby ? FLOW_BUTTON : `${FLOW_PRIMARY} grow`}`}
          id="nextRoundButton"
          title={t("Clear strikes and move to the next round")}
          onClick={() => goToRound(game.round + 1, t("Next Round"))}
        >
          {t("Next Round")} →
        </button>
        <HideGameQuestions game={game} setGame={setGame} send={send} />
        {game.final_round ? (
          <button
            type="button"
            id="finalRoundButton"
            className={FLOW_BUTTON}
            title={t("Switch to the Fast Money round")}
            onClick={() => {
              const next = structuredClone(game);
              next.title = false;
              next.is_final_round = true;
              next.is_final_second = false;
              scoring.commit(next, t("Final Round"), [{ action: "set_timer", data: game.final_round_timers[0] }]);
            }}
          >
            {t("Final Round")}
          </button>
        ) : null}
      </div>
      <p className="px-5 text-sm text-secondary-900">
        {isLobby
          ? t("Players join with the code below, then press Start Round 1.")
          : t("Reveal answers (keys 1–8), mark strikes, then Bank the pot. Press Next Round when the round is done.")}
      </p>
    </div>
  );

  if (!game.is_final_round) {
    return (
      <div>
        {showControls}
        {isLobby ? (
          <Lobby game={game} room={room} />
        ) : (
          <>
            <ScoreBar game={game} scoring={scoring} />
            <div className="mt-5 grid grid-cols-1 gap-5 px-5 xl:grid-cols-[minmax(0,1fr)_360px]">
              <AnswerGrid game={game} scoring={scoring} />
              <TeamControls game={game} scoring={scoring} send={send} />
            </div>
          </>
        )}
        <div>
          {/* BUZZERS AND PLAYERS */}
          <div className="grid grid-cols-2 gap-4 p-5">
            <h1 className="text-2xl capitalize text-foreground">{t("Buzzer Order")}</h1>
            <h1 className="text-2xl capitalize text-foreground">{t("players")}</h1>
            <div className="h-48 overflow-y-scroll rounded border-4 p-5 text-center">
              <div className="flex h-full  flex-col justify-between space-y-2">
                <div className="">
                  {game.buzzed.length > 0 ? (
                    <div className="flex flex-row items-center space-x-5">
                      {/* active clear buzzers button */}
                      <button
                        id="clearBuzzersButton"
                        className="rounded border-4 bg-failure-200 p-2 text-foreground hover:bg-failure-500"
                        onClick={() => {
                          send({ action: "clearbuzzers" });
                        }}
                      >
                        {t("Clear Buzzers")}
                      </button>
                      <p className="text-secondary-900">{t("Changing rounds also clears buzzers")}</p>
                    </div>
                  ) : (
                    <div className="flex flex-row items-center space-x-5">
                      {/* disabled clear buzzers button */}
                      <button
                        id="clearBuzzersButtonDisabled"
                        className="rounded border-4 bg-secondary-500 p-2 text-foreground"
                      >
                        {t("Clear Buzzers")}
                      </button>
                      <p className="text-secondary-900">{t("Changing rounds also clears buzzers")}</p>
                    </div>
                  )}
                </div>
                <hr />
                <div className="grow">
                  <BuzzerTable game={game} />
                </div>
              </div>
            </div>
            <Players game={game} setGame={setGame} ws={ws} room={room} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      {showControls}
      <hr />
      <div>
        <Players game={game} setGame={setGame} ws={ws} room={room} />
        <div className="p-5">
          {/* FINAL ROUND TEXT */}
          <h2 id="finalRoundNumberText" className="py-3 text-center text-4xl text-foreground">
            {t("Final Round")} {t("number", { count: game.is_final_second ? 2 : 1 })}
          </h2>
          <hr />
          <div className="flex flex-row items-center justify-evenly space-x-5 py-5">
            {/* START FINAL ROUND 2 */}
            {!game.is_final_second ? (
              <button
                id="startFinalRound2Button"
                className={`rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500 ${timerStarted ? "opacity-50" : ""}`}
                disabled={timerStarted}
                onClick={() => {
                  console.debug(game);
                  game.is_final_second = true;
                  game.hide_first_round = true;
                  // @ts-expect-error: need a better way to update these values
                  setGame((prv) => ({ ...prv }));
                  send({ action: "data", data: game });
                  send({
                    action: "set_timer",
                    data: game.final_round_timers[1],
                  });
                  setTimerCompleted(false);
                }}
              >
                {t("start")} {t("Final Round")} {t("number", { count: 2 })}
              </button>
            ) : (
              <div className="flex flex-row items-center justify-evenly space-x-5 py-5 text-foreground">
                {/* GO BACK TO FINAL ROUND 1 */}
                <button
                  id="backToRound1FinalButton"
                  className={`rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg hover:bg-secondary-500 ${timerStarted ? "opacity-50" : ""}`}
                  disabled={timerStarted}
                  onClick={() => {
                    game.is_final_round = true;
                    game.hide_first_round = false;
                    game.is_final_second = false;
                    // @ts-expect-error: need a better way to update these values
                    setGame((prv) => ({ ...prv }));
                    send({ action: "data", data: game });
                    send({
                      action: "set_timer",
                      data: game.final_round_timers[0],
                    });
                  }}
                >
                  {t("Back To")} {t("Final Round")} {t("number", { count: 1 })}
                </button>
                {game.is_final_second ? (
                  <div>
                    {/* REVEAL FIRST ROUND ANSWERS */}
                    {game.hide_first_round ? (
                      <button
                        id="revealFirstRoundFinalButton"
                        className="rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500"
                        onClick={() => {
                          game.hide_first_round = false;
                          // @ts-expect-error: need a better way to update these values
                          setGame((prv) => ({ ...prv }));
                          send({ action: "data", data: game });
                        }}
                      >
                        {t("Reveal First Round Answers")}
                      </button>
                    ) : (
                      // HIDE FIRST ROUND ANSWERS
                      <button
                        id="hideFirstRoundAnswersButton"
                        className="rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500"
                        onClick={() => {
                          game.hide_first_round = true;
                          // @ts-expect-error: need a better way to update these values
                          setGame((prv) => ({ ...prv }));
                          send({ action: "data", data: game });
                        }}
                      >
                        {t("Hide First Round Answers")}
                      </button>
                    )}
                  </div>
                ) : null}
              </div>
            )}
            <div className="flex px-2">
              {!timerStarted ? (
                /* START TIMER */
                <button
                  id="startTimerButton"
                  className={`rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500 ${timerCompleted ? "opacity-50" : ""}`}
                  disabled={timerCompleted}
                  onClick={() => {
                    if (game.is_final_second) {
                      send({
                        action: "start_timer",
                        data: game.final_round_timers[1],
                      });
                    } else {
                      send({
                        action: "start_timer",
                        data: game.final_round_timers[0],
                      });
                    }
                    setTimerStarted(true);
                    setTimerCompleted(false);
                  }}
                >
                  {t("Start Timer")}
                </button>
              ) : (
                /* STOP TIMER */
                <button
                  id="stopTimerButton"
                  className="rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500"
                  onClick={() => {
                    send({ action: "stop_timer" });
                    setTimerStarted(false);
                  }}
                >
                  {t("Stop Timer")}
                </button>
              )}
              <button
                className={`ml-2 rounded-lg border-2 border-secondary-700 bg-secondary-300 px-4 py-3 text-lg text-foreground hover:bg-secondary-500 ${!timerStarted ? "" : "opacity-50"}`}
                disabled={timerStarted}
                id="resetTimerButton"
                onClick={() => {
                  if (!timerStarted) {
                    if (game.is_final_second) {
                      send({
                        action: "set_timer",
                        data: game.final_round_timers[1],
                      });
                    } else {
                      send({
                        action: "set_timer",
                        data: game.final_round_timers[0],
                      });
                    }
                  }
                  setTimerCompleted(false);
                }}
              >
                {t("Reset Timer")}
              </button>
            </div>
          </div>
          <FinalRoundPointTotals game={game} />
          {/* FINAL ROUND QUESTIONS AND ANSWERS */}
          <FinalRoundButtonControls game={game} setGame={setGame} send={send} />
        </div>
      </div>
    </div>
  );
}
