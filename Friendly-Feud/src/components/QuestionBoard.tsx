import FitText from "@/components/FitText";
import { sanitizeMultiplier } from "@/lib/scoring";
import { Round } from "@/types/game";
import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

interface QuestionBoardProps {
  round: Round;
}

const TEXT_SHADOW = "3px 3px 0 black";
// Thickness of the 3D card
const FLIP_DEPTH = 70;
// Virtual camera distance for the 3D effect
const PERSPECTIVE = 800;
// Counteract the size distortion that the perspective introduces
const DEPTH_SCALE = (PERSPECTIVE - FLIP_DEPTH / 2) / PERSPECTIVE;

function EmptySlot() {
  return <div className="h-full border-4 border-white bg-gradient-to-t from-primary-700 to-primary-500" />;
}

function UnrevealedFace({ index }: { index: number }) {
  const { t } = useTranslation();
  return (
    <div
      className="flip-face absolute inset-0 flex items-center justify-center border-4 border-white bg-gradient-to-t from-primary-700 to-primary-500"
      style={{
        backfaceVisibility: "hidden",
        transform: `translateZ(${FLIP_DEPTH / 2}px)`,
      }}
    >
      <div
        className="flex aspect-square h-3/5 items-center justify-center rounded-full border-2 border-primary-900 bg-gradient-to-tr from-primary-900 to-primary-700"
        style={{ boxShadow: "2px 2px 4px rgba(0,0,0,0.5)" }}
      >
        <span
          id={`answer${index}UnAnswered`}
          className="text-[54px] font-bold text-white"
          style={{ textShadow: TEXT_SHADOW }}
        >
          {t("number", { count: index + 1 })}
        </span>
      </div>
    </div>
  );
}

function RevealedFace({
  index,
  ans,
  pnt,
  multiplier,
  cleanup,
}: {
  index: number;
  ans: string;
  pnt: number;
  multiplier: number;
  cleanup: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="flip-face absolute inset-0 flex border-4 border-white bg-gradient-to-t from-primary-900 via-primary-500 to-primary-700"
      style={{
        backfaceVisibility: "hidden",
        transform: `rotateX(-180deg) translateZ(${FLIP_DEPTH / 2}px)`,
      }}
    >
      <div className="flex h-full min-w-0 flex-1 items-center overflow-hidden pl-3 pr-1">
        <FitText
          text={ans}
          fontSize={72}
          className="w-full font-bold text-white"
          id={`answer${index}Answered`}
          style={{ textShadow: TEXT_SHADOW }}
        />
      </div>
      <div
        className={`flex shrink-0 flex-col items-center justify-center border-l-2 border-primary-900 bg-gradient-to-t from-primary-700 to-primary-500 ${
          cleanup ? "opacity-50" : ""
        }`}
        style={{ aspectRatio: "9 / 10", textShadow: TEXT_SHADOW }}
        title={cleanup ? t("not scored") : undefined}
      >
        {/* Show the value that actually goes into the pot (base x multiplier). */}
        <span className="text-[64px] font-bold leading-none tabular-nums text-white" id={`answer${index}PointsText`}>
          {t("number", { count: pnt * multiplier })}
        </span>
        {multiplier > 1 && (
          <span className="mt-1 text-[22px] font-bold leading-none text-warning-200">
            {t("number", { count: pnt })}×{t("number", { count: multiplier })}
          </span>
        )}
      </div>
    </div>
  );
}

function CardEdge() {
  return (
    <div
      className="absolute left-0 top-0 w-full border-y-4 border-white bg-primary-900"
      style={{
        height: FLIP_DEPTH,
        transformOrigin: "top center",
        transform: `translateZ(${FLIP_DEPTH / 2}px) rotateX(-90deg)`,
      }}
    />
  );
}

function FlipCard({
  index,
  ans,
  pnt,
  trig,
  multiplier,
  cleanup,
  onFlipComplete,
}: {
  index: number;
  ans: string;
  pnt: number;
  trig: boolean;
  multiplier: number;
  cleanup: boolean;
  onFlipComplete: () => void;
}) {
  return (
    <div
      id={`answer${index}Card`}
      className="flip-card-inner relative h-full w-full"
      onTransitionEnd={(event) => {
        if (event.target === event.currentTarget && event.propertyName === "transform") {
          onFlipComplete();
        }
      }}
      style={{
        transformStyle: "preserve-3d",
        transition: "transform 0.33s ease-in-out",
        transform: `scale(${DEPTH_SCALE}) ${trig ? "rotateX(-180deg)" : "rotateX(0deg)"}`,
      }}
    >
      <UnrevealedFace index={index} />
      <RevealedFace index={index} ans={ans} pnt={pnt} multiplier={multiplier} cleanup={cleanup} />
      <CardEdge />
    </div>
  );
}

function getRoundContentKey(round: Round) {
  return JSON.stringify([round.question, round.answers.map(({ ans, pnt }) => [ans, pnt])]);
}

export default function QuestionBoard({ round }: QuestionBoardProps) {
  const [displayedRound, setDisplayedRoundState] = useState(round);
  const displayedRoundRef = useRef(round);
  const pendingRoundRef = useRef<Round | null>(null);
  const isHidingAnswersRef = useRef(false);
  const roundContentKey = getRoundContentKey(round);

  const setDisplayedRound = useCallback((nextRound: Round) => {
    displayedRoundRef.current = nextRound;
    setDisplayedRoundState(nextRound);
  }, []);

  useEffect(() => {
    const currentRound = displayedRoundRef.current;

    if (isHidingAnswersRef.current) {
      pendingRoundRef.current = round;
      return;
    }

    if (getRoundContentKey(currentRound) === roundContentKey) {
      setDisplayedRound(round);
      return;
    }

    if (currentRound.answers.some(({ trig }) => trig)) {
      // Keep the current answer data mounted until the hide animation finishes.
      pendingRoundRef.current = round;
      isHidingAnswersRef.current = true;
      setDisplayedRound({
        ...currentRound,
        answers: currentRound.answers.map((answer) => ({ ...answer, trig: false })),
      });
      return;
    }

    setDisplayedRound(round);
  }, [round, roundContentKey, setDisplayedRound]);

  const handleFlipComplete = useCallback(() => {
    if (!isHidingAnswersRef.current) return;

    isHidingAnswersRef.current = false;
    const pendingRound = pendingRoundRef.current;
    pendingRoundRef.current = null;

    if (pendingRound) setDisplayedRound(pendingRound);
  }, [setDisplayedRound]);

  const slots = Array.from({ length: 8 }, (_, i) =>
    i < displayedRound.answers.length ? { ...displayedRound.answers[i], index: i } : null
  );

  return (
    <div className="w-[1060px] aspect-[16/9] rounded-2xl bg-black p-[26px] grid grid-cols-2 grid-rows-4 grid-flow-col gap-x-3 gap-y-6 font-oswald">
      {slots.map((slot, i) => (
        <div key={`qboard-slot-${i}`} className="uppercase" style={{ perspective: PERSPECTIVE }}>
          {slot === null ? (
            <EmptySlot />
          ) : (
            <FlipCard
              index={slot.index}
              ans={slot.ans}
              pnt={slot.pnt}
              trig={slot.trig}
              multiplier={sanitizeMultiplier(displayedRound.multiply)}
              cleanup={!!slot.cleanup}
              onFlipComplete={handleFlipComplete}
            />
          )}
        </div>
      ))}
    </div>
  );
}
