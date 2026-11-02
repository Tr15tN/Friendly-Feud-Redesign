import FinalRoundButtonControls from "@/components/Admin/GameDisplay/FinalRoundButtonControls";
import FinalRoundPointTotals from "@/components/Admin/GameDisplay/FinalRoundPointTotals";
import { buttonClass } from "@/components/ui/button-class";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface FastMoneyConsoleProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
  timerStarted: boolean;
  timerCompleted: boolean;
  setTimerStarted: (timerStarted: boolean) => void;
  setTimerCompleted: (timerCompleted: boolean) => void;
}

export default function FastMoneyConsole({
  game,
  setGame,
  send,
  timerStarted,
  timerCompleted,
  setTimerStarted,
  setTimerCompleted,
}: FastMoneyConsoleProps) {
  const { t } = useTranslation();

  return (
    <div className="mx-auto max-w-[1400px] text-pro-text">
      <div className="px-3 py-4 sm:px-5">
        {/* FINAL ROUND TEXT */}
        <h2 id="finalRoundNumberText" className="py-2 text-center text-2xl font-bold text-pro-text sm:text-3xl">
          {t("Final Round")} {t("number", { count: game.is_final_second ? 2 : 1 })}
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-3 py-4">
          {/* START FINAL ROUND 2 */}
          {!game.is_final_second ? (
            <button
              id="startFinalRound2Button"
              className={buttonClass("secondary")}
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
            <div className="flex flex-wrap items-center justify-center gap-3">
              {/* GO BACK TO FINAL ROUND 1 */}
              <button
                id="backToRound1FinalButton"
                className={buttonClass("secondary")}
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
                      className={buttonClass("secondary")}
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
                      className={buttonClass("secondary")}
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
          <div className="flex flex-wrap gap-2">
            {!timerStarted ? (
              /* START TIMER */
              <button
                id="startTimerButton"
                className={buttonClass("secondary")}
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
                className={buttonClass("secondary")}
                onClick={() => {
                  send({ action: "stop_timer" });
                  setTimerStarted(false);
                }}
              >
                {t("Stop Timer")}
              </button>
            )}
            <button
              className={buttonClass("secondary")}
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
  );
}
