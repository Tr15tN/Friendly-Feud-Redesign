import GameScreen from "@/components/GameScreen";

/** The host's game window (opened from the console) or a spectator's view of the TV. */
export default function GamePage() {
  return <GameScreen auth={{ kind: "session" }} />;
}
