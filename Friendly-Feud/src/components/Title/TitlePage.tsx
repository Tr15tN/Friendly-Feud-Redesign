import Signature from "@/components/Signature";
import RoomCode from "@/components/Title/RoomCode";
import Team from "@/components/Title/Team";
import TitleLogo from "@/components/TitleLogo";
import { Game } from "@/types/game";
import Image from "next/image";

interface TitlePageProps {
  game: Game;
}

/** The default logo artwork is this wide for every unit of height; a custom logo is shown in a 16:9 frame. */
const DEFAULT_LOGO_ASPECT = 2.028;
const CUSTOM_LOGO_ASPECT = 16 / 9;

export default function TitlePage({ game }: TitlePageProps) {
  function returnTeamMates(team: number) {
    const players: string[] = [];
    console.debug(game);
    Object.keys(game.registeredPlayers).forEach((k) => {
      console.debug(k);
      if (game.registeredPlayers[k].team === team) {
        players.push(game.registeredPlayers[k].name);
      }
    });
    console.debug(players);
    return players;
  }

  const showBoxes = !game.settings.hide_join_info;
  const logoAspect = game.settings.logo_url ? CUSTOM_LOGO_ASPECT : DEFAULT_LOGO_ASPECT;
  // The logo is as wide as the screen allows, but never so tall that the team boxes are pushed off the bottom.
  const boxesHeight = showBoxes ? "clamp(150px, 22vh, 250px)" : "0px";
  const logoWidth = `min(90vw, calc((100vh - ${boxesHeight} - 8rem) * ${logoAspect}))`;

  return (
    <div
      id="titlePage"
      className="relative flex h-screen w-screen flex-col items-center justify-center gap-4 overflow-hidden bg-gradient-to-t from-primary-900 via-primary-200 to-primary-900 pt-5 pb-[4.5rem]"
    >
      {/* Logo Section */}
      <div id="titleLogoBox" style={{ width: logoWidth, transition: "width 2s" }} className="flex justify-center">
        {game.settings.logo_url ? (
          <div className="relative w-full aspect-[16/9]">
            <Image
              fill
              style={{ objectFit: "contain" }}
              src={`${game.settings.logo_url}?v=${Date.now()}`}
              alt="Game logo"
              priority
              unoptimized
            />
          </div>
        ) : (
          <TitleLogo insert={game.title_text} className="w-full" />
        )}
      </div>

      {showBoxes && (
        <div
          id="titleBoxes"
          className="grid grid-cols-3 gap-4"
          style={{ width: "min(90vw, 1800px)", height: boxesHeight, transition: "width 2s" }}
        >
          <Team team={game.teams[0].name} players={returnTeamMates(0)} />
          <RoomCode code={game.room} locked={game.settings.lock_joining} />
          <Team team={game.teams[1].name} players={returnTeamMates(1)} />
        </div>
      )}
      <Signature variant="tv" />
    </div>
  );
}
