import { ToggleRow } from "@/components/ui/form";
import { Game, Settings, WSAction, WSEvent } from "@/src/types/game";
import { Dispatch, SetStateAction, useId } from "react";
import { useTranslation } from "react-i18next";

interface SettingsCheckboxProps {
  game: Game;
  setGame: Dispatch<SetStateAction<Game | null>>;
  send: (data: WSEvent) => void;
  label: string;
  tooltip: string;
  settingKey: { [K in keyof Settings]-?: Settings[K] extends boolean ? K : never }[keyof Settings];
  disabled?: boolean;
}

export default function SettingsCheckbox({
  game,
  setGame,
  send,
  label,
  tooltip,
  settingKey,
  disabled,
}: SettingsCheckboxProps) {
  const { t } = useTranslation();
  const id = useId();

  const handleChange = (checked: boolean) => {
    const updatedGame = {
      ...game,
      settings: { ...game.settings, [settingKey]: checked },
    };
    send({ action: WSAction.DATA, data: updatedGame });
    setGame(updatedGame);
  };

  return (
    <ToggleRow
      id={id}
      label={t(label)}
      hint={t(tooltip)}
      checked={game.settings[settingKey] as boolean}
      disabled={disabled}
      onChange={(checked) => handleChange(checked)}
    />
  );
}
