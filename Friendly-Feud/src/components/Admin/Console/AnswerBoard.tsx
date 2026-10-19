import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { answerValue, isAwarded, sanitizeMultiplier, toggleAnswer } from "@/lib/scoring";
import { Game } from "@/types/game";
import { Check, Minus } from "lucide-react";
import { useTranslation } from "react-i18next";

interface AnswerBoardProps {
  game: Game;
  scoring: ScoringApi;
}

const TILE_STYLES = {
  hidden: "border-pro-line bg-pro-raised text-pro-text hover:border-pro-accent",
  scored: "border-pro-ok bg-pro-ok/15 text-pro-text",
  cleanup: "border-dashed border-pro-mute bg-pro-panel text-pro-mute",
} as const;

const BADGE_STYLES = {
  // The key digit is drawn by CSS (before:content-[attr(data-key)]) instead of a text node because
  // the e2e suite parses points from the tile's innerText.
  hidden: "bg-pro-bg text-pro-mute before:content-[attr(data-key)]",
  scored: "bg-pro-ok text-pro-team1-on",
  cleanup: "bg-pro-line text-pro-mute",
} as const;

export default function AnswerBoard({ game, scoring }: AnswerBoardProps) {
  const { t } = useTranslation();
  const round = game.rounds[game.round];
  const multiplier = sanitizeMultiplier(round.multiply);
  const awarded = isAwarded(round);

  return (
    <section className="rounded-[14px] border border-pro-line bg-pro-panel p-4">
      <p className="mb-3 text-xs text-pro-mute">
        {awarded
          ? t("Round awarded: further reveals are not scored.")
          : t("Click an answer to reveal it on the board.")}{" "}
        {t("Keys 1–8 toggle answers.")}
      </p>
      <div className="grid grid-cols-1 gap-2 sm:auto-cols-fr sm:grid-flow-col sm:grid-rows-4">
        {round.answers.map((answer, index) => {
          const state = !answer.trig ? "hidden" : answer.cleanup ? "cleanup" : "scored";
          return (
            <button
              key={`answer-${index}`}
              type="button"
              id={`question${index}Button`}
              aria-pressed={answer.trig}
              aria-keyshortcuts={`${index + 1}`}
              className={`flex min-h-14 touch-manipulation items-center justify-between gap-3 rounded-[10px] border px-3 py-2 text-left text-base font-bold uppercase focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold ${TILE_STYLES[state]}`}
              onClick={() => {
                const { game: next, revealed } = toggleAnswer(game, index);
                const label = revealed
                  ? t("Revealed {{answer}}", { answer: answer.ans })
                  : t("Hid {{answer}}", { answer: answer.ans });
                scoring.commit(next, label, revealed ? [{ action: "reveal" }] : []);
              }}
            >
              <span className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  data-key={index + 1}
                  className={`grid size-7 shrink-0 place-items-center rounded-lg text-xs ${BADGE_STYLES[state]}`}
                >
                  {state === "scored" ? (
                    <Check size={14} strokeWidth={3} />
                  ) : state === "cleanup" ? (
                    <Minus size={14} />
                  ) : null}
                </span>
                <span className="truncate">{answer.ans}</span>
              </span>
              <span className="shrink-0 tabular-nums" id={`answer${index}PointsText`}>
                {t("number", { count: answer.pnt })}
                {multiplier > 1 && (
                  <span className="ml-1 text-sm font-semibold opacity-80">
                    → {t("number", { count: answerValue(round, answer.pnt) })}
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
      {scoring.lastAction && (
        <p id="lastActionText" className="mt-3 text-xs text-pro-mute">
          {t("Last action")}: {scoring.lastAction}
        </p>
      )}
    </section>
  );
}
