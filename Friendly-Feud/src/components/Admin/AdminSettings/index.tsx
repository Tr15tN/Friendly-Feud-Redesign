import { Button } from "@/components/ui/Button";
import { Section } from "@/components/ui/form";
import { Game, WSEvent } from "@/src/types/game";
import { Check, Copy } from "lucide-react";
import { Dispatch, SetStateAction, useState } from "react";
import { useTranslation } from "react-i18next";
import BuzzerSoundSettings from "./BuzzerSoundSettings";
import FinalRoundTitleChanger from "./FinalRoundTitleChanger";
import FinalRoundWinThreshold from "./FinalRoundWinThreshold";
import SettingsCheckbox from "./SettingsCheckbox";

interface AdminSettingsProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
  hostPassword: string;
}

/** Buzzer sounds, title-screen options, Fast Money options and the room's host password. */
export default function AdminSettings({ game, setGame, send, hostPassword }: AdminSettingsProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  return (
    <>
      <Section title={t("Buzzers & title screen")}>
        <BuzzerSoundSettings game={game} setGame={setGame} send={send} />
        <SettingsCheckbox
          game={game}
          setGame={setGame}
          send={send}
          label="Hide Join Info"
          tooltip="Hide the room code and team info on the title screen"
          settingKey="hide_join_info"
        />
      </Section>
      <Section title={t("Fast Money")}>
        <div className="grid gap-4 sm:grid-cols-2">
          <FinalRoundTitleChanger game={game} setGame={setGame} send={send} />
          <FinalRoundWinThreshold game={game} setGame={setGame} send={send} />
        </div>
      </Section>
      <Section title={t("Host password")} description={t("Used when setting up buzzers on an external admin device.")}>
        <div className="flex flex-wrap items-center gap-3">
          <p
            id="hostPassword"
            className="min-w-0 break-all rounded-[10px] border border-pro-line bg-pro-raised px-3 py-2 font-mono text-sm"
          >
            {hostPassword}
          </p>
          <Button
            id="copyHostPassword"
            variant="secondary"
            onClick={() => {
              navigator.clipboard
                ?.writeText(hostPassword)
                .then(() => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                })
                .catch(() => undefined);
            }}
          >
            {copied ? <Check size={16} aria-hidden /> : <Copy size={16} aria-hidden />}
            {copied ? t("Copied") : t("Copy")}
          </Button>
        </div>
      </Section>
    </>
  );
}
