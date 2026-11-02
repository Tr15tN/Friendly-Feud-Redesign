import { normalizeLanguage } from "@/i18n/languages";
import { Game } from "@/src/types/game";
import Link from "next/link";
import { useTranslation } from "react-i18next";

interface LobbyProps {
  game: Game;
  room: string;
}

const TEAM_STYLES = [
  { dot: "bg-pro-team0", text: "text-pro-team0", border: "border-pro-team0/50" },
  { dot: "bg-pro-team1", text: "text-pro-team1", border: "border-pro-team1/50" },
];

/**
 * The host's pre-game view: a big join code / URL and the roster of who has
 * joined each team, so a first-time host knows exactly what to do before they
 * press "Start Round 1".
 */
export default function Lobby({ game, room }: LobbyProps) {
  const { t, i18n } = useTranslation();
  const joinUrl = process.env.NEXT_PUBLIC_TITLE_URL;

  const players = Object.values(game.registeredPlayers ?? {});
  const unassigned = players.filter((p) => p.team == null);
  const totalJoined = players.length;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
      {/* Join info */}
      <div
      id="lobbyJoinInfo"
      className="flex min-w-0 flex-col items-center justify-center gap-3 rounded-[14px] border border-pro-accent bg-pro-panel p-6 text-center text-pro-text">
        <p className="text-xs font-semibold uppercase tracking-widest text-pro-mute">{t("Join code")}</p>
        <p className="break-all text-5xl font-extrabold uppercase tracking-widest sm:text-6xl">{room}</p>
        {joinUrl ? (
          <p className="break-all text-base">
            {t("Join at")} <span className="font-bold">{joinUrl}</span>
          </p>
        ) : (
          <p className="text-sm text-pro-mute">{t("Players open the site and enter this code to join.")}</p>
        )}
        <p className="mt-1 rounded-full bg-pro-raised px-4 py-1 text-sm font-semibold">
          {t("{{count}} joined", { count: totalJoined })}
        </p>
      </div>

      {/* Roster + guidance */}
      <div
        id="lobbyRoster"
        className="min-w-0 rounded-[14px] border border-pro-line bg-pro-panel p-4 text-pro-text sm:p-5"
      >
        <div className="mb-1 flex items-center justify-between gap-3">
          <h2 className="text-xl font-bold">{t("Lobby")}</h2>
          <Link
            href={`/docs/${normalizeLanguage(i18n.resolvedLanguage ?? i18n.language)}/quickstart`}
            target="_blank"
            id="lobbyGuideLink"
            className="rounded-[10px] border border-pro-line bg-pro-raised px-3 py-1.5 text-sm font-semibold hover:border-pro-accent"
          >
            {t("How to play")}
          </Link>
        </div>
        <p className="mb-4 text-sm text-pro-mute">
          {t("Share the join code. When everyone is in, press Start Round 1.")}
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {game.teams.map((team, teamIndex) => {
            const style = TEAM_STYLES[teamIndex] ?? TEAM_STYLES[0];
            const roster = players.filter((p) => p.team === teamIndex);
            return (
              <div
                key={`lobby-team-${teamIndex}`}
                className={`min-w-0 overflow-hidden rounded-[12px] border ${style.border} bg-pro-bg/40`}
              >
                <div className="flex items-center justify-between gap-2 border-b border-pro-line px-4 py-2.5">
                  <span className={`flex min-w-0 items-center gap-2 font-bold ${style.text}`}>
                    <span className={`size-2.5 shrink-0 rounded-full ${style.dot}`} aria-hidden />
                    <span className="truncate" id={`lobbyTeam${teamIndex}Name`}>
                      {team.name}
                    </span>
                  </span>
                  <span className="rounded-full bg-pro-raised px-2 py-0.5 text-sm font-semibold">{roster.length}</span>
                </div>
                <ul className="min-h-16 divide-y divide-pro-line p-2">
                  {roster.length === 0 ? (
                    <li className="px-2 py-3 text-center text-sm italic text-pro-mute">{t("No players yet")}</li>
                  ) : (
                    roster.map((p, i) => (
                      <li key={`lobby-team-${teamIndex}-p-${i}`} className="break-words px-2 py-1.5 text-sm">
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
          <p className="mt-3 text-sm text-pro-mute">
            {t("{{count}} player(s) still choosing a team.", { count: unassigned.length })}
          </p>
        )}
      </div>
    </div>
  );
}
