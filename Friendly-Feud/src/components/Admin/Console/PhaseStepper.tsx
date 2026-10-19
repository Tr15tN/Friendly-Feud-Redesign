import ConfirmButton from "@/components/ui/ConfirmButton";
import { currentPhase, Phase } from "@/lib/host/console";
import { Game } from "@/types/game";
import { useTranslation } from "react-i18next";
import { FlowActions } from "./useFlowActions";

interface PhaseStepperProps {
  game: Game;
  flow: FlowActions;
}

const STEP =
  "inline-flex min-h-11 touch-manipulation items-center rounded-full px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold lg:min-h-9";
const ORDER: Phase[] = ["lobby", "rounds", "fastmoney"];

/** Lobby → Rounds n/N → Fast Money. Each step is also a shortcut to that phase. */
export default function PhaseStepper({ game, flow }: PhaseStepperProps) {
  const { t } = useTranslation();
  const phase = currentPhase(game);
  const currentIndex = ORDER.indexOf(phase);
  const stateClass = (index: number) =>
    index === currentIndex
      ? "bg-pro-accent text-white"
      : index < currentIndex
        ? "bg-pro-raised text-pro-ok"
        : "bg-pro-raised text-pro-mute hover:text-pro-text";
  const roundsLabel =
    phase === "rounds"
      ? `${t("Rounds")} · ${t("number", { count: game.round + 1 })}/${game.rounds.length}`
      : t("Rounds");

  return (
    <nav aria-label={t("Game phase")} className="flex items-center gap-1.5">
      <ConfirmButton
        id="phaseLobbyButton"
        aria-current={phase === "lobby" ? "step" : undefined}
        needsConfirm={!game.title && flow.inProgress}
        confirmLabel={t("Click again to confirm")}
        className={`${STEP} ${stateClass(0)}`}
        armedClassName={`${STEP} bg-pro-gold text-black`}
        onConfirm={() => {
          if (phase !== "lobby") flow.showTitle();
        }}
      >
        {currentIndex > 0 ? "✓ " : ""}
        {t("Lobby")}
      </ConfirmButton>
      <button
        type="button"
        id="phaseRoundsButton"
        aria-current={phase === "rounds" ? "step" : undefined}
        className={`${STEP} ${stateClass(1)}`}
        onClick={() => {
          if (phase !== "rounds") flow.goToRound(game.round);
        }}
      >
        {currentIndex > 1 ? "✓ " : ""}
        {roundsLabel}
      </button>
      <button
        type="button"
        id="phaseFastMoneyButton"
        aria-current={phase === "fastmoney" ? "step" : undefined}
        disabled={game.final_round == null}
        className={`${STEP} ${stateClass(2)} disabled:opacity-40`}
        onClick={() => {
          if (phase !== "fastmoney") flow.goFinal();
        }}
      >
        {t("Fast Money")}
      </button>
    </nav>
  );
}
