import { teamColors } from "@/lib/utils/team-colors";
import { defaultLanguage } from "@/i18n/languages";
import { Game } from "@/src/types/game";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface LobbyProps {
  game: Game;
  room: string;
}

/**
 * The host's pre-game view: a big join code / URL and the roster of who has
 * joined each team, so a first-time host knows exactly what to do before they
 * press "Start Round 1".
 */
export default function Lobby({ game, room }: LobbyProps) {
  const { t } = useTranslation();
  const joinUrl = process.env.NEXT_PUBLIC_TITLE_URL;

  const players = Object.values(game.registeredPlayers ?? {});
  const unassigned = players.filter((p) => p.team == null);
  const totalJoined = players.length;

  return (
    <div className="mx-5 mt-4 grid grid-cols-1 gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Join info */}
      <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-secondary-500 bg-secondary-200 p-6 text-center text-foreground">
        <p className="text-sm font-semibold uppercase tracking-widest text-secondary-900">{t("Join code")}</p>
        <p className="text-6xl font-extrabold uppercase tracking-widest">{room}</p>
        {joinUrl ? (
          <p className="text-lg">
            {t("Join at")} <span className="font-bold">{joinUrl}</span>
          </p>
        ) : (
          <p className="text-sm text-secondary-900">{t("Players open the site and enter this code to join.")}</p>
        )}
        <p className="mt-2 rounded-full bg-secondary-300 px-4 py-1 text-sm font-semibold">
          {t("{{count}} joined", { count: totalJoined })}
        </p>
      </div>

      {/* Roster + guidance */}
      <div className="rounded-2xl border-2 border-secondary-500 p-5 text-foreground">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-2xl font-bold">{t("Lobby")}</h2>
          <Link
            href={`/docs/${defaultLanguage}/guide`}
            target="_blank"
            id="lobbyGuideLink"
            className="rounded-lg border-2 border-secondary-700 bg-secondary-300 px-3 py-1 text-sm font-semibold text-foreground hover:bg-secondary-500"
          >
            {t("How to play")}
          </Link>
        </div>
        <p className="mb-4 text-secondary-900">{t("Share the join code. When everyone is in, press Start Round 1.")}</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {game.teams.map((team, teamIndex) => {
            const colors = teamColors(teamIndex);
            const roster = players.filter((p) => p.team === teamIndex);
            return (
              <div key={`lobby-team-${teamIndex}`} className={`rounded-xl border-2 ${colors.border} overflow-hidden`}>
                <div className={`flex items-center justify-between px-4 py-2 ${colors.solid}`}>
                  <span className="truncate font-bold" id={`lobbyTeam${teamIndex}Name`}>
                    {team.name}
                  </span>
                  <span className="rounded-full bg-black/20 px-2 py-0.5 text-sm font-semibold">{roster.length}</span>
                </div>
                <ul className="min-h-16 divide-y divide-secondary-300 p-2">
                  {roster.length === 0 ? (
                    <li className="px-2 py-3 text-center text-sm italic text-secondary-700">{t("No players yet")}</li>
                  ) : (
                    roster.map((p, i) => (
                      <li key={`lobby-team-${teamIndex}-p-${i}`} className="px-2 py-1 text-sm">
                        {p.name}
                      </li>
                    ))
                  )}
                </ul>
              </div>
            );
          })}
        </div>
        {unassigned.length > 0 && (
          <p className="mt-3 text-sm text-secondary-900">
            {t("{{count}} player(s) still choosing a team.", { count: unassigned.length })}
          </p>
        )}
      </div>
    </div>
  );
}
