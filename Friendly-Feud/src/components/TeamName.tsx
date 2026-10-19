import FitText from "@/components/FitText";
import ScoreMonitor from "@/components/ScoreMonitor";
import { firstBuzzTeam, isAwarded, MAX_STRIKES, stealTeam } from "@/lib/scoring";
import { teamColors } from "@/lib/utils/team-colors";
import { Game } from "@/types/game";
import Image from "next/image";
import { useTranslation } from "react-i18next";

interface TeamNameProps {
  team: number;
  game: Game;
  /** tv = big game-window panel, compact = phone/buzzer view. */
  size?: "tv" | "compact";
}

export default function TeamName({ team, game, size = "tv" }: TeamNameProps) {
  const { t } = useTranslation();
  const teamData = game.teams[team];
  const colors = teamColors(team);
  const round = game.rounds?.[game.round];
  const banked = round?.awarded_to === team;
  const inControl = !isAwarded(round) && firstBuzzTeam(game) === team;
  const canSteal = stealTeam(game) === team;
  const tv = size === "tv";

  let status: { text: string; className: string } | null = null;
  if (banked) {
    status = { text: `${t("Banked")} +${t("number", { count: round?.awarded_points ?? 0 })}`, className: colors.solid };
  } else if (canSteal) {
    status = { text: t("Steal!"), className: "bg-warning-500 text-black" };
  } else if (inControl) {
    status = { text: t("In control"), className: "bg-warning-500 text-black" };
  }

  return (
    <div className="font-oswald flex w-full min-w-0 flex-col items-center">
      <div className={`w-full rounded-t-xl border-x-8 border-t-8 border-black px-2 ${colors.solid}`}>
        <FitText
          text={teamData.name}
          fontSize={tv ? 44 : 24}
          id={`team${team}TeamName`}
          className={`${tv ? "h-14" : "h-8"} w-full font-bold uppercase text-white`}
        />
      </div>
      <ScoreMonitor
        points={teamData.points}
        id={`roundPointsTeam${team + 1}`}
        tone={team === 0 ? "team0" : "team1"}
        className="w-full rounded-t-none"
        highlight={inControl || canSteal}
      />

      <div className={`${tv ? "my-3 h-10" : "my-1 h-6"} flex items-center`} id={`team${team}StatusText`}>
        {status && (
          <span
            className={`rounded-full px-4 font-bold uppercase tracking-wider ${status.className} ${tv ? "py-1 text-2xl" : "text-sm"}`}
          >
            {status.text}
          </span>
        )}
      </div>

      {/* Three fixed slots so "2 of 3" is readable at a glance. Filled strikes are <div>s
          (the e2e tests count them); empty slots are <span>s. */}
      <div
        id={`team${team}MistakesList`}
        className={`flex ${tv ? "h-16 gap-2" : "h-8 gap-1"}`}
        role="img"
        aria-label={t("Strikes {{count}} of {{max}}", { count: teamData.mistakes, max: MAX_STRIKES })}
      >
        {Array.from({ length: MAX_STRIKES }, (_, i) =>
          i < teamData.mistakes ? (
            <div key={`mistake-${i}-${team}`} className="aspect-square h-full">
              <Image width={100} height={100} src="/x.svg" alt="" className="size-full" />
            </div>
          ) : (
            <span
              key={`slot-${i}-${team}`}
              className={`block aspect-square h-full rounded-lg border-dashed border-foreground/30 ${tv ? "border-4" : "border-2"}`}
            />
          )
        )}
      </div>
    </div>
  );
}
