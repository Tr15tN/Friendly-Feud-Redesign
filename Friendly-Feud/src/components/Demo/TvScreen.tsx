import BoardScreen from "@/components/BoardScreen";
import BuzzerPopup from "@/components/BuzzerPopup";
import { DemoContext } from "@/components/Demo/DemoContext";
import StrikeOverlay from "@/components/StrikeOverlay";
import { hasPendingBuzz } from "@/lib/host/console";
import { getDemoServer } from "@/lib/demo/bridge";
import { BuzzedState, Game, WSEvent } from "@/types/game";
import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const NO_API = { onOpenGameWindow: () => {}, exit: () => {} };

/** Who the "first buzzer" banner should name, from the game state. */
function buzzedState(game: Game): BuzzedState {
  const first = game.buzzed[0];
  if (!first) return {};
  const user = game.registeredPlayers[first.id];
  if (user && game.teams[user.team ?? 0]) {
    return { id: first.id, name: user.name, team_name: game.teams[user.team ?? 0].name };
  }
  if (first.team != null && game.teams[first.team]) {
    return { id: "", name: "", team_name: game.teams[first.team].name };
  }
  if (hasPendingBuzz(game)) return { pending: true };
  return {};
}

/**
 * The game window (the TV) shown inside the demo. Same components as /game, fed by the in-browser
 * demo server instead of a WebSocket. It runs in its own frame, so it sees a real 16:9 screen.
 */
export default function TvScreen() {
  const { t, i18n } = useTranslation();
  const [game, setGame] = useState<Game | null>(null);
  const [timer, setTimer] = useState(0);
  const [showMistake, setShowMistake] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mistakeRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const server = getDemoServer();
    if (!server) return;
    const client = server.connect("demo-tv");
    setGame(server.snapshot());

    const onMessage = (evt: { data: string }) => {
      const json: WSEvent = JSON.parse(evt.data);
      if (json.action === "data") {
        setGame(json.data as Game);
      } else if (json.action === "show_mistake" || json.action === "mistake") {
        if (mistakeRef.current) clearTimeout(mistakeRef.current);
        setShowMistake(typeof json.data === "number" ? json.data : 1);
        mistakeRef.current = setTimeout(() => setShowMistake(null), 1000);
      } else if (json.action === "set_timer") {
        setTimer(json.data as number);
      } else if (json.action === "stop_timer") {
        if (timerRef.current) clearInterval(timerRef.current);
      } else if (json.action === "start_timer") {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          setTimer((prev) => {
            if (prev > 1) return prev - 1;
            if (timerRef.current) clearInterval(timerRef.current);
            return 0;
          });
        }, 1000);
      } else if (json.action === "change_lang") {
        i18n.changeLanguage(json.data as string);
      }
    };
    client.addEventListener("message", onMessage);
    return () => {
      client.removeEventListener("message", onMessage);
      client.close();
      if (timerRef.current) clearInterval(timerRef.current);
      if (mistakeRef.current) clearTimeout(mistakeRef.current);
    };
  }, []);

  const theme = game?.settings?.theme ?? "default";
  useEffect(() => {
    document.body.className = `${theme} bg-background game-screen`;
  }, [theme]);

  if (!game || game.teams == null) {
    return <p className="p-6 text-foreground">{t("loading")}</p>;
  }

  return (
    <DemoContext.Provider value={NO_API}>
      <StrikeOverlay count={showMistake} />
      <div className={`${theme} game-screen min-h-screen bg-background`}>
        <BoardScreen game={game} timer={timer} />
      </div>
      <BuzzerPopup buzzed={buzzedState(game)} suppressed={showMistake !== null} />
    </DemoContext.Provider>
  );
}
