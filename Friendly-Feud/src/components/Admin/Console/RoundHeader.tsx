import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { Button } from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import { firstBuzz, roundDots } from "@/lib/host/console";
import { isAwarded, roundPot, sanitizeMultiplier, setMultiplier } from "@/lib/scoring";
import { getTeamDisplayName } from "@/lib/utils";
import { Game, WSEvent } from "@/types/game";
import { Check, Undo2, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import RoundToolsMenu from "./RoundToolsMenu";
import { FlowActions } from "./useFlowActions";

const MULTIPLIER_PRESETS = [1, 2, 3];

interface RoundHeaderProps {
  game: Game;
  scoring: ScoringApi;
  flow: FlowActions;
  send: (data: WSEvent) => void;
  /** Desktop shows the tools menu here; touch shows it in the action bar. */
  showTools: boolean;
}

/** Pot, multiplier, undo, round navigation, first-buzz chip and the question. */
export default function RoundHeader({ game, scoring, flow, send, showTools }: RoundHeaderProps) {
  const { t } = useTranslation();
  const round = game.rounds[game.round];
  const multiplier = sanitizeMultiplier(round.multiply);
  const locked = isAwarded(round);
  const awardedTo = round.awarded_to;
  const buzz = firstBuzz(game);
  const buzzTeamName = buzz.team !== null ? getTeamDisplayName(game.teams[buzz.team].name, buzz.team, t) : "";

  const changeMultiplier = (value: unknown) => {
    scoring.commit(setMultiplier(game, value), t("Multiplier set to x{{count}}", { count: sanitizeMultiplier(value) }));
  };

  return (
    <section className="flex flex-col gap-3 rounded-[14px] border border-pro-line bg-pro-panel p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p id="pointsText" className="text-xs uppercase tracking-widest text-pro-mute">
            {t("round")} {t("number", { count: game.round + 1 })} / {t("number", { count: game.rounds.length })} ·{" "}
            {awardedTo === 0 || awardedTo === 1
              ? t("Banked by {{team}}", { team: getTeamDisplayName(game.teams[awardedTo].name, awardedTo, t) })
              : t("Pot")}
          </p>
          <p id="pointsNumberText" className="text-5xl font-extrabold tabular-nums tracking-tight">
            {t("number", { count: roundPot(round) })}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span id="multiplierText" className="sr-only">
            {t("multiplier")}
          </span>
          <div
            role="group"
            aria-label={t("multiplier")}
            className="inline-flex overflow-hidden rounded-[10px] border border-pro-line"
          >
            {MULTIPLIER_PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                id={`multiplierPreset${preset}Button`}
                aria-pressed={multiplier === preset}
                disabled={locked}
                className={`min-h-11 touch-manipulation px-3 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold disabled:opacity-40 lg:min-h-9 ${
                  multiplier === preset ? "bg-pro-gold text-black" : "bg-pro-raised text-pro-mute hover:text-pro-text"
                }`}
                onClick={() => changeMultiplier(preset)}
              >
                ×{preset}
              </button>
            ))}
          </div>
          <label className="flex items-center gap-1 text-xs text-pro-mute">
            ×
            <input
              type="number"
              id="multiplierInput"
              min="1"
              aria-label={t("multiplier")}
              disabled={locked}
              value={multiplier}
              onChange={(e) => changeMultiplier(e.target.value)}
              className="min-h-11 w-16 rounded-[10px] border border-pro-line bg-pro-raised px-2 text-pro-text disabled:opacity-40 lg:min-h-9"
            />
          </label>
          <Button
            id="undoButton"
            disabled={!scoring.canUndo}
            title={scoring.undoLabel ? t("Undo: {{action}}", { action: scoring.undoLabel }) : t("Nothing to undo")}
            aria-label={t("Undo")}
            aria-keyshortcuts="Control+Z"
            onClick={scoring.undo}
          >
            <Undo2 size={16} aria-hidden />
            <span className="hidden sm:inline">{t("Undo")}</span>
          </Button>
          {showTools && <RoundToolsMenu game={game} scoring={scoring} send={send} />}
        </div>
      </div>

      <nav aria-label={t("Rounds")} className="flex flex-wrap items-center gap-1.5">
        {roundDots(game).map((dot) => (
          <button
            key={dot.index}
            type="button"
            id={`roundChip${dot.index}`}
            aria-current={dot.current ? "step" : undefined}
            aria-label={`${t("round")} ${dot.index + 1}`}
            className={`inline-flex h-11 min-w-11 touch-manipulation items-center justify-center gap-1 rounded-lg border px-2 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pro-gold lg:h-9 lg:min-w-9 ${
              dot.current
                ? "border-transparent bg-pro-accent text-white"
                : dot.awarded
                  ? "border-pro-ok/50 bg-pro-raised text-pro-ok"
                  : "border-pro-line bg-pro-raised text-pro-mute hover:text-pro-text"
            }`}
            onClick={() => {
              if (!dot.current) flow.goToRound(dot.index);
            }}
          >
            {dot.awarded && !dot.current ? <Check size={12} strokeWidth={3} aria-hidden /> : null}
            {dot.index + 1}
          </button>
        ))}
      </nav>

      {buzz.team !== null && !locked && (
        <div>
          <Chip id="firstBuzzChip" tone="gold">
            <Zap size={12} aria-hidden />
            {t("Buzzed first: {{team}}", { team: buzzTeamName })}
            {buzz.name ? ` · ${buzz.name}` : ""}
          </Chip>
        </div>
      )}

      <p id="currentRoundQuestionText" className="text-lg font-semibold">
        {round.question}
      </p>
    </section>
  );
}
