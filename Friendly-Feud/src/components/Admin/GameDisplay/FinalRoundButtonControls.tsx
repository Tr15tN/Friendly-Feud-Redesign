import { awardFinalAnswer, finalSelectionIndex } from "@/lib/scoring";
import { debounce } from "@/lib/utils";
import { FinalRound, Game, WSEvent } from "@/src/types/game";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface FinalRoundButtonControlsProps {
  game: Game;
  send: (data: WSEvent) => void;
  setGame: Dispatch<SetStateAction<Game | null>>;
}

const CONTROL =
  "rounded-lg border-2 border-secondary-700 bg-secondary-300 px-3 py-2 text-lg text-foreground placeholder:text-secondary-900";
const BUTTON_BASE = "whitespace-nowrap rounded-lg border-2 px-3 py-2 text-lg font-semibold";
const BUTTON = `${BUTTON_BASE} border-secondary-700 bg-secondary-300 text-foreground hover:bg-secondary-500`;
const AWARD_BUTTON = `${BUTTON_BASE} border-primary-900 bg-primary-700 text-white hover:bg-primary-900`;

/** Apply `update` to question `i` of whichever fast money half is active. */
function updateActive(prev: Game, i: number, update: (round: FinalRound) => FinalRound): Game {
  const apply = (rounds: FinalRound[]) => rounds.map((round, index) => (index === i ? update(round) : round));
  return prev.is_final_second
    ? { ...prev, final_round_2: apply(prev.final_round_2) }
    : { ...prev, final_round: apply(prev.final_round) };
}

function Status({ round }: { round: FinalRound }) {
  const { t } = useTranslation();
  if (round.awarded) {
    return round.points > 0 ? (
      <span className="rounded-full bg-success-200 px-3 py-1 font-bold tabular-nums text-success-900">
        ✓ {t("number", { count: round.points })}
      </span>
    ) : (
      <span className="rounded-full bg-failure-200 px-3 py-1 font-bold text-failure-900">✗ 0</span>
    );
  }
  if (round.revealed) {
    return <span className="rounded-full bg-warning-200 px-3 py-1 text-sm text-black">{t("revealed")}</span>;
  }
  return <span className="px-3 py-1 text-secondary-900">—</span>;
}

/** One compact row per fast money question: answer, pick, reveal, award, status. */
export default function FinalRoundButtonControls({ game, send, setGame }: FinalRoundButtonControlsProps) {
  const { t } = useTranslation();
  const controlRound = game.is_final_second ? game.final_round_2 : game.final_round;
  if (!controlRound) return null;

  const commit = (i: number, update: (round: FinalRound) => FinalRound, extra: WSEvent[] = []) => {
    setGame((prevGame) => {
      if (prevGame === null) return prevGame;
      const updated = updateActive(prevGame, i, update);
      send({ action: "data", data: updated });
      extra.forEach(send);
      return updated;
    });
  };

  return (
    <div className="rounded-xl border-2 border-secondary-500 p-4">
      <div className="grid grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)_minmax(0,1fr)_auto_auto_5rem] items-center gap-x-3 gap-y-3">
        <span className="text-sm uppercase tracking-wide text-secondary-900">{t("question")}</span>
        <span className="text-sm uppercase tracking-wide text-secondary-900">{t("Answer")}</span>
        <span className="text-sm uppercase tracking-wide text-secondary-900">{t("Award points")}</span>
        <span />
        <span />
        <span className="text-sm uppercase tracking-wide text-secondary-900">{t("Status")}</span>

        {controlRound.map((x, i) => {
          const key = `${game.is_final_second ? "final-round-2" : "final-round-1"}-question-${i}`;
          const partner = game.final_round[i];
          return (
            <div key={key} className="contents">
              <div className="min-w-0 border-t border-secondary-500 pt-3">
                <p className="line-clamp-2 text-base font-bold leading-snug text-foreground" title={x.question}>
                  {x.question}
                </p>
                {game.is_final_second && (
                  <p className="flex items-center gap-2 truncate text-sm text-secondary-900">
                    <i>{t("Partner's Answer")}</i>: {partner?.input || `(${t("No Answer")})`}
                    {partner?.input && (
                      <button
                        type="button"
                        id={`alreadyAnswered${i}Button`}
                        className="rounded border border-secondary-700 bg-secondary-300 px-2 text-xs text-foreground hover:bg-secondary-500"
                        onClick={() => send({ action: "duplicate" })}
                      >
                        {t("Already Answered")}
                      </button>
                    )}
                  </p>
                )}
              </div>
              <div className="border-t border-secondary-500 pt-3">
                <input
                  id={`finalRoundAnswer${i}Input`}
                  className={`${CONTROL} w-full`}
                  placeholder={t("Answer")}
                  defaultValue={x.input}
                  onChange={debounce((e: React.ChangeEvent<HTMLInputElement>) => {
                    const value = e.target.value;
                    commit(i, (round) => ({ ...round, input: value }));
                  })}
                />
              </div>
              <div className="border-t border-secondary-500 pt-3">
                <select
                  id={`finalRoundAnswer${i}Selector`}
                  value={finalSelectionIndex(x)}
                  className={`${CONTROL} w-full`}
                  onChange={(e) => {
                    const selection = parseInt(e.target.value);
                    // Negative encoding = chosen but not yet awarded (kept for compatibility).
                    commit(i, (round) => ({ ...round, selection: -(selection + 1), awarded: false }));
                  }}
                >
                  <option value={0}>({t("No Answer")}) 0</option>
                  {x.answers.map((answer, index) => (
                    <option key={`answers-${index}`} value={index + 1}>
                      {answer[0]} {answer[1]}
                    </option>
                  ))}
                </select>
              </div>
              <div className="border-t border-secondary-500 pt-3">
                <button
                  type="button"
                  id={`finalRoundAnswer${i}RevealButton`}
                  className={BUTTON}
                  onClick={() =>
                    commit(
                      i,
                      (round) =>
                        // Legacy state used a non-negative selection before award; convert to pending.
                        round.points === 0 && round.selection >= 0 && !round.awarded
                          ? { ...round, revealed: true, selection: -(round.selection + 1) }
                          : { ...round, revealed: true },
                      [{ action: "final_reveal" }]
                    )
                  }
                >
                  {t("Reveal Answer")}
                </button>
              </div>
              <div className="border-t border-secondary-500 pt-3">
                <button
                  type="button"
                  id={`finalRoundAnswers${i}SubmitButton`}
                  className={AWARD_BUTTON}
                  onClick={() => {
                    const index = finalSelectionIndex(x);
                    // "No answer" plays the try-again sound instead of flashing the strike X.
                    commit(i, (round) => awardFinalAnswer(round, finalSelectionIndex(round)), [
                      { action: index > 0 ? "final_submit" : "final_wrong" },
                    ]);
                  }}
                >
                  {t("Award points")}
                </button>
              </div>
              <div className="border-t border-secondary-500 pt-3" id={`finalRoundAnswer${i}Status`}>
                <Status round={x} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
