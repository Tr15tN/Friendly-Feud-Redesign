import AdminSettings from "@/components/Admin/AdminSettings";
import RoomSettings from "@/components/Admin/RoomSettings";
import TitlesAndLogoSettings from "@/components/Admin/TitlesAndLogoSettings";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction } from "react";

interface SettingsPanelProps {
  game: Game;
  room: string;
  gameSelector: string[];
  hostPassword: string;
  send: (data: WSEvent) => void;
  setGame: Dispatch<SetStateAction<Game | null>>;
  setCsvFileUpload: Dispatch<SetStateAction<File | null>>;
  setCsvFileUploadText: Dispatch<SetStateAction<string>>;
  imageUploaded: File | null;
  setImageUploaded: Dispatch<SetStateAction<File | null>>;
}

/**
 * All setup controls as a stack of cards. Shown inline in the lobby (and when no game is loaded) and inside
 * the Settings drawer during play.
 */
export default function SettingsPanel({
  game,
  room,
  gameSelector,
  hostPassword,
  send,
  setGame,
  setCsvFileUpload,
  setCsvFileUploadText,
  imageUploaded,
  setImageUploaded,
}: SettingsPanelProps) {
  return (
    <div className="space-y-4 text-pro-text">
      <RoomSettings
        game={game}
        gameSelector={gameSelector}
        send={send}
        setGame={setGame}
        setCsvFileUpload={setCsvFileUpload}
        setCsvFileUploadText={setCsvFileUploadText}
        needsGame={game.rounds == null}
      />
      <TitlesAndLogoSettings
        game={game}
        send={send}
        room={room}
        setGame={setGame}
        setImageUploaded={setImageUploaded}
        imageUploaded={imageUploaded}
      />
      <AdminSettings game={game} setGame={setGame} send={send} hostPassword={hostPassword} />
    </div>
  );
}
