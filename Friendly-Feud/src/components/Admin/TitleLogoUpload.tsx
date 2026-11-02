import { Buffer } from "buffer";
import { buttonClass } from "@/components/ui/button-class";
import { ERROR_CODES } from "@/i18n/errorCodes";
import { Game, WSEvent } from "@/src/types/game";
import { FileUp, X } from "lucide-react";
import Image from "next/image";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface BeforeUploadProps {
  send: (data: WSEvent) => void;
  room: string;
  setGame: Dispatch<SetStateAction<Game | null>>;
  game: Game;
  setImageUploaded: Dispatch<SetStateAction<File | null>>;
}

function BeforeUpload({ send, room, setGame, game, setImageUploaded }: BeforeUploadProps) {
  const { t } = useTranslation();
  return (
    <div>
      <div className="image-upload">
        <label
          htmlFor="logoUpload"
          className={buttonClass("secondary", "w-full cursor-pointer justify-start gap-3 py-2")}
        >
          <FileUp size={20} aria-hidden />
          <span className="text-left">
            <span className="block">{t("logo upload")}</span>
            <span className="block text-xs font-normal text-pro-mute">{t("(must be smaller than 2MB)")}</span>
          </span>
        </label>
        <input
          className="hidden"
          type="file"
          accept="image/png, image/jpeg, image/gif"
          id="logoUpload"
          onChange={() => {
            const logoUpload = document.getElementById("logoUpload") as HTMLInputElement;
            const file = logoUpload.files?.[0];
            if (file) {
              const maxSizeMB = Number(process.env.NEXT_PUBLIC_MAX_IMAGE_UPLOAD_SIZE_MB) || 2;
              if (file.size > maxSizeMB * 1024 * 1024) {
                console.error("Logo image is too large");
                toast.error(t(ERROR_CODES.IMAGE_TOO_LARGE, { message: "2MB" }));
                return;
              }
              const reader = new FileReader();
              let rawData = new ArrayBuffer(0);
              reader.onload = function (evt) {
                if (!evt.target || !evt.target.result) return;

                rawData = evt.target.result as ArrayBuffer;
                const headerarr = new Uint8Array(rawData).subarray(0, 4);
                let header = "";
                for (let i = 0; i < headerarr.length; i++) {
                  header += headerarr[i].toString(16);
                }
                let mimetype = "";
                switch (header) {
                  case "89504e47":
                    mimetype = "png";
                    break;
                  case "47494638":
                    mimetype = "gif";
                    break;
                  case "ffd8ffe0":
                  case "ffd8ffe1":
                  case "ffd8ffe2":
                  case "ffd8ffe3":
                  case "ffd8ffe8":
                    mimetype = "jpeg";
                    break;
                  default:
                    toast.error(t(ERROR_CODES.UNKNOWN_FILE_TYPE));
                    return;
                }

                const bufferData = Buffer.from(rawData).toString("base64");
                send({
                  action: "logo_upload",
                  logoData: bufferData,
                  mimetype: mimetype,
                });
                setImageUploaded(file);
                game.settings.logo_url = `/api/rooms/${room}/logo`;
                // @ts-expect-error: need a better way to update these values
                setGame((prv) => ({ ...prv }));
                send({ action: "data", data: game });
              };
              reader.readAsArrayBuffer(file);
            }
            if (logoUpload) logoUpload.value = "";
          }}
        />
      </div>
    </div>
  );
}

interface AfterUploadProps {
  send: (data: WSEvent) => void;
  room: string;
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  setImageUploaded: Dispatch<SetStateAction<File | null>>;
  imageUploaded: File;
}

function AfterUpload({ send, room, game, setGame, setImageUploaded, imageUploaded }: AfterUploadProps) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-row items-center gap-3">
      <Image
        width={150}
        height={150}
        style={{ objectFit: "contain" }}
        src={URL.createObjectURL(imageUploaded)}
        alt="Game Logo"
      />
      <button
        className={buttonClass("danger", "px-2")}
        aria-label={t("Remove logo")}
        id="deleteLogoButton"
        onClick={() => {
          send({
            action: "del_logo_upload",
            room: room,
          });
          URL.revokeObjectURL(URL.createObjectURL(imageUploaded));
          setImageUploaded(null);
          game.settings.logo_url = null;
          // @ts-expect-error: need a better way to update these values
          setGame((prv) => ({ ...prv }));
          send({ action: "data", data: game });
        }}
      >
        <X size={18} aria-hidden />
      </button>
    </div>
  );
}

interface TitleLogoUploadProps {
  send: (data: WSEvent) => void;
  room: string;
  setGame: Dispatch<SetStateAction<Game | null>>;
  game: Game;
  setImageUploaded: Dispatch<SetStateAction<File | null>>;
  imageUploaded: File | null;
}

export default function TitleLogoUpload({
  send,
  room,
  setGame,
  game,
  setImageUploaded,
  imageUploaded,
}: TitleLogoUploadProps) {
  return imageUploaded === null ? (
    <BeforeUpload send={send} room={room} game={game} setGame={setGame} setImageUploaded={setImageUploaded} />
  ) : (
    <AfterUpload
      send={send}
      room={room}
      game={game}
      setGame={setGame}
      setImageUploaded={setImageUploaded}
      imageUploaded={imageUploaded}
    />
  );
}
