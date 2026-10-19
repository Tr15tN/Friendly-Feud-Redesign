import { Game } from "@/src/types/game";
import { useTranslation } from "react-i18next";

interface PhaseBarProps {
  game: Game;
}

type PhaseKey = "lobby" | "rounds" | "fastmoney";

/**
 * A compact "where am I" stepper for the host: Lobby → Rounds → Fast Money.
 * Purely informational; it never changes game state.
 */
export default function PhaseBar({ game }: PhaseBarProps) {
  const { t } = useTranslation();

  let current: PhaseKey = "rounds";
  if (game.title) current = "lobby";
  else if (game.is_final_round) current = "fastmoney";

  const roundLabel =
    current === "rounds"
      ? `${t("Rounds")} · ${t("number", { count: game.round + 1 })}/${game.rounds.length}`
      : t("Rounds");

  const steps: { key: PhaseKey; label: string }[] = [
    { key: "lobby", label: t("Lobby") },
    { key: "rounds", label: roundLabel },
    { key: "fastmoney", label: t("Fast Money") },
  ];

  const order: PhaseKey[] = ["lobby", "rounds", "fastmoney"];
  const currentIndex = order.indexOf(current);

  return (
    <nav aria-label={t("Game phase")} className="flex flex-wrap items-center gap-2 px-5 pt-3 text-sm">
      {steps.map((step, index) => {
        const done = index < currentIndex;
        const active = index === currentIndex;
        return (
          <div key={step.key} className="flex items-center gap-2">
            <span
              className={[
                "rounded-full border-2 px-3 py-1 font-semibold",
                active
                  ? "border-primary-900 bg-primary-700 text-white"
                  : done
                    ? "border-success-500 bg-success-300 text-foreground"
                    : "border-secondary-500 bg-secondary-200 text-secondary-900",
              ].join(" ")}
            >
              {active ? "● " : done ? "✓ " : ""}
              {step.label}
            </span>
            {index < steps.length - 1 && <span className="text-secondary-700">→</span>}
          </div>
        );
      })}
    </nav>
  );
}
