import ScoreMonitor from "@/components/ScoreMonitor";
import { isAwarded, roundPot, sanitizeMultiplier } from "@/lib/scoring";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";

interface RoundProps {
  game: Game;
}

function multiplierTitle(multiplier: number, t: (key: string, opts?: Record<string, unknown>) => string) {
  if (multiplier === 2) return t("Double");
  if (multiplier === 3) return t("Triple");
  return `×${t("number", { count: multiplier })}`;
}

export default function Round({ game }: RoundProps) {
  const { t } = useTranslation();
  const round = game.rounds[game.round];
  const multiplier = sanitizeMultiplier(round.multiply);
  const awarded = isAwarded(round);

  return (
    <div className="font-oswald flex w-full flex-col items-center gap-3">
      {game.settings.hide_questions === false && (
        <p
          id="roundQuestionText"
          className="max-w-[1660px] rounded-2xl bg-black/85 px-8 py-3 text-center text-[44px] font-medium leading-tight tracking-wide text-white"
        >
          {round.question}
        </p>
      )}
      <div className="relative flex flex-col items-center">
        <span className="text-xl uppercase tracking-[0.3em] text-foreground">
          {awarded ? t("Banked") : t("Round pot")}
        </span>
        <ScoreMonitor points={roundPot(round)} id="roundPointsTeamtotal" className="w-64" />
        {multiplier > 1 && (
          <div
            id="roundMultiplyText"
            className="absolute left-full top-1/2 ml-8 -translate-y-1/2 -rotate-6 rounded-xl border-4 border-black bg-warning-500 px-6 py-2 text-center font-bold uppercase leading-none text-black shadow-xl"
          >
            <span className="block text-6xl">{multiplierTitle(multiplier, t)}</span>
            <span className="mt-1 block text-2xl tracking-widest">{t("×{{count}} points", { count: multiplier })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
