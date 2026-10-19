import { ScoringApi } from "@/components/Admin/GameDisplay/useScoring";
import { Button } from "@/components/ui/Button";
import Menu from "@/components/ui/Menu";
import { adjustTeamPoints, removeStrike, resetStrikes } from "@/lib/scoring";
import { getTeamDisplayName } from "@/lib/utils";
import { Game, WSEvent } from "@/types/game";
import { Ellipsis } from "lucide-react";
import { useState } from "react";
import { useTranslation } from "react-i18next";

interface RoundToolsMenuProps {
  game: Game;
  scoring: ScoringApi;
  send: (data: WSEvent) => void;
  direction?: "down" | "up";
  buttonClassName?: string;
}

const LABEL = "mb-2 text-xs font-semibold uppercase tracking-widest text-pro-mute";

/** Secondary scoring tools: remove a strike, reset strikes, flash the X, manual point adjustment. */
export default function RoundToolsMenu({
  game,
  scoring,
  send,
  direction = "down",
  buttonClassName = "",
}: RoundToolsMenuProps) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState("10");
  const name = (team: number) => getTeamDisplayName(game.teams[team].name, team, t);

  const adjust = (team: number, sign: 1 | -1) => {
    const value = Math.abs(parseInt(amount, 10)) * sign;
    if (!Number.isFinite(value) || value === 0) return;
    scoring.commit(
      adjustTeamPoints(game, team, value),
      t("Adjusted {{team}} by {{amount}}", { team: name(team), amount: value > 0 ? `+${value}` : `${value}` })
    );
  };

  return (
    <Menu
      buttonId="roundToolsButton"
      ariaLabel={t("Round tools")}
      label={<Ellipsis size={18} aria-hidden />}
      direction={direction}
      buttonClassName={buttonClassName}
      panelClassName="w-72 space-y-4"
    >
      {({ close }) => (
        <>
          <section>
            <p className={LABEL}>{t("Remove a strike")}</p>
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((team) => (
                <Button
                  key={team}
                  id={`team${team}RemoveStrikeButton`}
                  disabled={game.teams[team].mistakes === 0}
                  className="min-w-0"
                  onClick={() =>
                    scoring.commit(removeStrike(game, team), t("Removed a strike from {{team}}", { team: name(team) }))
                  }
                >
                  <span className="truncate">− {name(team)}</span>
                </Button>
              ))}
            </div>
          </section>
          <section className="space-y-2">
            <Button
              id="resetMistakesButton"
              className="w-full"
              onClick={() => {
                scoring.commit(resetStrikes(game), t("Reset Mistakes"));
                close();
              }}
            >
              {t("Reset Mistakes")}
            </Button>
            <Button
              id="showMistakeButton"
              className="w-full"
              title={t("Shows the big X on screen without adding a strike")}
              onClick={() => {
                send({ action: "show_mistake" });
                close();
              }}
            >
              {t("Buzz-in X (no strike)")}
            </Button>
          </section>
          <section>
            <p className={LABEL}>{t("Manual adjust")}</p>
            <input
              id="manualAdjustInput"
              type="number"
              min="1"
              aria-label={t("points")}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="mb-2 min-h-11 w-full rounded-[10px] border border-pro-line bg-pro-raised px-3 text-pro-text"
            />
            <div className="grid grid-cols-2 gap-2">
              {[0, 1].map((team) => (
                <div key={team} className="flex min-w-0 flex-col gap-1">
                  <span className="truncate text-xs text-pro-mute">{name(team)}</span>
                  <div className="flex gap-1">
                    <Button
                      id={`team${team}AdjustMinusButton`}
                      className="flex-1 px-0"
                      onClick={() => adjust(team, -1)}
                    >
                      −
                    </Button>
                    <Button id={`team${team}AdjustPlusButton`} className="flex-1 px-0" onClick={() => adjust(team, 1)}>
                      +
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </>
      )}
    </Menu>
  );
}
