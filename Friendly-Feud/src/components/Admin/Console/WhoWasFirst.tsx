import { Button } from "@/components/ui/Button";
import { hasPendingBuzz } from "@/lib/host/console";
import { getTeamDisplayName } from "@/lib/utils/team-display";
import { Game, WSAction, WSEvent } from "@/types/game";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

interface WhoWasFirstProps {
  game: Game;
  send: (data: WSEvent) => void;
}

/**
 * Pops up when the physical buzzer was pressed: the host says which team was first.
 * Keys 1 and 2 pick a team so the host can answer without reaching for the mouse.
 */
export default function WhoWasFirst({ game, send }: WhoWasFirstProps) {
  const { t } = useTranslation();
  const open = hasPendingBuzz(game);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || e.repeat) return;
      if (e.key === "1" || e.key === "2") {
        send({ action: WSAction.RESOLVE_BUZZ, team: Number(e.key) - 1 });
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, send]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4">
      <div
        id="whoWasFirstDialog"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="whoWasFirstTitle"
        className="darkTheme w-full max-w-lg rounded-[16px] border border-pro-line bg-pro-bg p-6 text-pro-text shadow-2xl"
      >
        <p className="text-xs font-semibold uppercase tracking-widest text-pro-gold">{t("Buzzer pressed")}</p>
        <h2 id="whoWasFirstTitle" className="mt-1 text-2xl font-bold">
          {t("Who was first?")}
        </h2>
        <div className="mt-5 grid grid-cols-2 gap-3">
          {[0, 1].map((team) => (
            <Button
              key={team}
              id={`whoWasFirstTeam${team}`}
              variant={team === 0 ? "team0" : "team1"}
              className="min-h-24 flex-col text-lg"
              onClick={() => send({ action: WSAction.RESOLVE_BUZZ, team })}
            >
              <span className="break-words text-center">
                {getTeamDisplayName(game.teams[team]?.name ?? "", team, t)}
              </span>
              <span className="text-xs font-normal opacity-80">{t("press {{key}}", { key: team + 1 })}</span>
            </Button>
          ))}
        </div>
        <Button
          id="whoWasFirstIgnore"
          variant="ghost"
          className="mt-4 w-full"
          onClick={() => send({ action: WSAction.CLEARBUZZERS })}
        >
          {t("Ignore this buzz")}
        </Button>
      </div>
    </div>
  );
}
