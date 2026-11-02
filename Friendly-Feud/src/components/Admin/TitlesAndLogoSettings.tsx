import TitleLogoUpload from "@/components/Admin/TitleLogoUpload";
import { Field, inputClass, Section } from "@/components/ui/form";
import { debounce } from "@/lib/utils";
import { Game, WSEvent } from "@/types/game";
import { Dispatch, SetStateAction } from "react";
import { useTranslation } from "react-i18next";

interface TitlesAndLogoSettingsProps {
  game: Game;
  send: (data: WSEvent) => void;
  room: string;
  setGame: Dispatch<SetStateAction<Game | null>>;
  setImageUploaded: Dispatch<SetStateAction<File | null>>;
  imageUploaded: File | null;
}

const TEAM_IDS = [
  { name: "teamOneNameInput", points: "teamOnePointsInput", dot: "bg-pro-team0", text: "text-pro-team0" },
  { name: "teamTwoNameInput", points: "teamTwoPointsInput", dot: "bg-pro-team1", text: "text-pro-team1" },
];

/** Title screen text, logo and the two teams (names and starting points). */
export default function TitlesAndLogoSettings({
  game,
  send,
  room,
  setGame,
  setImageUploaded,
  imageUploaded,
}: TitlesAndLogoSettingsProps) {
  const { t } = useTranslation();

  function commit(update: (prev: Game) => Game) {
    setGame((prevGame) => {
      if (prevGame === null) return prevGame;
      const updatedGame = update(prevGame);
      send({ action: "data", data: updatedGame });
      return updatedGame;
    });
  }

  function patchTeam(index: number, patch: Partial<Game["teams"][number]>) {
    commit((prev) => ({
      ...prev,
      teams: prev.teams.map((team, i) => (i === index ? { ...team, ...patch } : team)),
    }));
  }

  return (
    <Section title={t("Teams & title")} description={t("Names and logo show on the board and on players' phones.")}>
      <div className="grid gap-4 sm:grid-cols-2">
        {TEAM_IDS.map((ids, index) => (
          <div key={ids.name} className="space-y-3 rounded-[12px] border border-pro-line bg-pro-bg/40 p-3">
            <p className={`flex items-center gap-2 text-xs font-semibold uppercase tracking-widest ${ids.text}`}>
              <span className={`size-2 rounded-full ${ids.dot}`} aria-hidden />
              {t("Team {{number}}", { number: index + 1 })}
            </p>
            <Field label={t("Team Name")} htmlFor={ids.name}>
              <input
                id={ids.name}
                className={inputClass}
                placeholder={t("Team Name")}
                defaultValue={game.teams[index].name}
                onChange={debounce((e: React.ChangeEvent<HTMLInputElement>) =>
                  patchTeam(index, { name: e.target.value })
                )}
              />
            </Field>
            <Field label={t("Starting points")} htmlFor={ids.points}>
              <input
                id={ids.points}
                type="number"
                min="0"
                required
                inputMode="numeric"
                className={`${inputClass} tabular-nums`}
                value={game.teams[index].points}
                onChange={(e) => {
                  const number = parseInt(e.target.value);
                  patchTeam(index, { points: isNaN(number) ? 0 : number });
                }}
              />
            </Field>
          </div>
        ))}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={t("Title Text")} htmlFor="titleTextInput" hint={t("Shown under the logo on the title screen.")}>
          <input
            id="titleTextInput"
            className={inputClass}
            placeholder={t("My Family")}
            defaultValue={game.title_text}
            onChange={debounce((e: React.ChangeEvent<HTMLInputElement>) =>
              commit((prev) => ({ ...prev, title_text: e.target.value }))
            )}
          />
        </Field>
        <div className="space-y-1.5">
          <p className="text-sm font-medium text-pro-text">{t("Logo")}</p>
          <TitleLogoUpload
            send={send}
            room={room}
            setGame={setGame}
            game={game}
            setImageUploaded={setImageUploaded}
            imageUploaded={imageUploaded}
          />
        </div>
      </div>
    </Section>
  );
}
