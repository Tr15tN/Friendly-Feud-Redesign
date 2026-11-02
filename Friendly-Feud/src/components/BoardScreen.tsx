import FinalPage from "@/components/FinalPage";
import QuestionBoard from "@/components/QuestionBoard";
import Round from "@/components/Round";
import ScaleToFit from "@/components/ScaleToFit";
import TeamName from "@/components/TeamName";
import TitlePage from "@/components/Title/TitlePage";
import { Game } from "@/types/game";

interface BoardScreenProps {
  game: Game;
  /** Fast Money countdown, in seconds. */
  timer: number;
}

/** What the TV shows for the current game state: title card, round board or Fast Money. */
export default function BoardScreen({ game, timer }: BoardScreenProps) {
  if (game.title) {
    return <TitlePage game={game} />;
  }
  if (game.is_final_round) {
    return (
      <div className="h-screen w-screen p-[2vw]">
        <ScaleToFit contain className="flex h-full w-full items-center justify-center">
          <FinalPage game={game} timer={timer} />
        </ScaleToFit>
      </div>
    );
  }
  const currentRoundData = game.rounds && game.rounds[game.round];
  if (!currentRoundData) {
    console.error("Invalid round index or missing round data:", game.round, game.rounds);
    return <div>Error: Invalid round data</div>;
  }
  return (
    <div className="h-screen w-screen p-[2vw]">
      <ScaleToFit contain className="flex h-full w-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Round game={game} />
          <div className="grid items-center gap-6" style={{ gridTemplateColumns: "300px auto 300px" }}>
            <TeamName game={game} team={0} />
            <QuestionBoard round={currentRoundData} />
            <TeamName game={game} team={1} />
          </div>
        </div>
      </ScaleToFit>
    </div>
  );
}
