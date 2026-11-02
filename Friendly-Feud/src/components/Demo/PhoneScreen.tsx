import BuzzerPage from "@/components/BuzzerPage";
import { DemoContext } from "@/components/Demo/DemoContext";
import Footer from "@/components/Login/Footer";
import LoginPage from "@/components/LoginPage";
import { DemoClient } from "@/lib/demo/server";
import { getDemoServer } from "@/lib/demo/bridge";
import { Game, WSEvent } from "@/types/game";
import { MutableRefObject, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const NO_API = { onOpenGameWindow: () => {}, exit: () => {} };

/**
 * A player's phone inside the demo: the real join form, then the real team picker and buzzer page.
 * It talks to the in-browser demo server, so nothing leaves the page.
 */
export default function PhoneScreen() {
  const { t, i18n } = useTranslation();
  const [roomCode, setRoomCode] = useState("");
  const [playerName, setPlayerName] = useState("");
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [team, setTeam] = useState<number | null>(null);
  const [game, setGame] = useState<Game | null>(null);
  const clientRef = useRef<DemoClient | null>(null);

  useEffect(() => {
    const server = getDemoServer();
    if (!server) return;
    setGame(server.snapshot());
    // When the demo steps back, this phone comes back already joined as the same player.
    const resumeId = new URLSearchParams(window.location.search).get("player");
    const resumed = resumeId ? server.game.registeredPlayers[resumeId] : undefined;
    if (resumeId && resumed) {
      attach(server.connect(resumeId));
      setTeam(resumed.team);
      setPlayerId(resumeId);
    }
    return () => clientRef.current?.close();
  }, []);

  function attach(client: DemoClient) {
    clientRef.current = client;
    client.addEventListener("message", (evt) => {
      const json: WSEvent = JSON.parse(evt.data);
      if (json.action === "data") setGame(json.data as Game);
    });
  }

  // The language follows the host's choice, as it does on a real phone.
  useEffect(() => {
    const server = getDemoServer();
    if (!server) return;
    const watcher = server.connect("demo-phone-watch");
    const onMessage = (evt: { data: string }) => {
      const json: WSEvent = JSON.parse(evt.data);
      if (json.action === "change_lang") i18n.changeLanguage(json.data as string);
    };
    watcher.addEventListener("message", onMessage);
    return () => watcher.close();
  }, []);

  const theme = game?.settings?.theme ?? "default";
  useEffect(() => {
    document.body.className = `${theme} bg-background`;
  }, [theme]);

  function joinRoom() {
    const server = getDemoServer();
    const codeInput = document.getElementById("roomCodeInput") as HTMLInputElement | null;
    const nameInput = document.getElementById("playerNameInput") as HTMLInputElement | null;
    if (!server || !codeInput || !nameInput) return;
    if (codeInput.value.toUpperCase() !== server.game.room) {
      toast.error(t("errors.room_not_found"));
      return;
    }
    if (nameInput.value.length === 0) return;
    const id = server.addPlayer(nameInput.value, null);
    attach(server.connect(id));
    setGame(server.snapshot());
    setPlayerId(id);
  }

  if (!getDemoServer()) {
    return <p className="p-6 text-foreground">{t("loading")}</p>;
  }

  return (
    <DemoContext.Provider value={NO_API}>
      <div className={`${theme} min-h-screen w-full`}>
        {playerId && game && clientRef.current ? (
          <div className="flex w-full justify-center">
            <div className="flex w-11/12 flex-col space-y-3 pt-5">
              <BuzzerPage
                ws={clientRef as unknown as MutableRefObject<WebSocket>}
                game={game}
                id={playerId}
                setGame={(next) => next && setGame(next)}
                room={game.room}
                setTeam={setTeam}
                team={team}
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-screen w-full flex-col bg-pro-bg">
            <LoginPage
              setRoomCode={setRoomCode}
              roomCode={roomCode}
              setPlayerName={setPlayerName}
              playerName={playerName}
              joinRoom={joinRoom}
              hostRoom={() => {}}
            />
            <Footer />
          </div>
        )}
      </div>
    </DemoContext.Provider>
  );
}
