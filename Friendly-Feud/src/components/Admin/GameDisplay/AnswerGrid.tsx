import { answerValue, isAwarded, sanitizeMultiplier, toggleAnswer } from "@/lib/scoring";
import { Game } from "@/src/types/game";
import { useTranslation } from "react-i18next";
import { ScoringApi } from "./useScoring";

interface AnswerGridProps {
  game: Game;
  scoring: ScoringApi;
}

export default function AnswerGrid({ game, scoring }: AnswerGridProps) {
  const { t } = useTranslation();
  const round = game.rounds[game.round];
  const multiplier = sanitizeMultiplier(round.multiply);
  const awarded = isAwarded(round);

  return (
    <section className="rounded-xl border-2 border-secondary-500 p-5">
      <p id="currentRoundQuestionText" className="text-2xl font-bold text-foreground">
        {round.question}
      </p>
      <p className="mb-4 mt-1 text-sm text-secondary-900">
        {awarded
          ? t("Round awarded: further reveals are not scored.")
          : t("Click an answer to reveal it on the board.")}{" "}
        {t("Keys 1–8 toggle answers.")}
      </p>
      <div className="grid grid-flow-col grid-rows-4 gap-3">
        {round.answers.map((x, index) => {
          const state = !x.trig ? "hidden" : x.cleanup ? "cleanup" : "scored";
          const styles = {
            hidden: "border-primary-900 bg-primary-700 text-white hover:bg-primary-900",
            scored: "border-success-700 bg-success-200 text-success-900",
            cleanup: "border-dashed border-secondary-900 bg-secondary-300 text-foreground",
          }[state];
          return (
            <button
              key={`answer-${index}`}
              type="button"
              id={`question${index}Button`}
              data-key={index + 1}
              aria-pressed={x.trig}
              aria-keyshortcuts={`${index + 1}`}
              className={`flex min-h-16 items-center justify-between gap-3 rounded-lg border-2 px-4 py-3 text-left text-xl font-bold uppercase focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-warning-500 ${styles}`}
              onClick={() => {
                const { game: next, revealed } = toggleAnswer(game, index);
                const label = revealed
                  ? t("Revealed {{answer}}", { answer: x.ans })
                  : t("Hid {{answer}}", { answer: x.ans });
                scoring.commit(next, label, revealed ? [{ action: "reveal" }] : []);
              }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className={`grid size-7 shrink-0 place-items-center rounded-full text-sm ${
                    state === "hidden"
                      ? "bg-white/20 before:content-[attr(data-key)]"
                      : state === "scored"
                        ? "bg-success-700 text-white"
                        : "bg-secondary-700"
                  }`}
                  data-key={index + 1}
                >
                  {state === "scored" ? "✓" : ""}
                </span>
                <span className="truncate">{x.ans}</span>
              </span>
              <span className="shrink-0 tabular-nums" id={`answer${index}PointsText`}>
                {t("number", { count: x.pnt })}
                {multiplier > 1 && (
                  <span className="ml-1 text-sm font-semibold opacity-80">
                    → {t("number", { count: answerValue(round, x.pnt) })}
                  </span>
                )}
                {state === "cleanup" && (
                  <span className="ml-2 text-xs font-semibold normal-case">({t("not scored")})</span>
                )}
              </span>
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
        {scoring.lastAction && (
          <p className="rounded-full bg-secondary-300 px-3 py-1 text-foreground" id="lastActionText">
            {t("Last action")}: {scoring.lastAction}
          </p>
        )}
        {scoring.canUndo && (
          <button
            type="button"
            className="rounded-full border-2 border-secondary-700 px-3 py-1 text-foreground hover:bg-secondary-300"
            onClick={scoring.undo}
          >
            ↶ {t("Undo")} <kbd className="ml-1 rounded border border-secondary-700 px-1 text-xs">Ctrl+Z</kbd>
          </button>
        )}
      </div>
    </section>
  );
}
