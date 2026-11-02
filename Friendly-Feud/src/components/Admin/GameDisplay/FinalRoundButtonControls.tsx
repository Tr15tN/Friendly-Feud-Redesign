import { buttonClass } from "@/components/ui/button-class";
import { inputClass } from "@/components/ui/form";
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
      <span className="rounded-full bg-pro-ok/15 px-3 py-1 font-bold tabular-nums text-pro-ok">
        ✓ {t("number", { count: round.points })}
      </span>
    ) : (
      <span className="rounded-full bg-pro-danger/15 px-3 py-1 font-bold text-pro-danger-text">✗ 0</span>
    );
  }
  if (round.revealed) {
    return <span className="rounded-full bg-pro-gold/15 px-3 py-1 text-sm text-pro-gold">{t("revealed")}</span>;
  }
  return <span className="px-3 py-1 text-pro-mute">—</span>;
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
    <div className="grid gap-3 lg:grid-cols-2">
      {controlRound.map((x, i) => {
        const key = `${game.is_final_second ? "final-round-2" : "final-round-1"}-question-${i}`;
        const partner = game.final_round[i];
        return (
          <div key={key} className="min-w-0 space-y-3 rounded-[14px] border border-pro-line bg-pro-panel p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-base font-semibold leading-snug text-pro-text" title={x.question}>
                  <span className="mr-2 text-pro-mute">{i + 1}.</span>
                  {x.question}
                </p>
                {game.is_final_second && (
                  <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-pro-mute">
                    <span>
                      <i>{t("Partner's Answer")}</i>: {partner?.input || `(${t("No Answer")})`}
                    </span>
                    {partner?.input && (
                      <button
                        type="button"
                        id={`alreadyAnswered${i}Button`}
                        className={buttonClass("secondary", "min-h-8 px-2 text-xs")}
                        onClick={() => send({ action: "duplicate" })}
                      >
                        {t("Already Answered")}
                      </button>
                    )}
                  </p>
                )}
              </div>
              <div className="shrink-0" id={`finalRoundAnswer${i}Status`}>
                <Status round={x} />
              </div>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                id={`finalRoundAnswer${i}Input`}
                className={inputClass}
                aria-label={t("Answer")}
                placeholder={t("Answer")}
                defaultValue={x.input}
                onChange={debounce((e: React.ChangeEvent<HTMLInputElement>) => {
                  const value = e.target.value;
                  commit(i, (round) => ({ ...round, input: value }));
                })}
              />
              <select
                id={`finalRoundAnswer${i}Selector`}
                value={finalSelectionIndex(x)}
                className={inputClass}
                aria-label={t("Award points")}
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
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                id={`finalRoundAnswer${i}RevealButton`}
                className={buttonClass("secondary")}
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
              <button
                type="button"
                id={`finalRoundAnswers${i}SubmitButton`}
                className={buttonClass("primary")}
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
          </div>
        );
      })}
    </div>
  );
}
