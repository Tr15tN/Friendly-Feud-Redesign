import { buttonClass } from "@/components/ui/button-class";
import { Field, inputClass } from "@/components/ui/form";
import { ERROR_CODES } from "@/i18n/errorCodes";
import { normalizeLanguage } from "@/i18n/languages";
import { groupGames } from "@/lib/host/games";
import { handleCsvFile, handleJsonFile, isValidFileType } from "@/lib/utils";
import { WSEvent } from "@/src/types";
import { FileUp } from "lucide-react";
import { Dispatch, SetStateAction, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

interface GameLoaderProps {
  gameSelector: string[];
  send: (data: WSEvent) => void;
  setCsvFileUpload: Dispatch<SetStateAction<File | null>>;
  setCsvFileUploadText: Dispatch<SetStateAction<string>>;
}

const GameLoader = ({ gameSelector, send, setCsvFileUpload, setCsvFileUploadText }: GameLoaderProps) => {
  const [selectedGame, setSelectedGame] = useState("");
  const MAX_SIZE_MB = process.env.NEXT_PUBLIC_MAX_CSV_UPLOAD_SIZE_MB
    ? parseInt(process.env.NEXT_PUBLIC_MAX_CSV_UPLOAD_SIZE_MB, 10) // type safety
    : 2; // default to 2MB
  const { i18n, t } = useTranslation();
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function handleGameUpload() {
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      console.error("file object in handleGameUpload is undefined");
      return;
    }
    if (file) {
      if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        console.error("This csv file is too large");
        toast.error(t(ERROR_CODES.CSV_TOO_LARGE));
        return;
      }
    }

    const allowedTypes = {
      json: {
        pattern: /^application\/(json|.*\+json)$/,
        handler: (file: File) =>
          handleJsonFile(file, {
            t,
            send,
          }),
      },
      csv: {
        pattern: /^(text\/csv|application\/(vnd\.ms-excel|csv|x-csv|text-csv))$/,
        handler: (file: File) =>
          handleCsvFile(file, {
            t,
            setCsvFileUpload,
            setCsvFileUploadText,
          }),
      },
    };

    const fileType = isValidFileType(file, allowedTypes);
    if (!fileType || !file) {
      toast.error(t(ERROR_CODES.UNKNOWN_FILE_TYPE));
      return;
    }

    const fileExtension = file.name.toLowerCase().split(".").pop();
    allowedTypes[fileExtension as keyof typeof allowedTypes].handler(file);

    console.debug(file);

    // allow same file to be selected again
    fileInputRef.current!.value = "";
  }
  const groups = groupGames(gameSelector);
  const groupTitle = { classic: t("Classic games"), themed: t("Themed games"), other: t("More games") };
  return (
    <div className="space-y-4">
      {gameSelector.length > 0 && (
        <Field
          label={t("Built-in question sets")}
          htmlFor="gameSelector"
          hint={t("Sets follow the language you picked below.")}
        >
          <select
            id="gameSelector"
            value={selectedGame}
            className={inputClass}
            onChange={(e) => {
              setSelectedGame(e.target.value);
              send({
                action: "load_game",
                file: e.target.value,
                lang: normalizeLanguage(i18n.resolvedLanguage ?? i18n.language),
              });
            }}
          >
            <option disabled value="">
              {t("Select question set")}
            </option>
            {groups.map((group) => (
              <optgroup key={group.kind} label={groupTitle[group.kind]}>
                {group.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </Field>
      )}
      <div id="gamePickerFileUploadButton">
        <label
          htmlFor="gamePickerFileUpload"
          className={buttonClass("secondary", "w-full cursor-pointer justify-start gap-3 py-2")}
        >
          <FileUp size={20} aria-hidden />
          <span className="text-left">
            <span className="block">{t("upload game")}</span>
            <span className="block text-xs font-normal text-pro-mute">
              .json, .csv · {t("Expected format")}: {t("Question")}, {t("Answer")}, {t("Points")}, {t("Answer")},{" "}
              {t("Points")} ...
            </span>
          </span>
        </label>
        {/* CSV Upload */}
        <input
          className="hidden"
          type="file"
          accept=".json, .csv"
          id="gamePickerFileUpload"
          ref={fileInputRef}
          onChange={handleGameUpload}
        />
      </div>
    </div>
  );
};

export default GameLoader;
