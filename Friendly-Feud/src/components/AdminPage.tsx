import BuzzersPlayersPanel from "@/components/Admin/Console/BuzzersPlayersPanel";
import SettingsPanel from "@/components/Admin/Console/SettingsPanel";
import TopBar from "@/components/Admin/Console/TopBar";
import { useFlowActions } from "@/components/Admin/Console/useFlowActions";
import WhoWasFirst from "@/components/Admin/Console/WhoWasFirst";
import CSVLoader from "@/components/Admin/CSVLoader";
import GameDisplay from "@/components/Admin/GameDisplay";
import { useScoring } from "@/components/Admin/GameDisplay/useScoring";
import Drawer from "@/components/ui/Drawer";
import { ERROR_CODES } from "@/i18n/errorCodes";
import { normalizeLanguage } from "@/i18n/languages";
import { Game, WSAction, WSEvent } from "@/types/game";
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { GameContext } from "../pages";

interface AdminPageProps {
  ws: React.RefObject<WebSocket>;
  game: Game;
  setGame: React.Dispatch<React.SetStateAction<Game | null>>;
  room: string;
  quitGame: (host?: boolean) => void;
  playerId: string | null;
  hostPassword: string;
}

export default function AdminPage({ ws, game, setGame, room, quitGame, playerId }: AdminPageProps) {
  const { i18n, t } = useTranslation();

  const { hostPassword } = useContext(GameContext);

  const [gameSelector, setGameSelector] = useState<string[]>([]);
  const [imageUploaded, setImageUploaded] = useState<File | null>(null);
  const [timerStarted, setTimerStarted] = useState(false);
  const [timerCompleted, setTimerCompleted] = useState(false);
  const [titleMusicPlaying, setTitleMusicPlaying] = useState(false);
  const [csvFileUpload, setCsvFileUpload] = useState<File | null>(null);
  const [csvFileUploadText, setCsvFileUploadText] = useState("");
  const [drawer, setDrawer] = useState<"players" | "settings" | null>(null);
  const closeDrawer = useCallback(() => setDrawer(null), []);
  const refreshCounterRef = useRef(0);

  // Setup controls are shown inline in the lobby (and when no game is loaded); during play they live in a drawer.
  const settingsInline = game.rounds == null || game.title;
  useEffect(() => {
    if (settingsInline) setDrawer((current) => (current === "settings" ? null : current));
  }, [settingsInline]);

  function send(data: WSEvent) {
    console.debug("Sending", data);
    ws.current.send(JSON.stringify({ ...data, room, id: playerId, hostPassword: hostPassword }));
  }

  const scoring = useScoring(game, setGame, send);
  const flow = useFlowActions(game, scoring);

  const handleMessage = (evt: MessageEvent) => {
    const received_msg = evt.data;
    const json: WSEvent = JSON.parse(received_msg);
    if (json.action === "data") {
      setGame(json.data);
    } else if (json.action === "change_lang") {
      console.debug("Language Change", json.data);
      if (json.games != null) {
        setGameSelector(json.games);
      } else {
        setGameSelector([]);
      }
    } else if (json.action === "error" && json.code) {
      console.error(json.code);
      toast.error(t(json.code, { message: json.message }));
    } else if (json.action === WSAction.PLAY_TITLE_MUSIC) {
      setTitleMusicPlaying(true);
    } else if (json.action === WSAction.PAUSE_TITLE_MUSIC) {
      setTitleMusicPlaying(false);
    } else if (json.action === WSAction.TITLE_MUSIC_PLAYBACK_ERROR) {
      setTitleMusicPlaying(false);
      toast.error(t(ERROR_CODES.TITLE_MUSIC_PLAYBACK_ERROR));
    } else if (json.action === "timer_complete") {
      setTimerStarted(false);
      setTimerCompleted(true);
    } else {
      console.debug("did not expect admin: ", json);
    }
  };

  useEffect(() => {
    const retryInterval = setInterval(() => {
      if (ws.current.readyState !== 1) {
        refreshCounterRef.current++;
        const remainingSeconds = Math.max(0, 5 - refreshCounterRef.current);
        toast.error(t(ERROR_CODES.CONNECTION_LOST, { message: `${remainingSeconds}` }));
        if (refreshCounterRef.current >= 5) {
          console.debug("admin reload()");
          clearInterval(retryInterval);
          location.reload();
        }
      } else {
        refreshCounterRef.current = 0;
      }
    }, 1000);

    ws.current.addEventListener("message", handleMessage);
    send({ action: "change_lang", data: normalizeLanguage(i18n.resolvedLanguage ?? i18n.language) });
    return () => {
      clearInterval(retryInterval);
      ws.current.removeEventListener("message", handleMessage);
    };
  }, [i18n.language]);

  if (game.teams == null) {
    return (
      <div>
        <p>{t("loading")}</p>
      </div>
    );
  }

  const settingsPanel = (
    <SettingsPanel
      game={game}
      room={room}
      gameSelector={gameSelector}
      hostPassword={hostPassword}
      send={send}
      setGame={setGame}
      setCsvFileUpload={setCsvFileUpload}
      setCsvFileUploadText={setCsvFileUploadText}
      imageUploaded={imageUploaded}
      setImageUploaded={setImageUploaded}
    />
  );

  return (
    // `darkTheme` makes the legacy themed components inside render on the dark palette.
    <div className="darkTheme min-h-screen bg-pro-bg font-pro text-pro-text">
      <TopBar
        game={game}
        room={room}
        flow={flow}
        setGame={setGame}
        send={send}
        quitGame={quitGame}
        settingsInline={settingsInline}
        onOpenPlayers={() => setDrawer("players")}
        onOpenSettings={() => setDrawer("settings")}
      />
      <GameDisplay
        game={game}
        setGame={setGame}
        room={room}
        send={send}
        scoring={scoring}
        flow={flow}
        timerStarted={timerStarted}
        timerCompleted={timerCompleted}
        setTimerStarted={setTimerStarted}
        setTimerCompleted={setTimerCompleted}
        titleMusicPlaying={titleMusicPlaying}
        setTitleMusicPlaying={setTitleMusicPlaying}
        settingsPanel={settingsPanel}
      />
      <Drawer id="playersDrawer" open={drawer === "players"} title={t("Players & buzzers")} onClose={closeDrawer}>
        <BuzzersPlayersPanel game={game} setGame={setGame} ws={ws} room={room} send={send} />
      </Drawer>
      {!settingsInline && (
        <Drawer id="settingsDrawer" open={drawer === "settings"} title={t("Settings")} onClose={closeDrawer}>
          {settingsPanel}
        </Drawer>
      )}
      <WhoWasFirst game={game} send={send} />
      {/* Modal over whole admin page */}
      {csvFileUpload && (
        <CSVLoader
          csvFileUpload={csvFileUpload}
          setCsvFileUpload={setCsvFileUpload}
          csvFileUploadText={csvFileUploadText}
          send={send}
        />
      )}
    </div>
  );
}
