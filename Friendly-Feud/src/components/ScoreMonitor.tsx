import { useCountUp, usePositiveDelta } from "@/lib/hooks/useCountUp";
import { useTranslation } from "react-i18next";

const TONES = {
  primary: "from-primary-900 to-primary-500",
  team0: "from-team1-900 to-team1-500",
  team1: "from-team2-900 to-team2-500",
} as const;

interface ScoreMonitorProps {
  points: number;
  id: string;
  className?: string;
  highlight?: boolean;
  /** Colour of the panel: board primary (pot) or a team accent. */
  tone?: keyof typeof TONES;
}

export default function ScoreMonitor({
  points,
  id,
  className = "",
  highlight = false,
  tone = "primary",
}: ScoreMonitorProps) {
  const { t } = useTranslation();
  const shown = useCountUp(points);
  const delta = usePositiveDelta(points);

  return (
    <div
      className={`font-oswald relative flex items-center justify-center rounded-lg bg-gradient-to-tr ${TONES[tone]}
        transition-[border-color,box-shadow] duration-300
        ${highlight ? "border-warning-500 shadow-[0_0_32px_6px] shadow-warning-500/60" : "border-black"}
        ${className}`}
      style={{ borderWidth: 8, aspectRatio: "16/9", containerType: "size" }}
    >
      <span
        className="font-bold tabular-nums text-white"
        id={id}
        style={{
          fontSize: "67cqh",
          WebkitTextStroke: "3px black",
          paintOrder: "stroke fill",
        }}
      >
        {t("number", { count: shown })}
      </span>
      {/* "+N" flourish lives outside the id'd number so its text stays the plain score. */}
      {delta && (
        <span
          key={delta.id}
          aria-hidden
          className="score-delta pointer-events-none absolute -top-2 right-2 rounded-full bg-warning-500 px-3 font-bold tabular-nums text-black shadow-lg"
          style={{ fontSize: "28cqh" }}
        >
          +{t("number", { count: delta.amount })}
        </span>
      )}
    </div>
  );
}
