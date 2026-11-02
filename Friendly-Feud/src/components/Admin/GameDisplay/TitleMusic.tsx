import { Buffer } from "buffer";
import { buttonClass } from "@/components/ui/button-class";
import { ERROR_CODES } from "@/i18n/errorCodes";
import { Game, WSAction, WSEvent } from "@/types/game";
import { Pause, Play, Upload } from "lucide-react";
import { Dispatch, SetStateAction, useRef } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface TitleMusicProps {
  send: (data: WSEvent) => void;
  room: string;
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  isPlaying: boolean;
  setIsPlaying: (isPlaying: boolean) => void;
}

function isMp3File(file: File, rawData: ArrayBuffer) {
  if (file.type && file.type !== "audio/mpeg") {
    return false;
  }

  const bytes = new Uint8Array(rawData);
  const hasId3Header = bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
  const hasMp3FrameHeader = bytes[0] === 0xff && (bytes[1] & 0xe0) === 0xe0;

  return hasId3Header || hasMp3FrameHeader;
}

export default function TitleMusic({ send, room, game, setGame, isPlaying, setIsPlaying }: TitleMusicProps) {
  const { t } = useTranslation();
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="flex flex-wrap items-center gap-2">
      <h3 className="mr-2 text-sm font-semibold text-pro-mute">{t("Title Music")}</h3>
      <button
        id="playTitleMusicButton"
        aria-pressed={isPlaying}
        className={buttonClass(isPlaying ? "primary" : "secondary")}
        onClick={() => {
          setIsPlaying(true);
          send({ action: WSAction.PLAY_TITLE_MUSIC });
        }}
      >
        <Play size={16} aria-hidden />
        {t("Play")}
      </button>
      <button
        id="pauseTitleMusicButton"
        aria-pressed={!isPlaying}
        className={buttonClass("secondary")}
        onClick={() => {
          setIsPlaying(false);
          send({ action: WSAction.PAUSE_TITLE_MUSIC });
        }}
      >
        <Pause size={16} aria-hidden />
        {t("Pause")}
      </button>
      <button
        id="uploadTitleMusicButton"
        className={buttonClass("ghost")}
        onClick={() => uploadInputRef.current?.click()}
      >
        <Upload size={16} aria-hidden />
        {t("Upload Music")}
      </button>
      <input
        ref={uploadInputRef}
        className="hidden"
        type="file"
        accept=".mp3,audio/mpeg"
        id="titleMusicUpload"
        onChange={() => {
          const file = uploadInputRef.current?.files?.[0];
          if (file) {
            const maxSizeMB = Number(process.env.NEXT_PUBLIC_MAX_AUDIO_UPLOAD_SIZE_MB) || 2;
            if (file.size > maxSizeMB * 1024 * 1024) {
              toast.error(t("Audio too large, the limit is {{message}}", { message: "2MB" }));
              return;
            }

            const reader = new FileReader();
            reader.onload = function (evt) {
              if (!evt.target || !evt.target.result) return;

              const rawData = evt.target.result as ArrayBuffer;
              if (!isMp3File(file, rawData)) {
                toast.error(t(ERROR_CODES.UNKNOWN_FILE_TYPE));
                return;
              }

              const bufferData = Buffer.from(rawData).toString("base64");
              send({
                action: WSAction.TITLE_MUSIC_UPLOAD,
                audioData: bufferData,
                mimetype: "mp3",
              });
              const updatedGame = {
                ...game,
                settings: {
                  ...game.settings,
                  title_music_url: `/api/rooms/${room}/title-music`,
                },
              };
              setGame(updatedGame);
              send({ action: WSAction.DATA, data: updatedGame });
            };
            reader.readAsArrayBuffer(file);
          }
          if (uploadInputRef.current) uploadInputRef.current.value = "";
        }}
      />
    </div>
  );
}
