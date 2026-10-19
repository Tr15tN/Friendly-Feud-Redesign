import { useCountUp } from "@/lib/hooks/useCountUp";
import { finalRoundTotal, finalRoundWinThreshold, isFinalRoundWin } from "@/lib/scoring";
import { FinalRound, Game } from "@/types/game";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";

const TEXT_SHADOW = "2px 2px 0 black";

interface AnswersProps {
  round: FinalRound[];
  finalRoundNumber: number;
}

function Answers({ round, finalRoundNumber }: AnswersProps) {
  const { t } = useTranslation();
  return round.map((x, i) => (
    <div
      key={`final-round-answers-${i}`}
      className="flex h-20 flex-row gap-2"
      style={{
        minWidth: 0,
      }}
    >
      <div
        className="relative flex min-w-0 grow items-center overflow-hidden border-2 border-fastm-text/40 bg-fastm-background px-4 uppercase"
        style={{ minHeight: 80 }}
      >
        {x.revealed && (
          <div className="final-reveal w-full" style={{ animationDelay: `${i * 60}ms` }}>
            <p
              id={`finalRound${finalRoundNumber}Answer${i}Text`}
              className="w-full truncate text-left text-5xl font-bold leading-none text-fastm-text"
              style={{ textShadow: TEXT_SHADOW }}
            >
              {x.input}
            </p>
          </div>
        )}
      </div>
      <div
        className="flex w-24 shrink-0 items-center justify-center border-2 border-fastm-text/40 bg-fastm-background font-extrabold uppercase tabular-nums text-fastm-text"
        style={{ textShadow: TEXT_SHADOW }}
      >
        {x.revealed && x.selection >= 0 && (
          <p
            id={`finalRound${finalRoundNumber}Answer${i}PointsTotalText`}
            className="text-5xl leading-none"
            style={{ animationDelay: `${i * 60 + 80}ms` }}
          >
            {t("number", { count: x.points })}
          </p>
        )}
      </div>
    </div>
  ));
}

interface FinalPageProps {
  game: Game;
  timer: number;
}

export default function FinalPage({ game, timer }: FinalPageProps) {
  const { t } = useTranslation();
  const hasConfettiRef = useRef(false);
  const total = finalRoundTotal(game);
  const shownTotal = useCountUp(total);
  const target = finalRoundWinThreshold(game);
  const showFirstRound = !game.hide_first_round;
  const showWin = isFinalRoundWin(game);

  const emptyFinalRound: FinalRound = {
    answers: [],
    question: "",
    input: "",
    selection: 0,
    points: 0,
    revealed: false,
  };

  const emptyFinalRounds: FinalRound[] = Array.from({ length: game.final_round.length }, () => emptyFinalRound);

  useEffect(() => {
    if (!showWin) {
      return;
    }

    if (hasConfettiRef.current) {
      return;
    }

    let cancelled = false;

    const runConfetti = async () => {
      if (typeof window === "undefined") {
        return;
      }

      const { default: confetti } = await import("@hiseb/confetti");
      if (cancelled) {
        return;
      }

      confetti({});
      hasConfettiRef.current = true;
    };

    void runConfetti();

    return () => {
      cancelled = true;
    };
  }, [showWin]);

  // Fixed 1060px layout; the game window scales it to fit the screen (ScaleToFit).
  return (
    <div className="font-oswald flex w-[1060px] flex-col items-center gap-5">
      <div className="relative w-full">
        <svg
          className="absolute inset-x-0 top-4 h-24 w-full text-fastm-holder"
          viewBox="0 0 1000 200"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <path
            d="M0,200 L140,200 Q200,200 240,160 L360,40 Q380,20 400,20 L600,20 Q620,20 640,40 L760,160 Q800,200 860,200 L1000,200 Z"
            fill="currentColor"
          />
        </svg>
        <div className="relative top-2 flex items-center justify-center pt-12 text-center">
          <p id="finalRoundTitle" className="text-4xl font-bold uppercase text-fastm-text">
            {game.settings.final_round_title || t("Fast Money")}
          </p>
        </div>
      </div>

      <div className="relative w-full overflow-hidden rounded-2xl bg-fastm-holder px-5 pb-6 pt-8">
        <div className="grid grid-cols-2 gap-4">
          <div className="grid min-w-0 gap-3">
            <Answers finalRoundNumber={1} round={showFirstRound ? game.final_round : emptyFinalRounds} />
          </div>
          <div className="grid min-w-0 gap-3">
            <Answers finalRoundNumber={2} round={game.final_round_2} />
          </div>
        </div>
      </div>

      {/* Timer and total sit below the board so nothing overlaps the answers. */}
      <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-6">
        <div />
        <div
          className="flex size-28 items-center justify-center rounded-full border-4 border-fastm-text bg-fastm-holder text-fastm-text"
          aria-label={t("timer")}
        >
          <p
            id="finalRoundTimerLabel"
            className="text-6xl font-bold uppercase tabular-nums"
            style={{ textShadow: TEXT_SHADOW }}
          >
            <span id="finalRoundTimerValue">{t("number", { count: timer })}</span>
          </p>
        </div>
        <div className="flex flex-col items-end gap-1">
          <div
            className={`flex items-baseline gap-4 rounded-xl border-4 px-6 py-2 ${
              showWin
                ? "border-warning-500 bg-warning-500 text-black"
                : "border-fastm-text bg-fastm-background text-fastm-text"
            }`}
          >
            <span className="text-3xl font-bold uppercase tracking-widest">{t("total")}</span>
            <span id="finalRoundTotalPointsText" className="text-7xl font-bold tabular-nums leading-none">
              {t("number", { count: shownTotal })}
            </span>
          </div>
          <span id="finalRoundTargetText" className="text-xl uppercase tracking-widest text-foreground opacity-80">
            {t("Target")}: {t("number", { count: target })}
          </span>
        </div>
      </div>

      {/* WIN TEXT */}
      <div className="h-24 text-center">
        {showWin ? (
          <p id="finalRoundWinText" className="text-8xl font-bold uppercase leading-none text-foreground">
            {t("win")}
          </p>
        ) : null}
      </div>
    </div>
  );
}
