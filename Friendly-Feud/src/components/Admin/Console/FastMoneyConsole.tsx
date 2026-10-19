import FinalRoundButtonControls from "@/components/Admin/GameDisplay/FinalRoundButtonControls";
import FinalRoundPointTotals from "@/components/Admin/GameDisplay/FinalRoundPointTotals";
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
    <div className="mx-auto max-w-[1400px] text-foreground">
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
  );
}
