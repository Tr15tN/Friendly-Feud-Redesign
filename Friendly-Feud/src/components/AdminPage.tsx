import AdminSettings from "@/components/Admin/AdminSettings";
import CSVLoader from "@/components/Admin/CSVLoader";
import GameDisplay from "@/components/Admin/GameDisplay";
import RoomSettings from "@/components/Admin/RoomSettings";
import TitlesAndLogoSettings from "@/components/Admin/TitlesAndLogoSettings";
import { ERROR_CODES } from "@/i18n/errorCodes";
import { normalizeLanguage } from "@/i18n/languages";
import { Game, WSAction, WSEvent } from "@/types/game";
import { useContext, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { GameContext } from "../pages";

interface AdminPageProps {
  ws: React.RefObject<WebSocket>;
  game: Game;
  setGame: React.Dispatch<React.SetStateAction<Game | null>>;
  room: string;
  quitGame: () => void;
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
  // Open on the title screen (setup), collapsed while a round is being played.
  const inRound = game.rounds != null && !game.title;
  const [settingsOpen, setSettingsOpen] = useState(!inRound);
  useEffect(() => {
    setSettingsOpen(!inRound);
  }, [inRound]);
  const refreshCounterRef = useRef(0);

  function send(data: WSEvent) {
    console.debug("Sending", data);
    ws.current.send(JSON.stringify({ ...data, room, id: playerId, hostPassword: hostPassword }));
  }

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

  return (
    <div
      className="lg:min-w-0"
      style={{
        minWidth: "100vh",
      }}
    >
      <RoomSettings
        room={room}
        game={game}
        gameSelector={gameSelector}
        send={send}
        setGame={setGame}
        setCsvFileUpload={setCsvFileUpload}
        setCsvFileUploadText={setCsvFileUploadText}
        quitGame={quitGame}
        variant={inRound ? "header" : "full"}
      />
      {/* Settings collapse during play so the scoring console stays above the fold. */}
      <details
        id="roomSettingsDetails"
        className="mx-5 my-2 rounded-xl border-2 border-secondary-500 text-foreground"
        open={settingsOpen}
        onToggle={(e) => setSettingsOpen((e.target as HTMLDetailsElement).open)}
      >
        <summary className="cursor-pointer select-none px-5 py-2 text-lg font-semibold">
          {t("Titles, teams & settings")}
        </summary>
        <div className="pb-8">
          {inRound && (
            <>
              <RoomSettings
                room={room}
                game={game}
                gameSelector={gameSelector}
                send={send}
                setGame={setGame}
                setCsvFileUpload={setCsvFileUpload}
                setCsvFileUploadText={setCsvFileUploadText}
                quitGame={quitGame}
                variant="setup"
              />
              <hr className="my-8" />
            </>
          )}
          <TitlesAndLogoSettings
            game={game}
            send={send}
            room={room}
            setGame={setGame}
            setImageUploaded={setImageUploaded}
            imageUploaded={imageUploaded}
          />
          <hr className="my-8" />
          <AdminSettings game={game} setGame={setGame} send={send} hostPassword={hostPassword} />
        </div>
      </details>
      <GameDisplay
        ws={ws}
        setGame={setGame}
        game={game}
        room={room}
        send={send}
        timerStarted={timerStarted}
        timerCompleted={timerCompleted}
        setTimerStarted={setTimerStarted}
        setTimerCompleted={setTimerCompleted}
        titleMusicPlaying={titleMusicPlaying}
        setTitleMusicPlaying={setTitleMusicPlaying}
      />
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
